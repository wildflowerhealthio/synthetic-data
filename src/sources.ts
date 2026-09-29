import { readFile } from 'node:fs/promises'

import { CHEST_X_RAY_SOURCE } from './family/index.ts'
import type { Sources } from './generate.ts'

/**
 * Read the files under `sources/` the generator re-identifies, relative to the
 * repository root.
 *
 * @param root - The repository root, as a `file:` URL ending in `/`
 */
const readSources = async (root: URL): Promise<Sources> => ({
  chestXRay: new Uint8Array(await readFile(new URL(CHEST_X_RAY_SOURCE, root))),
})

export { readSources }
