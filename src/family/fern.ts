import {
  type LabDraw,
  Prescription,
  type Story,
  type StoryDay,
} from 'synthetic-data-fundamentals/story'
import type { LabRequisition } from 'synthetic-data-lifelabs/story'

import { fern } from './people.ts'
import { catalogue } from './products.ts'

/**
 * Fern Ashford's story, 16, Tyra and Beau's daughter: iron-deficiency anemia
 * on ferrous sulfate, filled at Shoppers Drug Mart.
 *
 * @remarks
 * Day numbers are relative to the as-of date (see `StoryDay`).
 *
 * **Ferrous sulfate.** Hemoglobin 98 g/L and ferritin 6 µg/L (−128) start
 * ferrous sulfate 300 mg daily (−125) on a 30-day supply. Hemoglobin climbs
 * (112 at −70, 120 at −37) until the third refill, due at −35, is picked up
 * two weeks late (−21): hemoglobin and ferritin plateau across the gap (−22),
 * then resume, reaching 128 g/L and 45 µg/L (−2) — about four months from the
 * start. Each hemoglobin is part of a complete blood count: the microcytic,
 * hypochromic picture (MCV 72 fL, MCH 22.3 pg, RDW and platelets high) corrects
 * as the iron repletes.
 */

/** Fern's pediatrician. */
const pediatrician: Prescription.Prescriber = { key: 'morin', display: 'DR L MORIN' }

/** The refill the gap delays: due at −35, picked up at −21. */
const MISSED_FILL_DAYS_LATE = 14

const ferrousSulfate300mg: Prescription.Prescription = {
  key: 'ferrous-sulfate-1',
  product: catalogue.pharmadexFerrousSulfate300mg,
  dosing: { tabletsPerDose: 1, dosesPerDay: 1, direction: 'WITH FOOD' },
  supplyDaysPerFill: 30,
  repeatsAllowed: 5,
  prescriber: pediatrician,
  written: { day: -125, reason: 'start' },
  ended: null,
  fillDays: Prescription.fillDaysOnCadence(-125, 30, [0, 0, MISSED_FILL_DAYS_LATE]),
}

/** The complete blood count's measured values. */
interface MeasuredBloodCount {
  /** g/L. */
  readonly hemoglobin: number
  /** ×10¹²/L. */
  readonly rbc: number
  /** fL. */
  readonly mcv: number
  /** %. */
  readonly rdw: number
  /** ×10⁹/L. */
  readonly platelets: number
  /** ×10⁹/L. */
  readonly wbc: number
}

/** `value` rounded to `decimals` places. */
const roundTo = (value: number, decimals: number): number =>
  Math.round(value * 10 ** decimals) / 10 ** decimals

/**
 * A complete blood count as the analyzer reports it: the measured values, and
 * the hematocrit (RBC × MCV), MCH (hemoglobin / RBC) and MCHC (hemoglobin /
 * hematocrit) calculated from them.
 */
const bloodCount = (
  day: StoryDay.StoryDay,
  measured: MeasuredBloodCount
): readonly LabDraw.LabDraw[] => {
  const hematocrit = roundTo((measured.rbc * measured.mcv) / 1000, 3)
  return [
    { day, test: 'WBC', value: measured.wbc, unit: 'x E9/L' },
    { day, test: 'RBC', value: measured.rbc, unit: 'x E12/L' },
    { day, test: 'Hemoglobin', value: measured.hemoglobin, unit: 'g/L' },
    { day, test: 'Hematocrit', value: hematocrit, unit: 'L/L' },
    { day, test: 'MCV', value: measured.mcv, unit: 'fL' },
    { day, test: 'MCH', value: roundTo(measured.hemoglobin / measured.rbc, 1), unit: 'pg' },
    { day, test: 'MCHC', value: Math.round(measured.hemoglobin / hematocrit), unit: 'g/L' },
    { day, test: 'RDW', value: measured.rdw, unit: '%' },
    { day, test: 'Platelets', value: measured.platelets, unit: 'x E9/L' },
  ]
}

/** Ferritin (µg/L). */
const ferritin = (day: StoryDay.StoryDay, value: number): LabDraw.LabDraw => ({
  day,
  test: 'Ferritin',
  value,
  unit: 'µg/L',
})

/** Fern's story: see the module summary. */
const fernStory: Story.Story = {
  person: fern,
  prescriptions: [ferrousSulfate300mg],
  labDraws: [
    ...bloodCount(-128, {
      hemoglobin: 98,
      rbc: 4.4,
      mcv: 72,
      rdw: 17.6,
      platelets: 432,
      wbc: 6.4,
    }),
    ferritin(-128, 6),
    ...bloodCount(-70, {
      hemoglobin: 112,
      rbc: 4.55,
      mcv: 76,
      rdw: 18.9,
      platelets: 365,
      wbc: 6.1,
    }),
    ferritin(-70, 19),
    ...bloodCount(-37, {
      hemoglobin: 120,
      rbc: 4.58,
      mcv: 80,
      rdw: 16.4,
      platelets: 318,
      wbc: 5.8,
    }),
    ferritin(-37, 33),
    ...bloodCount(-22, {
      hemoglobin: 120,
      rbc: 4.57,
      mcv: 80,
      rdw: 15.9,
      platelets: 322,
      wbc: 6.6,
    }),
    ferritin(-22, 32),
    ...bloodCount(-2, {
      hemoglobin: 128,
      rbc: 4.62,
      mcv: 84,
      rdw: 14.2,
      platelets: 296,
      wbc: 6,
    }),
    ferritin(-2, 45),
  ],
}

/** Fern's pediatrician orders her lab work and copies the family physician. */
const fernLabRequisition: LabRequisition.LabRequisition = {
  orderedBy: 'MORIN DR. LUCIE',
  copyTo: ['BHATT DR. SUNITA'],
}

export { fernLabRequisition, fernStory }
