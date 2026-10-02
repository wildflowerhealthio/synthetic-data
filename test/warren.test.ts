import { describe, expect, test } from 'vite-plus/test'

import { Prescription } from 'synthetic-data-fundamentals/story'

import { warrenStory } from '../src/family/index.ts'
import { dailyDosesOf, labValuesOf, lastDrawBefore, prescriptionsOf } from './story.test-helpers.ts'

/**
 * Pins Warren's story to the epic (#787): the doses, the order of events and
 * the lab values that drive them. The expectations are the epic's, written out
 * here rather than read back from the story, so a change to the story that
 * breaks it fails.
 */

const warfarin = prescriptionsOf(warrenStory, 'Warfarin')
const metformin = prescriptionsOf(warrenStory, 'Metformin')
const clarithromycin = prescriptionsOf(warrenStory, 'Clarithromycin')

describe("Warren's story", () => {
  test('is Warren Ashford, 78', () => {
    expect(warrenStory.person).toMatchObject({
      givenName: 'Warren',
      familyName: 'Ashford',
      age: 78,
      gender: 'male',
    })
  })

  describe('warfarin', () => {
    test('runs 5 mg, then 4 mg through a renewal, a hold and a resume', () => {
      expect(dailyDosesOf(warfarin)).toEqual(['5 mg', '4 mg', '4 mg', '4 mg'])
      expect(warfarin.map((prescription) => prescription.written.reason)).toEqual([
        'start',
        'dose-change',
        'renewal',
        'resume',
      ])
      expect(warfarin.map(Prescription.statusOf)).toEqual([
        'stopped',
        'completed',
        'stopped',
        'active',
      ])
    })

    test('is cut to 4 mg on an INR of 3.8, which then settles at 2.6', () => {
      const [fiveMg, fourMg] = warfarin
      expect(fiveMg?.ended?.reason).toBe('dose-change')
      expect(lastDrawBefore(warrenStory, 'INR', fourMg?.written.day ?? 0)).toBe(3.8)
      expect(
        labValuesOf(warrenStory, 'INR').find(([day]) => day > (fourMg?.written.day ?? 0))
      ).toBeDefined()
      expect(
        labValuesOf(warrenStory, 'INR').some(([day, value]) => day < -300 && value === 2.6)
      ).toBe(true)
    })

    test('is renewed once the 4 mg repeats run out', () => {
      const [, fourMg, renewal] = warfarin
      expect(fourMg === undefined ? null : Prescription.repeatsRemainingOf(fourMg)).toBe(0)
      expect(renewal?.written.day).toBeGreaterThan(fourMg?.fillDays.at(-1) ?? 0)
    })

    test('is held on an INR of 4.1 during the clarithromycin course, then resumed', () => {
      const [, , held, resumed] = warfarin
      const [course] = clarithromycin
      const courseStart = course?.written.day ?? 0
      const courseEnd = courseStart + (course?.supplyDaysPerFill ?? 0)
      expect(held?.ended?.reason).toBe('hold')
      expect(held?.ended?.day).toBeGreaterThan(courseStart)
      expect(held?.ended?.day).toBeLessThanOrEqual(courseEnd)
      expect(lastDrawBefore(warrenStory, 'INR', (held?.ended?.day ?? 0) + 1)).toBe(4.1)
      // Held a few days, not a new regimen.
      expect((resumed?.written.day ?? 0) - (held?.ended?.day ?? 0)).toBeGreaterThanOrEqual(3)
      expect((resumed?.written.day ?? 0) - (held?.ended?.day ?? 0)).toBeLessThanOrEqual(7)
      expect(lastDrawBefore(warrenStory, 'INR', 1)).toBeLessThan(3)
    })
  })

  test('takes clarithromycin 500 mg twice daily for 7 days, once', () => {
    expect(clarithromycin).toHaveLength(1)
    expect(dailyDosesOf(clarithromycin)).toEqual(['1000 mg'])
    expect(clarithromycin[0]?.supplyDaysPerFill).toBe(7)
    expect(clarithromycin[0]?.fillDays).toHaveLength(1)
    expect(clarithromycin.map(Prescription.statusOf)).toEqual(['completed'])
  })

  describe('metformin', () => {
    test('goes from 500 to 1000 mg twice daily, then switches generics at the same dose', () => {
      expect(dailyDosesOf(metformin)).toEqual(['1000 mg', '2000 mg', '2000 mg'])
      expect(metformin.map((prescription) => prescription.written.reason)).toEqual([
        'start',
        'dose-change',
        'generic-switch',
      ])
      const [, teva, sandoz] = metformin
      expect(teva?.ended).toEqual({ day: sandoz?.written.day, reason: 'generic-switch' })
      expect(sandoz?.product.din).not.toBe(teva?.product.din)
    })

    test('answers an HbA1c of 8.4, which falls to 7.0', () => {
      expect(lastDrawBefore(warrenStory, 'Hemoglobin A1c', metformin[1]?.written.day ?? 0)).toBe(
        8.4
      )
      expect(labValuesOf(warrenStory, 'Hemoglobin A1c').at(-1)?.[1]).toBe(7.0)
    })
  })

  describe('every prescription', () => {
    test.each(warrenStory.prescriptions.map((prescription) => [prescription.key, prescription]))(
      '%s is filled from the day it is written, before it ends, in order',
      (_key, prescription) => {
        const [firstFill] = prescription.fillDays
        expect(firstFill).toBeGreaterThanOrEqual(prescription.written.day)
        expect(prescription.fillDays).toEqual(prescription.fillDays.toSorted((a, b) => a - b))
        for (const fillDay of prescription.fillDays) {
          expect(fillDay).toBeLessThan(prescription.ended?.day ?? 0)
        }
        expect(Prescription.repeatsRemainingOf(prescription)).toBeGreaterThanOrEqual(0)
      }
    )

    test('refills on a 30- or 90-day cadence, a few of them late and none early', () => {
      const refillDaysLate = warrenStory.prescriptions.flatMap((prescription) =>
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
        [
          ...new Set(
            warrenStory.prescriptions.map((prescription) => prescription.supplyDaysPerFill)
          ),
        ].toSorted((a, b) => a - b)
      ).toEqual([7, 30, 90])
    })
  })

  test('happens within the 18 months before the as-of day', () => {
    const days = [
      ...warrenStory.prescriptions.flatMap((prescription) => [
        prescription.written.day,
        ...(prescription.ended === null ? [] : [prescription.ended.day]),
        ...prescription.fillDays,
      ]),
      ...warrenStory.labDraws.map((draw) => draw.day),
    ]
    expect(Math.min(...days)).toBeGreaterThanOrEqual(-548)
    expect(Math.max(...days)).toBeLessThan(0)
  })
})
