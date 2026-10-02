import { describe, expect, test } from 'vite-plus/test'

import { Prescription } from 'synthetic-data-core'

import { tyraStory } from '../src/family/index.ts'
import { dailyDosesOf, labValuesOf, lastDrawBefore } from './story.test-helpers.ts'

/**
 * Pins Tyra's story to the epic (#787): levothyroxine 50 → 75 → 112 → 88 mcg,
 * the TSH values that drive each change,
 * and the 112 mcg overshoot filling the first 16 days of the Pebble's 28-day
 * window, up to the cut.
 * The expectations are the epic's, written out rather than read back.
 */

const levothyroxine = tyraStory.prescriptions

describe("Tyra's story", () => {
  test('is Tyra Ashford, 46', () => {
    expect(tyraStory.person).toMatchObject({ givenName: 'Tyra', familyName: 'Ashford', age: 46 })
  })

  test('takes levothyroxine 50, 75, 112, then 88 mcg a day, each a dose change', () => {
    expect(dailyDosesOf(levothyroxine)).toEqual(['50 mcg', '75 mcg', '112 mcg', '88 mcg'])
    expect(levothyroxine.map((prescription) => prescription.written.reason)).toEqual([
      'start',
      'dose-change',
      'dose-change',
      'dose-change',
    ])
    expect(levothyroxine.map(Prescription.statusOf)).toEqual([
      'stopped',
      'stopped',
      'stopped',
      'active',
    ])
  })

  test('raises the dose on TSH 8.9, 6.1 and 4.4, and cuts it on TSH 0.08', () => {
    const writtenDays = levothyroxine.map((prescription) => prescription.written.day)
    expect(writtenDays.map((day) => lastDrawBefore(tyraStory, 'TSH', day))).toEqual([
      8.9, 6.1, 4.4, 0.08,
    ])
    // Ten days after the cut TSH is still low, but climbing off its suppression.
    const [suppressed, afterCut] = labValuesOf(tyraStory, 'TSH').slice(-2)
    expect(afterCut?.[1]).toBeGreaterThan(suppressed?.[1] ?? 0)
    expect(afterCut?.[1]).toBeLessThan(0.5)
  })

  test('cuts 112 mcg to 88 mcg 12 days before the as-of day', () => {
    const [, , overshoot, cut] = levothyroxine
    expect(cut?.written.day).toBe(-12)
    expect(overshoot?.ended).toEqual({ day: -12, reason: 'dose-change' })
  })

  test('is on 112 mcg for at least two weeks of the 28 days before the as-of day, before the cut', () => {
    const [, , overshoot] = levothyroxine
    const startDay = overshoot?.written.day ?? 0
    const cutDay = overshoot?.ended?.day ?? 0
    expect(startDay).toBeLessThanOrEqual(-28)
    expect(cutDay - Math.max(startDay, -28)).toBeGreaterThanOrEqual(14)
  })

  test('is filled from the day each prescription is written, before it ends, in order', () => {
    for (const prescription of levothyroxine) {
      expect(prescription.fillDays[0]).toBeGreaterThanOrEqual(prescription.written.day)
      expect(prescription.fillDays).toEqual(prescription.fillDays.toSorted((a, b) => a - b))
      for (const fillDay of prescription.fillDays) {
        expect(fillDay).toBeLessThan(prescription.ended?.day ?? 0)
      }
      expect(Prescription.repeatsRemainingOf(prescription)).toBeGreaterThanOrEqual(0)
    }
  })
})
