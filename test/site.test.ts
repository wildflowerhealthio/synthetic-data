import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { Effect, Schema } from 'effect'
import { Snapshot, type SnapshotFile } from 'synthetic-data-core'
import { afterAll, describe, expect, test } from 'vite-plus/test'

import { readWritten, snapshotFilesOf, writeSite } from '../src/site.ts'

/**
 * The emitted data set: the same bytes every time, and a header whose every
 * path is a file that was written.
 */

const ROOT = new URL('../', import.meta.url)
const COMMIT = '0000000000000000000000000000000000000000'

const emit = (): Promise<readonly SnapshotFile.Any[]> =>
  Effect.runPromise(snapshotFilesOf(ROOT, COMMIT))

const [first, second] = await Promise.all([emit(), emit()])
const directory = pathToFileURL(`${await mkdtemp(join(tmpdir(), 'synthetic-data-'))}/`)
await writeSite(ROOT, directory, first)

afterAll(() => rm(directory, { recursive: true, force: true }))

const bytesOf = (file: SnapshotFile.Any | undefined): Uint8Array =>
  file === undefined
    ? new Uint8Array()
    : file._tag === 'Text'
      ? new TextEncoder().encode(file.text)
      : file.bytes

const headerFile = first.find((file) => file.path === Snapshot.Header.PATH)
const header = Schema.decodeUnknownSync(Schema.parseJson(Snapshot.Header.Schema))(
  headerFile?._tag === 'Text' ? headerFile.text : undefined
)

describe('the emitted data set', () => {
  test('is byte-identical when emitted twice', () => {
    expect(second.map((file) => file.path)).toEqual(first.map((file) => file.path))
    second.forEach((file, index) => {
      expect(bytesOf(file), file.path).toEqual(bytesOf(first[index]))
    })
  })

  test('writes every file its header lists, as assembled', async () => {
    const paths = header.people.flatMap((person) => [...person.resources, ...person.staticFiles])
    expect(paths.length).toBeGreaterThan(0)
    const assembled = new Map(first.map((file) => [file.path, bytesOf(file)]))
    for (const path of new Set(paths)) {
      expect(await readWritten(directory, path), path).toEqual(assembled.get(path))
    }
    expect(assembled.size).toBe(header.totals.resources + header.totals.staticFiles + 1)
  })

  test('lists the family, Tyra with her account Patient', () => {
    expect(header.people.map((person) => [person.key, person.patientIds.length])).toEqual([
      ['warren', 1],
      ['tyra', 2],
      ['beau', 1],
      ['fern', 1],
    ])
    expect(header.generator.wildflowerCommit).toBe(COMMIT)
  })
})
