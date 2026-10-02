/**
 * Emit the data set into `site/`, the tree GitHub Pages publishes: `index.json`,
 * `fhir/<Type>/<id>.json`, the `har/` and `dicom/` files the resources were
 * imported from, `NOTICE` and `index.html`. `site/` is replaced whole.
 *
 * Run it with `vp run emit`, then commit `site/`.
 */
import { Effect } from 'effect'

import { snapshotFilesOf, wildflowerCommitOf, writeSite } from '../src/site.ts'

const ROOT = new URL('../', import.meta.url)
const SITE = new URL('site/', ROOT)

const wildflowerCommit = wildflowerCommitOf(ROOT)
const files = await Effect.runPromise(snapshotFilesOf(ROOT, wildflowerCommit))
await writeSite(ROOT, SITE, files)

const bytes = files.reduce(
  (total, file) =>
    total + (file._tag === 'Text' ? Buffer.byteLength(file.text) : file.bytes.byteLength),
  0
)
process.stdout.write(
  `Wrote ${files.length} files (${(bytes / 1_048_576).toFixed(1)} MiB) to ${SITE.pathname}, Wildflower ${wildflowerCommit}\n`
)
