import { DateTime } from 'effect'
import type { FhirResource } from 'fhir-r4/resources'
import { SourcePatient, StoryDay } from 'synthetic-data-core'
import { describe, expect, test } from 'vite-plus/test'

import {
  AS_OF,
  CHEST_X_RAY_FILE_NAME,
  tyraShoppersAccount,
  warrenChestXRay,
  warrenStory,
} from '../src/family/index.ts'
import { allResourcesOf, family, recordsOf } from './family.test-helpers.ts'

/**
 * Who each resource `generate` makes belongs to: one Patient per person (Tyra
 * also has the Shoppers account's), every lab result, watch reading and image
 * filed on the person's pharmacy Patient, and the shared Shoppers import split
 * so that each person has exactly their own prescriptions and fills.
 */

const subjectReferenceOf = (resource: FhirResource): string | undefined =>
  'subject' in resource ? (resource.subject?.reference ?? undefined) : undefined

/** A Patient's names as `given family`. */
const namesOf = (resource: FhirResource): readonly string[] =>
  resource.resourceType === 'Patient'
    ? resource.name.map((name) => [...name.given, name.family ?? ''].join(' '))
    : []

/** Whether a resource carries an identifier with value `value`. */
const hasIdentifierValue = (resource: FhirResource, value: string): boolean =>
  'identifier' in resource &&
  Array.isArray(resource.identifier) &&
  resource.identifier.some((identifier) => identifier.value === value)

const ofType = (
  resources: readonly FhirResource[],
  resourceType: string
): readonly FhirResource[] => resources.filter((resource) => resource.resourceType === resourceType)

describe.each(family.people.map((records) => [records.person.givenName, records] as const))(
  "%s's records",
  (_name, records) => {
    const patientReference = `Patient/${SourcePatient.adoptedIdOf(records.pharmacyPatient)}`
    const patients = ofType(allResourcesOf(records), 'Patient')

    test('hold one Patient — Tyra also the Shoppers account holder’s', () => {
      const expected = records.person.key === 'tyra' ? 2 : 1
      expect(new Set(patients.map((patient) => patient.id)).size).toBe(expected)
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

    test('hold exactly their own prescriptions and fills', () => {
      const story =
        records.person.key === 'warren'
          ? null
          : tyraShoppersAccount.patients.find(
              (patient) => patient.story.person.key === records.person.key
            )?.story
      const requests = ofType(records.resources.pharmacy, 'MedicationRequest')
      const dispenses = ofType(records.resources.pharmacy, 'MedicationDispense')
      for (const request of requests) expect(subjectReferenceOf(request)).toBe(patientReference)
      if (story !== null && story !== undefined) {
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

describe("Tyra's Shoppers account Patient", () => {
  test('is keyed by the pcid and filed with Tyra alone', () => {
    const accountPatients = family.people.flatMap((records) =>
      ofType(records.resources.pharmacy, 'Patient')
        .filter((patient) => hasIdentifierValue(patient, tyraShoppersAccount.pcid))
        .map(() => records.person.key)
    )
    expect(accountPatients).toEqual(['tyra'])
  })
})

describe('the Shoppers import split', () => {
  test('shares nothing between people but the HAR it came from', () => {
    const [tyra, beau, fern] = ['tyra', 'beau', 'fern'].map((key) =>
      recordsOf(key).resources.pharmacy.map((resource) => `${resource.resourceType}/${resource.id}`)
    )
    const shared = (tyra ?? []).filter(
      (key) => (beau ?? []).includes(key) || (fern ?? []).includes(key)
    )
    expect(shared).toHaveLength(1)
    expect(shared[0]).toMatch(/^DocumentReference\//)
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
