/**
 * Emit the data set into `site/`, the tree GitHub Pages publishes.
 *
 * @remarks
 * **A stub until Wildflower #793 lands.** #793 adds the data-set layout to
 * `synthetic-data-core` — `fhir/<Type>/<id>.json`, one importer-output
 * resource per file; the static `har/` and `dicom/` files, linked from their
 * source-file `DocumentReference`s' `attachment.url`; and the `index.json`
 * manifest and its `assemble` — which the loader app shares. Until then this
 * renders the family (`src/generate.ts`) and reports what each person would
 * publish, writing nothing.
 *
 * Run it with `vp run emit` (or see `package.json`'s `emit` script).
 */
import { Effect } from 'effect'

import { generate } from '../src/generate.ts'
import { readSources } from '../src/sources.ts'

const ROOT = new URL('../', import.meta.url)
const SITE = new URL('site/', ROOT)

const family = await Effect.runPromise(generate(await readSources(ROOT)))

const lines = [
  `As of ${family.asOf}:`,
  ...family.people.map((records) => {
    const counts = Object.entries(records.resources)
      .filter(([, resources]) => resources.length > 0)
      .map(([source, resources]) => `${source} ${resources.length}`)
      .join(', ')
    const files = records.files.map((file) => file.path).join(', ')
    return `  ${records.person.givenName} ${records.person.familyName}: ${counts}; files ${files}`
  }),
  `Not written: the data-set layout for ${SITE.pathname} arrives with Wildflower #793.`,
]
process.stdout.write(`${lines.join('\n')}\n`)
