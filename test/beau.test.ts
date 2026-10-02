import { describe, expect, test } from 'vite-plus/test'

import { Prescription } from 'synthetic-data-core'

import { beauStory } from '../src/family/index.ts'
import { dailyDosesOf, prescriptionsOf } from './story.test-helpers.ts'

/**
 * Pins Beau's story to the epic (#787): atorvastatin 20 → 40 mg answering an
 * LDL of 4.1 that falls to 2.2, and bisoprolol 2.5 → 5 mg, renewed. The
 * expectations are the epic's, written out rather than read back.
 */

const atorvastatin = prescriptionsOf(beauStory, 'Atorvastatin')
const bisoprolol = prescriptionsOf(beauStory, 'Bisoprolol')

const ldlValues = beauStory.labDraws
  .filter((draw) => draw.test === 'LDL Cholesterol')
  .map((draw) => draw.value)

describe("Beau's story", () => {
  test('is Beau Hartman, 48', () => {
    expect(beauStory.person).toMatchObject({ givenName: 'Beau', familyName: 'Hartman', age: 48 })
  })

  test('takes atorvastatin 20, then 40 mg, and LDL falls from 4.1 to 2.2 mmol/L', () => {
    expect(dailyDosesOf(atorvastatin)).toEqual(['20 mg', '40 mg'])
    expect(atorvastatin.map(Prescription.statusOf)).toEqual(['stopped', 'active'])
    expect(ldlValues[0]).toBe(4.1)
    expect(ldlValues.at(-1)).toBe(2.2)
  })

  test('takes bisoprolol 2.5 mg as one 2.5 mg tablet, then 5 mg, renewed', () => {
    expect(dailyDosesOf(bisoprolol)).toEqual(['2.5 mg', '5 mg', '5 mg'])
    expect(bisoprolol.map((prescription) => prescription.written.reason)).toEqual([
      'start',
      'dose-change',
      'renewal',
    ])
    expect(bisoprolol[0]?.dosing.tabletsPerDose).toBe(1)
    expect(bisoprolol[0]?.product.strength).toEqual({ value: 2.5, unit: 'mg' })
    expect(bisoprolol.map(Prescription.statusOf)).toEqual(['completed', 'completed', 'active'])
  })

  test('is renewed once the 5 mg repeats and supply run out', () => {
    const [, fiveMg, renewal] = bisoprolol
    expect(fiveMg === undefined ? null : Prescription.repeatsRemainingOf(fiveMg)).toBe(0)
    expect(renewal?.written.day).toBeGreaterThanOrEqual(
      fiveMg === undefined ? 0 : (Prescription.suppliedUntilOf(fiveMg) ?? 0)
    )
  })

  test('has potassium and creatinine drawn with every LDL', () => {
    const daysOf = (labTest: string): readonly number[] =>
      beauStory.labDraws.filter((draw) => draw.test === labTest).map((draw) => draw.day)
    expect(daysOf('Potassium')).toEqual(daysOf('LDL Cholesterol'))
    expect(daysOf('Creatinine')).toEqual(daysOf('LDL Cholesterol'))
  })

  test('refills every 90 days, a few of them late and none early', () => {
    const refillDaysLate = beauStory.prescriptions.flatMap((prescription) =>
      prescription.fillDays
        .slice(1)
        .map(
          (fillDay, index) =>
            fillDay - (prescription.fillDays[index] ?? 0) - prescription.supplyDaysPerFill
        )
    )
    expect(refillDaysLate.every((daysLate) => daysLate >= 0)).toBe(true)
    expect(refillDaysLate.filter((daysLate) => daysLate > 0).length).toBeGreaterThanOrEqual(2)
    expect(
      beauStory.prescriptions.every((prescription) => prescription.supplyDaysPerFill === 90)
    ).toBe(true)
  })
})
