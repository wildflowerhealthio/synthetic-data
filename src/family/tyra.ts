import {
  type LabDraw,
  Prescription,
  type Story,
  type StoryDay,
} from 'synthetic-data-fundamentals/story'
import type { LabRequisition } from 'synthetic-data-lifelabs/story'

import { tyra } from './people.ts'
import { catalogue } from './products.ts'

/**
 * Tyra Ashford's story, 46, the centre of the family: hypothyroidism with an
 * overshoot on levothyroxine, filled at Shoppers Drug Mart.
 *
 * @remarks
 * Day numbers are relative to the as-of date (see `StoryDay`).
 *
 * **Levothyroxine.** TSH 8.9 mIU/L with a low free T4 (−306) starts Synthroid
 * 50 mcg daily (−300) on a 30-day supply. TSH is still 6.1 (−214), so the dose
 * goes to 75 mcg (−208) on a 90-day supply, still Synthroid, filled twice. TSH
 * 4.4 (−52) takes the dose to
 * 112 mcg (−45), which overshoots: TSH falls to 0.08 and free T4 rises above
 * range (−13), and the dose is cut to 88 mcg (−12). Ten days later (−2) free T4
 * is back in range (17.6), about one and a half half-lives on, while TSH —
 * which a suppressed pituitary takes weeks to release — is still low but
 * climbing (0.29, just under the lab's 0.32).
 *
 * The 112 mcg period runs from −45 to −12, so of the 28 days before the as-of
 * day, the first 16 (−28 to −13) are all on 112 mcg — the stretch Tyra's Pebble
 * shows her resting heart rate up and her sleep fragmented, recovering after
 * the cut (see `tyra-physiology.ts`).
 */

/** Tyra's family physician. */
const familyPhysician: Prescription.Prescriber = { key: 'bhatt', display: 'DR S BHATT' }

/** Levothyroxine on an empty stomach, as the label directs. */
const onceDailyBeforeBreakfast: Prescription.Dosing = {
  tabletsPerDose: 1,
  dosesPerDay: 1,
  direction: 'BEFORE BREAKFAST',
}

const levothyroxine50mcg: Prescription.Prescription = {
  key: 'levothyroxine-1',
  product: catalogue.synthroid50mcg,
  dosing: onceDailyBeforeBreakfast,
  supplyDaysPerFill: 30,
  repeatsAllowed: 5,
  prescriber: familyPhysician,
  written: { day: -300, reason: 'start' },
  ended: { day: -208, reason: 'dose-change' },
  fillDays: Prescription.fillDaysOnCadence(-300, 30, [0, 2]),
}

const levothyroxine75mcg: Prescription.Prescription = {
  key: 'levothyroxine-2',
  product: catalogue.synthroid75mcg,
  dosing: onceDailyBeforeBreakfast,
  supplyDaysPerFill: 90,
  repeatsAllowed: 3,
  prescriber: familyPhysician,
  written: { day: -208, reason: 'dose-change' },
  ended: { day: -45, reason: 'dose-change' },
  fillDays: Prescription.fillDaysOnCadence(-208, 90, [0]),
}

const levothyroxine112mcg: Prescription.Prescription = {
  key: 'levothyroxine-3',
  product: catalogue.apoLevothyroxine112mcg,
  dosing: onceDailyBeforeBreakfast,
  supplyDaysPerFill: 30,
  repeatsAllowed: 2,
  prescriber: familyPhysician,
  written: { day: -45, reason: 'dose-change' },
  ended: { day: -12, reason: 'dose-change' },
  fillDays: Prescription.fillDaysOnCadence(-45, 30, [0]),
}

const levothyroxine88mcg: Prescription.Prescription = {
  key: 'levothyroxine-4',
  product: catalogue.apoLevothyroxine88mcg,
  dosing: onceDailyBeforeBreakfast,
  supplyDaysPerFill: 30,
  repeatsAllowed: 3,
  prescriber: familyPhysician,
  written: { day: -12, reason: 'dose-change' },
  ended: null,
  fillDays: [-12],
}

/** TSH (mIU/L) and free T4 (pmol/L) results the dose changes answer to. */
const tsh = (day: StoryDay.StoryDay, value: number): LabDraw.LabDraw => ({
  day,
  test: 'TSH',
  value,
  unit: 'mIU/L',
})
const freeT4 = (day: StoryDay.StoryDay, value: number): LabDraw.LabDraw => ({
  day,
  test: 'Free T4',
  value,
  unit: 'pmol/L',
})

/** Tyra's story: see the module summary. */
const tyraStory: Story.Story = {
  person: tyra,
  prescriptions: [levothyroxine50mcg, levothyroxine75mcg, levothyroxine112mcg, levothyroxine88mcg],
  labDraws: [
    tsh(-306, 8.9),
    freeT4(-306, 9.1),
    tsh(-214, 6.1),
    freeT4(-214, 10.8),
    tsh(-52, 4.4),
    freeT4(-52, 12.6),
    tsh(-13, 0.08),
    freeT4(-13, 27.9),
    tsh(-2, 0.29),
    freeT4(-2, 17.6),
  ],
}

/** The family physician orders Tyra's lab work; nobody is copied. */
const tyraLabRequisition: LabRequisition.LabRequisition = {
  orderedBy: 'BHATT DR. SUNITA',
  copyTo: [],
}

export { tyraLabRequisition, tyraStory }
