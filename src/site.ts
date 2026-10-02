import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'

import { Effect, Either } from 'effect'
import { Snapshot, type SnapshotFile } from 'synthetic-data-core'

import { AS_OF } from './family/index.ts'
import { generate, GenerateError, snapshotMembersOf } from './generate.ts'
import { readSources } from './sources.ts'

/**
 * The published data set: the family generated and assembled into a snapshot
 * (`Snapshot.assemble`) and its files (`Snapshot.filesOf`), and written into a directory beside the licence
 * notice and a small landing page.
 */

/** The Wildflower commit the submodule is checked out at, which the manifest records. */
const wildflowerCommitOf = (root: URL): string =>
  execFileSync('git', ['-C', new URL('wildflower/', root).pathname, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim()

/** Every file of the data set, in path order, identical for identical sources and commit. */
const snapshotFilesOf = (
  root: URL,
  wildflowerCommit: string
): Effect.Effect<readonly SnapshotFile.Any[], GenerateError> =>
  Effect.gen(function* () {
    const sources = yield* Effect.promise(() => readSources(root))
    const family = yield* generate(sources)
    return yield* Snapshot.assemble(AS_OF, wildflowerCommit, snapshotMembersOf(family)).pipe(
      Either.flatMap(Snapshot.filesOf),
      Either.mapLeft((cause) => new GenerateError({ step: 'assemble', cause }))
    )
  })

const LANDING_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Wildflower synthetic data: the Ashford family</title>
  </head>
  <body>
    <h1>Wildflower synthetic data: the Ashford family</h1>
    <p>
      A synthetic health data set for Wildflower. Every person in it is fictional.
      Its manifest is <a href="index.json">index.json</a>; see the
      <a href="https://github.com/wildflowerhealthio/synthetic-data#readme">README</a>
      for the family and their stories, and the <a href="NOTICE">NOTICE</a> for the
      chest radiograph's licence (CC BY 3.0).
    </p>
  </body>
</html>
`

/**
 * Replace `directory` with the data set: its files, `NOTICE` (at the root and
 * beside the DICOM it covers) and `index.html`.
 */
const writeSite = async (
  root: URL,
  directory: URL,
  files: readonly SnapshotFile.Any[]
): Promise<void> => {
  await rm(directory, { recursive: true, force: true })
  for (const file of files) {
    const target = new URL(file.path, directory)
    await mkdir(new URL('./', target), { recursive: true })
    await writeFile(target, file._tag === 'Text' ? file.text : file.bytes)
  }
  const notice = new URL('NOTICE', root)
  await copyFile(notice, new URL('NOTICE', directory))
  await mkdir(new URL('dicom/', directory), { recursive: true })
  await copyFile(notice, new URL('dicom/NOTICE', directory))
  await writeFile(new URL('index.html', directory), LANDING_PAGE)
}

/** A written file's bytes, for comparing against what was assembled. */
const readWritten = async (directory: URL, path: string): Promise<Uint8Array> =>
  new Uint8Array(await readFile(new URL(path, directory)))

export { readWritten, snapshotFilesOf, wildflowerCommitOf, writeSite }
