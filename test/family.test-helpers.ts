import { Effect } from 'effect'
import type { FhirResource } from 'fhir-r4/resources'

import { type Family, generate, type PersonRecords } from '../src/generate.ts'
import { readSources } from '../src/sources.ts'

/**
 * The family as `generate` renders it, once per test file, and readers over
 * it.
 */

const family: Family = await Effect.runPromise(
  generate(await readSources(new URL('../', import.meta.url)))
)

/** The records of the person keyed `key` (`'warren'`). */
const recordsOf = (key: string): PersonRecords => {
  const records = family.people.find((candidate) => candidate.person.key === key)
  if (records === undefined) throw new Error(`no records for ${key}`)
  return records
}

/** Every resource of a person's, across their sources. */
const allResourcesOf = (records: PersonRecords): readonly FhirResource[] =>
  Object.values(records.resources).flat()

export { allResourcesOf, family, recordsOf }
