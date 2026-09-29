import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { Effect, Schema } from 'effect'
import { DataSet, DataSetManifest } from 'synthetic-data-core'
import { afterAll, describe, expect, test } from 'vite-plus/test'

import { dataSetFilesOf, readWritten, writeSite } from '../src/site.ts'

/**
 * The emitted data set: the same bytes every time, and a manifest whose every
 * path is a file that was written.
 */

const ROOT = new URL('../', import.meta.url)
const COMMIT = '0000000000000000000000000000000000000000'

const emit = (): Promise<readonly DataSet.File[]> => Effect.runPromise(dataSetFilesOf(ROOT, COMMIT))

const [first, second] = await Promise.all([emit(), emit()])
const directory = pathToFileURL(`${await mkdtemp(join(tmpdir(), 'synthetic-data-'))}/`)
await writeSite(ROOT, directory, first)

afterAll(() => rm(directory, { recursive: true, force: true }))

const bytesOf = (contents: string | Uint8Array): Uint8Array =>
  typeof contents === 'string' ? new TextEncoder().encode(contents) : contents

const manifestFile = first.find((file) => file.path === DataSet.MANIFEST_PATH)
const manifest = Schema.decodeUnknownSync(Schema.parseJson(DataSetManifest.Schema))(
  manifestFile?.contents
)

describe('the emitted data set', () => {
  test('is byte-identical when emitted twice', () => {
    expect(second.map((file) => file.path)).toEqual(first.map((file) => file.path))
    second.forEach((file, index) => {
      expect(bytesOf(file.contents), file.path).toEqual(bytesOf(first[index]?.contents ?? ''))
    })
  })

  test('writes every file its manifest lists, as assembled', async () => {
    const paths = manifest.people.flatMap((person) => [...person.resources, ...person.staticFiles])
    expect(paths.length).toBeGreaterThan(0)
    const assembled = new Map(first.map((file) => [file.path, bytesOf(file.contents)]))
    for (const path of new Set(paths)) {
      expect(await readWritten(directory, path), path).toEqual(assembled.get(path))
    }
    expect(assembled.size).toBe(manifest.totals.resources + manifest.totals.staticFiles + 1)
  })

  test('lists the family, Tyra with her account Patient', () => {
    expect(manifest.people.map((person) => [person.key, person.patientIds.length])).toEqual([
      ['warren', 1],
      ['tyra', 2],
      ['beau', 1],
      ['fern', 1],
    ])
    expect(manifest.generator.wildflowerCommit).toBe(COMMIT)
  })
})
