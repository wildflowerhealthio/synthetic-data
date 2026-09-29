import { type DateTime, Effect, Either, Schema } from 'effect'
import { Observation, type FhirResource } from 'fhir-r4/resources'
import { defaultHarSettings, harImporter } from 'har-importer-core'
import {
  type DataSet,
  DicomImage,
  LifeLabs,
  PebbleObservations,
  PebbleWatch,
  type Person,
  RexallHar,
  ShoppersHar,
  SourcePatient,
  type Story,
  StoryDay,
} from 'synthetic-data-core'

import {
  AS_OF,
  beauLabRequisition,
  CHEST_X_RAY_FILE_NAME,
  fernLabRequisition,
  introductions,
  lifeLabsToronto,
  tyraLabRequisition,
  tyraPhysiology,
  tyraShoppersAccount,
  warrenChestXRay,
  warrenLabRequisition,
  warrenRexallAccount,
  warrenStory,
} from './family/index.ts'

/**
 * The Ashford family rendered: for each person, the FHIR resources the real
 * importers make of their records — the pharmacy HAR through the HAR
 * importer, the lab results through the LifeLabs renderer, Tyra's watch
 * through FHIR Sync for Pebble's builders, Warren's X-ray through the DICOM
 * importer — and the static files those resources came from.
 *
 * @remarks
 * Pure apart from its input: the caller reads the TCIA source image
 * (`sources.ts`) and passes its bytes in, and the result is the same for the
 * same bytes and as-of date. Writing it out as a data set is the emit step's
 * (`scripts/emit.ts`).
 *
 * **Pharmacy.** Each HAR is rendered by `synthetic-data-core` and decoded by
 * `har-importer-core` exactly as the importer app decodes a picked file,
 * source-file `DocumentReference` included. A decode can list one resource
 * twice — the Shoppers status feed and history feed both write each
 * dispense — and the app submits every entry as a `PUT`, so the one kept is
 * the last, as the server stores it.
 *
 * **Shared account.** Tyra's Shoppers account HAR imports all three of its
 * people at once; {@link personResourcesOf} splits it: each person's Patient,
 * everything that points at it (their prescriptions, their dispenses via
 * those prescriptions), and everything those point at (the source-file
 * `DocumentReference` the HAR is kept as). The account Patient keyed by the
 * `pcid` is the account holder's, Tyra's.
 */

/** A file the data set publishes as it is, beside the resources made from it. */
interface StaticFile {
  /** Where it is published, relative to the data set's root (`har/…`, `dicom/…`). */
  readonly path: string
  readonly mediaType: string
  readonly bytes: Uint8Array
}

/** Where a person's resources came from. */
type Source = 'pharmacy' | 'labs' | 'pebble' | 'imaging'

/** One person's slice of the data set. */
interface PersonRecords {
  readonly person: Person.Person
  /** The Patient every one of their results is filed on: the one their pharmacy import makes. */
  readonly pharmacyPatient: SourcePatient.SourcePatient
  /** Each source's resources, in the order it produced them; a shared resource appears under every person it belongs to. */
  readonly resources: Readonly<Record<Source, readonly FhirResource[]>>
  readonly files: readonly StaticFile[]
}

/** The whole family, eldest first. */
interface Family {
  /** The as-of date every story is dated from, as an ISO calendar date. */
  readonly asOf: string
  readonly people: readonly PersonRecords[]
}

/** The bytes the generator reads from `sources/`. */
interface Sources {
  /** The de-identified TCIA chest radiograph Warren's X-ray is re-identified from. */
  readonly chestXRay: Uint8Array
}

class GenerateError extends Schema.TaggedError<GenerateError>()('GenerateError', {
  step: Schema.String,
  cause: Schema.Defect,
}) {
  override get message(): string {
    return `${this.step}: ${String(this.cause)}`
  }
}

const HAR_MEDIA_TYPE = 'application/json'
const DICOM_MEDIA_TYPE = 'application/dicom'

const textEncoder = new TextEncoder()

/** `Type/id` of a resource: the key the server stores it under. */
const keyOf = (resource: FhirResource): string => `${resource.resourceType}/${resource.id ?? ''}`

/** The resources in order, keeping each `Type/id`'s last occurrence where its first stood. */
const lastWriteWins = (resources: readonly FhirResource[]): readonly FhirResource[] => {
  const last = new Map(resources.map((resource) => [keyOf(resource), resource]))
  const seen = new Set<string>()
  return resources.flatMap((resource) => {
    const key = keyOf(resource)
    if (seen.has(key)) return []
    seen.add(key)
    const kept = last.get(key)
    return kept === undefined ? [] : [kept]
  })
}

/** Every `Type/id` a resource names: its `reference`s, and the `meta.source` its import stamped. */
const referencesOf = (resource: FhirResource): ReadonlySet<string> => {
  const found = new Set<string>()
  const walk = (value: unknown, key: string | null): void => {
    if (typeof value === 'string') {
      if ((key === 'reference' || key === 'source') && /^[A-Z][A-Za-z]+\/[^/]+$/.test(value)) {
        found.add(value)
      }
      return
    }
    if (value === null || typeof value !== 'object' || value instanceof URL) return
    if (Array.isArray(value)) {
      for (const item of value) walk(item, key)
      return
    }
    for (const [childKey, child] of Object.entries(value)) walk(child, childKey)
  }
  walk(resource, null)
  found.delete(keyOf(resource))
  return found
}

/**
 * One person's share of a pharmacy import that may hold several people: their
 * own Patients, everything that refers to them (directly or through another of
 * theirs), then everything those refer to. A Patient joins only as one of
 * `patientIds`, never by reference — the Shoppers account Patient links to the
 * people it manages, and belongs to its holder alone.
 */
const personResourcesOf = (
  imported: readonly FhirResource[],
  patientIds: readonly string[]
): readonly FhirResource[] => {
  const byKey = new Map(imported.map((resource) => [keyOf(resource), resource]))
  const owned = new Set(patientIds.map((id) => `Patient/${id}`))
  for (let grew = true; grew;) {
    grew = false
    for (const resource of imported) {
      const key = keyOf(resource)
      if (owned.has(key) || resource.resourceType === 'Patient') continue
      if ([...referencesOf(resource)].some((reference) => owned.has(reference))) {
        owned.add(key)
        grew = true
      }
    }
  }
  const pending = [...owned]
  while (pending.length > 0) {
    const resource = byKey.get(pending.pop() ?? '')
    if (resource === undefined) continue
    for (const reference of referencesOf(resource)) {
      const target = byKey.get(reference)
      if (target === undefined || target.resourceType === 'Patient' || owned.has(reference)) {
        continue
      }
      owned.add(reference)
      pending.push(reference)
    }
  }
  return imported.filter((resource) => owned.has(keyOf(resource)))
}

/** A HAR's text through the HAR importer: every resource, source file included, last write kept. */
const importHar = (
  fileName: string,
  har: string
): Effect.Effect<readonly FhirResource[], GenerateError> =>
  harImporter
    .decode([{ id: `0:${fileName}`, fileName, bytes: textEncoder.encode(har) }], defaultHarSettings)
    .pipe(
      Effect.map((result) =>
        lastWriteWins(
          result.decoded.sections.flatMap((section) =>
            section.resources.map((entry) => entry.resource)
          )
        )
      ),
      Effect.mapError((cause) => new GenerateError({ step: `import ${fileName}`, cause }))
    )

const labsOf = (
  asOf: DateTime.Utc,
  story: Story.Story,
  requisition: LifeLabs.LabRequisition,
  pharmacyPatient: SourcePatient.SourcePatient
): Effect.Effect<readonly FhirResource[], GenerateError> =>
  LifeLabs.render(asOf, story, lifeLabsToronto, requisition, pharmacyPatient).pipe(
    Effect.mapError((cause) => new GenerateError({ step: `labs for ${story.person.key}`, cause }))
  )

const decodeObservation = Schema.decodeUnknown(Observation.Schema)

/** Tyra's 28 days of watch data, as FHIR Sync for Pebble writes them, on her Shoppers Patient. */
const pebbleOf = (
  asOf: DateTime.Utc,
  pharmacyPatient: SourcePatient.SourcePatient
): Effect.Effect<readonly FhirResource[], GenerateError> =>
  Effect.forEach(
    PebbleObservations.render(
      asOf,
      PebbleWatch.watchOf(['tyra']),
      SourcePatient.adoptedIdOf(pharmacyPatient),
      tyraPhysiology
    ),
    (observation) => decodeObservation(observation)
  ).pipe(Effect.mapError((cause) => new GenerateError({ step: "Tyra's Pebble", cause })))

/** Warren's chest X-ray, re-identified and read through the DICOM importer onto his Rexall Patient. */
const chestXRayOf = (
  asOf: DateTime.Utc,
  source: Uint8Array,
  pharmacyPatient: SourcePatient.SourcePatient
): Effect.Effect<
  { readonly resources: readonly FhirResource[]; readonly file: StaticFile },
  GenerateError
> =>
  Effect.gen(function* () {
    const bytes = yield* Either.mapLeft(
      DicomImage.reidentify(asOf, source, warrenChestXRay),
      (cause) => new GenerateError({ step: "re-identify Warren's X-ray", cause })
    )
    const subject = yield* SourcePatient.referenceOf(pharmacyPatient).pipe(
      Effect.mapError((cause) => new GenerateError({ step: "Warren's Patient", cause }))
    )
    const resources = yield* DicomImage.importWithSubject(
      bytes,
      CHEST_X_RAY_FILE_NAME,
      subject
    ).pipe(Effect.mapError((cause) => new GenerateError({ step: "import Warren's X-ray", cause })))
    return {
      resources,
      file: { path: `dicom/${CHEST_X_RAY_FILE_NAME}`, mediaType: DICOM_MEDIA_TYPE, bytes },
    }
  })

const NO_RESOURCES: Readonly<Record<Source, readonly FhirResource[]>> = {
  pharmacy: [],
  labs: [],
  pebble: [],
  imaging: [],
}

/**
 * The family, rendered and imported.
 *
 * @param sources - The bytes read from `sources/`
 * @param asOf - The as-of date; the family's own (`AS_OF`) unless a test moves it
 */
const generate = (
  sources: Sources,
  asOf: DateTime.Utc = AS_OF
): Effect.Effect<Family, GenerateError> =>
  Effect.gen(function* () {
    // Warren: Rexall, labs, the chest X-ray.
    const warrenPatient = RexallHar.sourcePatientOf(warrenRexallAccount)
    const rexallHar = RexallHar.render(asOf, warrenStory, warrenRexallAccount)
    const rexallFileName = 'warren-ashford-rexall.har'
    const rexall = yield* importHar(rexallFileName, rexallHar)
    const chestXRay = yield* chestXRayOf(asOf, sources.chestXRay, warrenPatient)
    const warren: PersonRecords = {
      person: warrenStory.person,
      pharmacyPatient: warrenPatient,
      resources: {
        ...NO_RESOURCES,
        pharmacy: rexall,
        labs: yield* labsOf(asOf, warrenStory, warrenLabRequisition, warrenPatient),
        imaging: chestXRay.resources,
      },
      files: [
        {
          path: `har/${rexallFileName}`,
          mediaType: HAR_MEDIA_TYPE,
          bytes: textEncoder.encode(rexallHar),
        },
        chestXRay.file,
      ],
    }

    // Tyra, Beau and Fern: one Shoppers account HAR, split per person.
    const shoppersHar = ShoppersHar.render(asOf, tyraShoppersAccount)
    const shoppersFileName = 'tyra-ashford-shoppers.har'
    const shoppers = yield* importHar(shoppersFileName, shoppersHar)
    const shoppersFile: StaticFile = {
      path: `har/${shoppersFileName}`,
      mediaType: HAR_MEDIA_TYPE,
      bytes: textEncoder.encode(shoppersHar),
    }
    const managedPatientIds = new Set(
      tyraShoppersAccount.patients.map((patient) =>
        SourcePatient.adoptedIdOf(ShoppersHar.sourcePatientOf(patient))
      )
    )
    const accountPatientIds = shoppers.flatMap((resource) =>
      resource.resourceType === 'Patient' && !managedPatientIds.has(resource.id ?? '')
        ? [resource.id ?? '']
        : []
    )
    const requisitions = new Map([
      ['tyra', tyraLabRequisition],
      ['beau', beauLabRequisition],
      ['fern', fernLabRequisition],
    ])
    const shoppersPeople = yield* Effect.forEach(tyraShoppersAccount.patients, (patient) =>
      Effect.gen(function* () {
        const { story } = patient
        const pharmacyPatient = ShoppersHar.sourcePatientOf(patient)
        const isHolder = story.person.key === tyraShoppersAccount.holder.key
        const patientIds = [
          SourcePatient.adoptedIdOf(pharmacyPatient),
          ...(isHolder ? accountPatientIds : []),
        ]
        const requisition = requisitions.get(story.person.key)
        if (requisition === undefined) {
          return yield* new GenerateError({
            step: `labs for ${story.person.key}`,
            cause: 'no lab requisition',
          })
        }
        const records: PersonRecords = {
          person: story.person,
          pharmacyPatient,
          resources: {
            ...NO_RESOURCES,
            pharmacy: personResourcesOf(shoppers, patientIds),
            labs: yield* labsOf(asOf, story, requisition, pharmacyPatient),
            pebble: isHolder ? yield* pebbleOf(asOf, pharmacyPatient) : [],
          },
          files: [shoppersFile],
        }
        return records
      })
    )

    return { asOf: StoryDay.toIsoDate(asOf, 0), people: [warren, ...shoppersPeople] }
  })

/**
 * The family as `DataSet.assemble` takes it: each person's introduction and
 * every resource of theirs, pharmacy first.
 */
const dataSetPeopleOf = (family: Family): readonly DataSet.PersonRecords[] =>
  family.people.map((records) => {
    const person = introductions.find((introduction) => introduction.key === records.person.key)
    if (person === undefined) throw new Error(`no introduction for ${records.person.key}`)
    const { pharmacy, labs, pebble, imaging } = records.resources
    return { person, resources: [...pharmacy, ...labs, ...pebble, ...imaging] }
  })

export { dataSetPeopleOf, generate, GenerateError, lastWriteWins, personResourcesOf, referencesOf }
export type { Family, PersonRecords, Source, Sources, StaticFile }
