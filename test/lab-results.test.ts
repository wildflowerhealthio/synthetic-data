import { DateTime, Option, Schema } from 'effect'
import { Quantity, type ReferenceType } from 'fhir-r4/data-types'
import type { FhirResource, Observation, Patient } from 'fhir-r4/resources'
import { LifeLabsLaboratory, Person, type Story, StoryDay } from 'synthetic-data-core'
import { describe, expect, test } from 'vite-plus/test'

import {
  AS_OF,
  beauStory,
  fernStory,
  lifeLabsToronto,
  tyraStory,
  warrenStory,
} from '../src/family/index.ts'
import type { PersonRecords } from '../src/generate.ts'
import { recordsOf } from './family.test-helpers.ts'

/**
 * The family's lab results as `generate` files them, read the way a viewer
 * reads them: every draw prints as a coded quantity at the value the story
 * set, every result is filed on the Patient the person's pharmacy import makes
 * (checked against the real HAR imports `generate` runs), and each series
 * moves with the dose timeline as the epic (#787) tells it.
 */

interface Member {
  readonly story: Story.Story
  readonly records: PersonRecords
}

const warren: Member = { story: warrenStory, records: recordsOf('warren') }
const tyra: Member = { story: tyraStory, records: recordsOf('tyra') }
const beau: Member = { story: beauStory, records: recordsOf('beau') }
const fern: Member = { story: fernStory, records: recordsOf('fern') }

const labsOf = (member: Member): readonly FhirResource[] => member.records.resources.labs

const observationsOf = (member: Member): readonly Observation.Type[] =>
  labsOf(member).flatMap((resource) => (resource.resourceType === 'Observation' ? [resource] : []))

/** An Observation's `valueQuantity`, decoded: the `value[x]` choice is typed `any`. */
const quantityOf = (observation: Observation.Type): typeof Quantity.Schema.Type | null =>
  Option.getOrNull(
    Schema.decodeUnknownOption(Schema.typeSchema(Quantity.Schema))(observation.valueQuantity)
  )

/** The story day an Observation was collected on. */
const storyDayOf = (observation: Observation.Type): number => {
  const collected = DateTime.formatIsoDate(DateTime.unsafeMake(observation.effectiveDateTime ?? 0))
  return (Date.parse(collected) - Date.parse(StoryDay.toIsoDate(AS_OF, 0))) / 86_400_000
}

interface Result {
  readonly day: number
  readonly value: number
  /** `H`, `L`, or `null` inside the range. */
  readonly flag: string | null
}

/** The series a viewer plots for the printed test `name`, oldest first. */
const seriesOf = (member: Member, name: string): readonly Result[] =>
  observationsOf(member)
    .filter((observation) => observation.code.text === name)
    .map((observation): Result => ({
      day: storyDayOf(observation),
      value: quantityOf(observation)?.value ?? Number.NaN,
      flag: observation.interpretation[0]?.coding[0]?.code ?? null,
    }))
    .toSorted((left, right) => left.day - right.day)

const valuesOf = (results: readonly Result[]): readonly number[] =>
  results.map((result) => result.value)

const isDecreasing = (values: readonly number[]): boolean =>
  values.every((value, index) => index === 0 || value < (values[index - 1] ?? 0))

const prescriptionOf = (story: Story.Story, key: string): Story.Story['prescriptions'][number] => {
  const prescription = story.prescriptions.find((candidate) => candidate.key === key)
  if (prescription === undefined) throw new Error(`no prescription ${key}`)
  return prescription
}

const members = [
  ['Warren', warren],
  ['Tyra', tyra],
  ['Beau', beau],
  ['Fern', fern],
] as const

describe.each(members)("%s's lab results", (_name, member) => {
  const pharmacyImport = member.records.resources.pharmacy

  test('print every draw at its value, in a unit coded in UCUM', () => {
    const observations = observationsOf(member)
    expect(observations).toHaveLength(member.story.labDraws.length)
    for (const draw of member.story.labDraws) {
      const labTest = LifeLabsLaboratory.testOf(lifeLabsToronto, draw.test)
      expect(labTest, draw.test).toBeDefined()
      const observation = observations.find(
        (candidate) => candidate.code.text === labTest?.name && storyDayOf(candidate) === draw.day
      )
      const quantity = observation === undefined ? null : quantityOf(observation)
      expect({ value: quantity?.value, coded: quantity?.code !== null }).toEqual({
        value: draw.value,
        coded: draw.unit !== null,
      })
    }
  })

  test('file every result on the person Patient their pharmacy import makes', () => {
    const patients = pharmacyImport.flatMap((resource): readonly Patient.Type[] =>
      resource.resourceType === 'Patient' ? [resource] : []
    )
    const pharmacySubjects = pharmacyImport.flatMap((resource) =>
      resource.resourceType === 'MedicationRequest' ? [resource.subject] : []
    )
    const results = labsOf(member).flatMap((resource) =>
      resource.resourceType === 'Observation' || resource.resourceType === 'DiagnosticReport'
        ? [resource.subject]
        : []
    )
    const [subject] = results
    const filedOn = patients.find((patient) => `Patient/${patient.id}` === subject?.reference)
    expect(filedOn?.name[0]?.given[0]).toBe(member.story.person.givenName)
    expect(filedOn?.link).toEqual([])
    const asImported = pharmacySubjects.find(
      (pharmacySubject) => pharmacySubject.reference === subject?.reference
    )
    const spelled = (reference: ReferenceType | null | undefined): Record<string, unknown> => ({
      reference: reference?.reference,
      system: reference?.identifier?.system?.href,
      value: reference?.identifier?.value,
    })
    expect(asImported).toBeDefined()
    for (const result of results) expect(spelled(result)).toEqual(spelled(asImported))
  })

  test('flag every result against the range printed beside it', () => {
    for (const observation of observationsOf(member)) {
      const value = quantityOf(observation)?.value ?? Number.NaN
      const [range] = observation.referenceRange
      const low = range?.low?.value ?? Number.NEGATIVE_INFINITY
      const high = range?.high?.value ?? Number.POSITIVE_INFINITY
      // A one-sided `<high` target is met only below its bound.
      const aboveHigh = range?.text?.startsWith('<') === true ? value >= high : value > high
      const code = observation.interpretation[0]?.coding[0]?.code ?? null
      if (value < low) expect(code).toBe('L')
      else expect(code).toBe(aboveHigh ? 'H' : null)
    }
  })
})

describe("Warren's INR and HbA1c", () => {
  const inr = seriesOf(warren, 'INR')
  const cutDay = prescriptionOf(warrenStory, 'warfarin-2').written.day
  const course = prescriptionOf(warrenStory, 'clarithromycin-1')
  const courseEnd = course.written.day + course.supplyDaysPerFill
  const resumeDay = prescriptionOf(warrenStory, 'warfarin-4').written.day

  test('is drawn weekly around the dose cut and the clarithromycin course', () => {
    const drawsWithin = (from: number, to: number): number =>
      inr.filter((result) => result.day >= from && result.day <= to).length
    expect(drawsWithin(cutDay - 1, cutDay + 28)).toBeGreaterThanOrEqual(4)
    expect(drawsWithin(course.written.day, resumeDay + 10)).toBeGreaterThanOrEqual(4)
    expect(inr.length).toBeGreaterThanOrEqual(20)
  })

  test('peaks at 4.1 during the clarithromycin course, then recovers once warfarin resumes', () => {
    const peak = inr.reduce((highest, result) => (result.value > highest.value ? result : highest))
    expect(peak.value).toBe(4.1)
    expect(peak.day).toBeGreaterThanOrEqual(course.written.day)
    expect(peak.day).toBeLessThanOrEqual(courseEnd)
    const afterResume = inr.filter((result) => result.day >= resumeDay)
    expect(afterResume.every((result) => result.value >= 2 && result.value <= 3)).toBe(true)
  })

  test('falls from 3.8 after the cut to 4 mg, settling in the 2.0 - 3.0 target until the course', () => {
    expect(inr.findLast((result) => result.day < cutDay)?.value).toBe(3.8)
    const settling = inr.filter((result) => result.day > cutDay && result.day <= cutDay + 28)
    expect(isDecreasing(valuesOf(settling))).toBe(true)
    const settled = inr.filter(
      (result) => result.day > cutDay + 28 && result.day < course.written.day
    )
    expect(settled.every((result) => result.value >= 2 && result.value <= 3)).toBe(true)
  })

  test('falls from HbA1c 8.4 at the metformin increase to 7.0, fasting glucose with it', () => {
    const increaseDay = prescriptionOf(warrenStory, 'metformin-2').written.day
    const hba1c = seriesOf(warren, 'Hemoglobin A1C')
    const glucose = seriesOf(warren, 'Glucose Fasting')
    expect(hba1c.map((result) => result.day)).toEqual(glucose.map((result) => result.day))
    expect(hba1c.findLast((result) => result.day < increaseDay)).toMatchObject({
      value: 8.4,
      flag: 'H',
    })
    const onIncrease = hba1c.filter((result) => result.day > increaseDay)
    expect(valuesOf(onIncrease)).toEqual([7.6, 7.0, 7.0])
    expect(isDecreasing(valuesOf(glucose.filter((result) => result.day > increaseDay - 7)))).toBe(
      true
    )
    // Quarterly, give or take a few weeks.
    const gaps = hba1c.slice(1).map((result, index) => result.day - (hba1c[index]?.day ?? 0))
    expect(gaps.every((gap) => gap >= 80 && gap <= 100)).toBe(true)
  })
})

describe("Tyra's TSH and free T4", () => {
  const tsh = seriesOf(tyra, 'TSH')
  const freeT4 = seriesOf(tyra, 'Free T4')
  const overshoot = prescriptionOf(tyraStory, 'levothyroxine-3')

  test('falls from 8.9 through each dose increase to 0.08 on 112 mcg, free T4 rising in step', () => {
    const untilCut = tsh.filter((result) => result.day < (overshoot.ended?.day ?? 0))
    expect(valuesOf(untilCut)).toEqual([8.9, 6.1, 4.4, 0.08])
    expect(untilCut.map((result) => result.flag)).toEqual(['H', 'H', 'H', 'L'])
    const freeT4UntilCut = freeT4.filter((result) => result.day < (overshoot.ended?.day ?? 0))
    expect(isDecreasing(valuesOf(freeT4UntilCut).toReversed())).toBe(true)
    expect(freeT4UntilCut.map((result) => result.flag)).toEqual(['L', 'L', null, 'H'])
    const suppressed = tsh.find((result) => result.value === 0.08)
    expect(suppressed?.day).toBeGreaterThan(overshoot.written.day)
    expect(suppressed?.day).toBeLessThan(overshoot.ended?.day ?? 0)
  })

  test('after the cut to 88 mcg, free T4 settles into range while TSH is still climbing back', () => {
    const afterCut = (results: readonly Result[]): readonly Result[] =>
      results.filter((result) => result.day > (overshoot.ended?.day ?? 0))
    const [freeT4AfterCut] = afterCut(freeT4)
    expect(afterCut(freeT4)).toHaveLength(1)
    expect(freeT4AfterCut).toMatchObject({ flag: null })
    expect(freeT4AfterCut?.value).toBeGreaterThanOrEqual(17)
    expect(freeT4AfterCut?.value).toBeLessThanOrEqual(18)
    const [tshAfterCut] = afterCut(tsh)
    expect(afterCut(tsh)).toHaveLength(1)
    expect(tshAfterCut).toMatchObject({ value: 0.29, flag: 'L' })
    expect(tshAfterCut?.value).toBeGreaterThan(0.08)
  })
})

describe("Beau's lipids and kidney function", () => {
  const ldl = seriesOf(beau, 'LDL Cholesterol')
  const statinStart = prescriptionOf(beauStory, 'atorvastatin-1').written.day
  const fortyMg = prescriptionOf(beauStory, 'atorvastatin-2').written.day

  test('LDL falls from 4.1 before atorvastatin to 2.2 on 40 mg, flagged only before', () => {
    expect(isDecreasing(valuesOf(ldl))).toBe(true)
    expect(ldl[0]).toMatchObject({ value: 4.1, flag: 'H' })
    expect(ldl[0]?.day).toBeLessThan(statinStart)
    expect(ldl.at(-1)?.value).toBe(2.2)
    const onTwenty = ldl.filter((result) => result.day > statinStart && result.day < fortyMg)
    const onForty = ldl.filter((result) => result.day > fortyMg)
    expect(Math.min(...valuesOf(onTwenty))).toBeGreaterThan(Math.max(...valuesOf(onForty)))
    expect(ldl.slice(1).every((result) => result.flag === null)).toBe(true)
  })

  test('each panel is internally consistent: Friedewald, non-HDL and the ratio', () => {
    const on = (name: string, day: number): number =>
      beauStory.labDraws.find((draw) => draw.test === name && draw.day === day)?.value ?? Number.NaN
    for (const { day } of ldl) {
      const total = on('Total Cholesterol', day)
      const hdl = on('HDL Cholesterol', day)
      expect(on('LDL Cholesterol', day)).toBeCloseTo(
        total - hdl - on('Triglycerides', day) / 2.2,
        1
      )
      expect(on('Non-HDL Cholesterol', day)).toBeCloseTo(total - hdl, 2)
      expect(on('Cholesterol/HDL Ratio', day)).toBeCloseTo(total / hdl, 1)
    }
  })

  test('potassium and creatinine stay in range, the eGFR the CKD-EPI 2021 equation gives', () => {
    for (const name of ['Potassium', 'Creatinine', 'eGFR']) {
      const series = seriesOf(beau, name)
      expect(series.map((result) => result.day)).toEqual(ldl.map((result) => result.day))
      expect(series.every((result) => result.flag === null)).toBe(true)
    }
    const born = DateTime.toPartsUtc(Person.birthDateOf(beauStory.person, AS_OF))
    const creatinine = seriesOf(beau, 'Creatinine')
    seriesOf(beau, 'eGFR').forEach((egfr, index) => {
      const drawn = DateTime.toPartsUtc(StoryDay.toDateTime(AS_OF, egfr.day))
      const beforeBirthday =
        drawn.month < born.month || (drawn.month === born.month && drawn.day < born.day)
      const years = drawn.year - born.year - (beforeBirthday ? 1 : 0)
      const ratio = (creatinine[index]?.value ?? 0) / 88.4 / 0.9
      const expected =
        142 * Math.min(ratio, 1) ** -0.302 * Math.max(ratio, 1) ** -1.2 * 0.9938 ** years
      expect(Math.abs(egfr.value - expected)).toBeLessThanOrEqual(1)
    })
  })
})

describe("Fern's blood count and ferritin", () => {
  const hemoglobin = seriesOf(fern, 'Hemoglobin')
  const ferritin = seriesOf(fern, 'Ferritin')
  const fillDays = prescriptionOf(fernStory, 'ferrous-sulfate-1').fillDays
  const gapStart = (fillDays.at(-2) ?? 0) + 30
  const gapEnd = fillDays.at(-1) ?? 0
  const acrossGap = (results: readonly Result[]): readonly Result[] =>
    results.filter((result) => result.day >= gapStart - 3 && result.day <= gapEnd)

  test('hemoglobin rises from 98, low, to 128, in range, with a plateau across the missed fill', () => {
    expect(hemoglobin[0]).toMatchObject({ value: 98, flag: 'L' })
    expect(hemoglobin.at(-1)).toMatchObject({ value: 128, flag: null })
    expect(valuesOf(acrossGap(hemoglobin))).toEqual([120, 120])
    const outsideGap = hemoglobin.filter((result) => result.day !== acrossGap(hemoglobin)[1]?.day)
    expect(isDecreasing(valuesOf(outsideGap).toReversed())).toBe(true)
  })

  test('ferritin rises from 6, low, to 45 and plateaus across the missed fill', () => {
    expect(ferritin[0]).toMatchObject({ value: 6, flag: 'L' })
    expect(ferritin.at(-1)?.value).toBe(45)
    const [beforeGap, duringGap] = acrossGap(ferritin)
    expect(Math.abs((duringGap?.value ?? 0) - (beforeGap?.value ?? 0))).toBeLessThanOrEqual(1)
  })

  test('the microcytic indices correct as the iron repletes, each consistent with the count', () => {
    const mcv = seriesOf(fern, 'MCV')
    expect(mcv[0]?.flag).toBe('L')
    expect(mcv.at(-1)?.flag).toBe(null)
    expect(valuesOf(seriesOf(fern, 'RDW')).at(-1)).toBeLessThanOrEqual(14.5)
    const on = (name: string, day: number): number =>
      fernStory.labDraws.find((draw) => draw.test === name && draw.day === day)?.value ?? Number.NaN
    for (const { day } of hemoglobin) {
      const hb = on('Hemoglobin', day)
      expect(on('Hematocrit', day)).toBeCloseTo((on('RBC', day) * on('MCV', day)) / 1000, 3)
      expect(on('MCH', day)).toBeCloseTo(hb / on('RBC', day), 1)
      expect(Math.abs(on('MCHC', day) - hb / on('Hematocrit', day))).toBeLessThanOrEqual(0.5)
    }
  })
})
