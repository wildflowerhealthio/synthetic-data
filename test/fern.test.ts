import { describe, expect, test } from 'vite-plus/test'

import { Prescription } from 'synthetic-data-core'

import { fernStory } from '../src/family/index.ts'
import { labValuesOf } from './story.test-helpers.ts'

/**
 * Pins Fern's story to the epic (#787): ferrous sulfate 300 mg daily, one
 * refill picked up two weeks late, and hemoglobin 98 → 128 g/L and ferritin
 * 6 → 45 µg/L over about four months with a plateau across the gap. The
 * expectations are the epic's, written out rather than read back.
 */

const [ferrousSulfate] = fernStory.prescriptions

describe("Fern's story", () => {
  test('is Fern Ashford, 16', () => {
    expect(fernStory.person).toMatchObject({ givenName: 'Fern', familyName: 'Ashford', age: 16 })
  })

  test('takes ferrous sulfate 300 mg once daily on one active prescription', () => {
    expect(fernStory.prescriptions).toHaveLength(1)
    expect(ferrousSulfate === undefined ? null : Prescription.dailyDoseOf(ferrousSulfate)).toEqual({
      value: 300,
      unit: 'mg',
    })
    expect(ferrousSulfate === undefined ? null : Prescription.statusOf(ferrousSulfate)).toBe(
      'active'
    )
  })

  test('misses one refill by two weeks, the others on time', () => {
    const fillDays = ferrousSulfate?.fillDays ?? []
    const refillDaysLate = fillDays
      .slice(1)
      .map((fillDay, index) => fillDay - (fillDays[index] ?? 0) - 30)
    expect(refillDaysLate).toEqual([0, 0, 14])
  })

  test('raises hemoglobin from 98 to 128 g/L and ferritin from 6 to 45 µg/L in about four months', () => {
    const hemoglobin = labValuesOf(fernStory, 'Hemoglobin')
    const ferritin = labValuesOf(fernStory, 'Ferritin')
    expect([hemoglobin[0]?.[1], hemoglobin.at(-1)?.[1]]).toEqual([98, 128])
    expect([ferritin[0]?.[1], ferritin.at(-1)?.[1]]).toEqual([6, 45])
    const months = ((hemoglobin.at(-1)?.[0] ?? 0) - (hemoglobin[0]?.[0] ?? 0)) / 30
    expect(months).toBeGreaterThanOrEqual(3.5)
    expect(months).toBeLessThanOrEqual(4.5)
  })

  test('plateaus hemoglobin across the gap', () => {
    const fillDays = ferrousSulfate?.fillDays ?? []
    const gapStart = (fillDays.at(-2) ?? 0) + 30
    const gapEnd = fillDays.at(-1) ?? 0
    const aroundGap = labValuesOf(fernStory, 'Hemoglobin').filter(
      ([day]) => day >= gapStart - 3 && day <= gapEnd
    )
    expect(aroundGap.length).toBeGreaterThanOrEqual(2)
    expect(new Set(aroundGap.map(([, value]) => value)).size).toBe(1)
  })
})
