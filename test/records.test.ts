import type { FhirResource } from '@wildflowerhealthio/fhir-r4/resources'
import { StoryDay } from '@wildflowerhealthio/synthetic-data-fundamentals/story'
import { DateTime } from 'effect'
import { describe, expect, test } from 'vite-plus/test'

import {
  AS_OF,
  CHEST_X_RAY_FILE_NAME,
  shoppersAccounts,
  warrenChestXRay,
  warrenStory,
} from '../src/family/index.ts'
import { allResourcesOf, family, recordsOf } from './family.test-helpers.ts'

/**
 * Who each resource `generate` makes belongs to: one Patient per person, every
 * lab result, watch reading and image filed on the person's pharmacy Patient,
 * and each Shoppers account's import holding exactly its person's
 * prescriptions and fills, every one filed on them.
 */

const subjectReferenceOf = (resource: FhirResource): string | undefined =>
  'subject' in resource ? (resource.subject?.reference ?? undefined) : undefined

/** A Patient's names as `given family`. */
const namesOf = (resource: FhirResource): readonly string[] =>
  resource.resourceType === 'Patient'
    ? resource.name.map((name) => [...name.given, name.family ?? ''].join(' '))
    : []

const ofType = (
  resources: readonly FhirResource[],
  resourceType: string
): readonly FhirResource[] => resources.filter((resource) => resource.resourceType === resourceType)

describe.each(family.people.map((records) => [records.person.givenName, records] as const))(
  "%s's records",
  (_name, records) => {
    const patientReference = records.pharmacyPatient.reference
    const patients = ofType(allResourcesOf(records), 'Patient')

    test('hold one Patient', () => {
      expect(new Set(patients.map((patient) => patient.id)).size).toBe(1)
      const own = patients.find((patient) => `Patient/${patient.id}` === patientReference)
      expect(own === undefined ? [] : namesOf(own)).toEqual([
        `${records.person.givenName} ${records.person.familyName}`,
      ])
    })

    test('file every lab result, watch reading and image on the pharmacy Patient', () => {
      const filed = [
        ...records.resources.labs,
        ...records.resources.pebble,
        ...records.resources.imaging,
      ].filter((resource) => resource.resourceType !== 'Practitioner')
      expect(filed.length).toBeGreaterThan(0)
      for (const resource of filed) expect(subjectReferenceOf(resource)).toBe(patientReference)
    })

    test('hold exactly their own prescriptions and fills, each filed on them', () => {
      const story = shoppersAccounts.find(
        (account) => account.patients[0].story.person.key === records.person.key
      )?.patients[0].story
      const requests = ofType(records.resources.pharmacy, 'MedicationRequest')
      const dispenses = ofType(records.resources.pharmacy, 'MedicationDispense')
      for (const resource of [...requests, ...dispenses]) {
        expect(subjectReferenceOf(resource)).toBe(patientReference)
      }
      if (story !== undefined) {
        expect(requests).toHaveLength(story.prescriptions.length)
        expect(dispenses).toHaveLength(
          story.prescriptions.reduce(
            (fills, prescription) => fills + prescription.fillDays.length,
            0
          )
        )
      }
    })
  }
)

describe('the Shoppers accounts', () => {
  test('each manage one person', () => {
    expect(shoppersAccounts.map((account) => account.patients.length)).toEqual([1, 1, 1])
  })

  test('import as Patients that link to no other and carry no account identifier', () => {
    const pcids = new Set(shoppersAccounts.map((account) => account.pcid))
    const patients = family.people
      .flatMap((records) => allResourcesOf(records))
      .flatMap((resource) => (resource.resourceType === 'Patient' ? [resource] : []))
    const identifiers = patients.flatMap((patient) => patient.identifier)
    expect(patients).toHaveLength(family.people.length)
    expect(patients.flatMap((patient) => patient.link)).toEqual([])
    expect(identifiers.filter((identifier) => /pc-?id/i.test(String(identifier.system)))).toEqual(
      []
    )
    expect(identifiers.filter((identifier) => pcids.has(identifier.value ?? ''))).toEqual([])
  })

  test('share nothing between people', () => {
    const keys = ['tyra', 'beau', 'fern'].flatMap((key) =>
      recordsOf(key).resources.pharmacy.map((resource) => `${resource.resourceType}/${resource.id}`)
    )
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe("Warren's chest X-ray", () => {
  const warren = recordsOf('warren')
  const study = ofType(warren.resources.imaging, 'ImagingStudy')
  const file = warren.files.find((candidate) => candidate.path === `dicom/${CHEST_X_RAY_FILE_NAME}`)

  test('is one DX study taken on the day of the cough visit', () => {
    const [imagingStudy] = study
    if (imagingStudy?.resourceType !== 'ImagingStudy') throw new Error('no ImagingStudy')
    expect(study).toHaveLength(1)
    expect(imagingStudy.modality.map((coding) => coding.code)).toEqual(['DX'])
    expect(DateTime.formatIsoDate(DateTime.unsafeMake(imagingStudy.started ?? 0))).toBe(
      StoryDay.toIsoDate(AS_OF, warrenChestXRay.studyDay)
    )
  })

  test('comes with the order it was taken under, and the file it was read from', () => {
    expect(ofType(warren.resources.imaging, 'ServiceRequest')).toHaveLength(1)
    expect(ofType(warren.resources.imaging, 'DocumentReference')).toHaveLength(1)
    const header = new TextDecoder('latin1').decode(file?.bytes)
    expect(header.slice(128, 132)).toBe('DICM')
    expect(header).toContain('Ashford^Warren')
  })

  test('is taken the day the walk-in clinic writes the clarithromycin', () => {
    const course = warrenStory.prescriptions.find(
      (prescription) => prescription.key === 'clarithromycin-1'
    )
    expect(warrenChestXRay.studyDay).toBe(course?.written.day)
  })
})
