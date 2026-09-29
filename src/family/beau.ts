import {
  type LabDraw,
  type LifeLabs,
  Prescription,
  type Story,
  type StoryDay,
} from 'synthetic-data-core'

import { beau } from './people.ts'
import { catalogue } from './products.ts'

/**
 * Beau Hartman's story, 48, Tyra's spouse: hypertension and a high LDL, on
 * bisoprolol and atorvastatin, filled at Shoppers Drug Mart.
 *
 * @remarks
 * Day numbers are relative to the as-of date (see `StoryDay`).
 *
 * **Atorvastatin.** LDL 4.1 mmol/L (−405) starts atorvastatin 20 mg (−400);
 * LDL is 3.2 (−230), so the dose goes to 40 mg (−226), and LDL falls to 2.6
 * (−140) and 2.2 (−50).
 *
 * **Bisoprolol.** 2.5 mg daily — half a 5 mg tablet, since no 2.5 mg tablet is
 * marketed — from −380. Its one repeat used and its supply run out, it is
 * rewritten at 5 mg (−198); that prescription's repeat runs out too and it is
 * renewed at the same dose (−15). Potassium, creatinine and the eGFR are
 * drawn with each fasting lipid panel; total cholesterol falls from 6.14 to
 * 3.99 and triglycerides into range with the LDL.
 *
 * Every fill is a 90-day supply, a few picked up a day or several late.
 */

/** Beau's family physician, who is Tyra's too. */
const familyPhysician: Prescription.Prescriber = { key: 'bhatt', display: 'DR S BHATT' }

const onceDaily: Prescription.Dosing = { tabletsPerDose: 1, dosesPerDay: 1, direction: null }

const atorvastatin20mg: Prescription.Prescription = {
  key: 'atorvastatin-1',
  product: catalogue.tevaAtorvastatin20mg,
  dosing: { ...onceDaily, direction: 'AT BEDTIME' },
  supplyDaysPerFill: 90,
  repeatsAllowed: 3,
  prescriber: familyPhysician,
  written: { day: -400, reason: 'start' },
  ended: { day: -226, reason: 'dose-change' },
  fillDays: Prescription.fillDaysOnCadence(-400, 90, [0]),
}

const atorvastatin40mg: Prescription.Prescription = {
  key: 'atorvastatin-2',
  product: catalogue.tevaAtorvastatin40mg,
  dosing: { ...onceDaily, direction: 'AT BEDTIME' },
  supplyDaysPerFill: 90,
  repeatsAllowed: 3,
  prescriber: familyPhysician,
  written: { day: -226, reason: 'dose-change' },
  ended: null,
  fillDays: Prescription.fillDaysOnCadence(-226, 90, [0, 4]),
}

const bisoprolol2point5mg: Prescription.Prescription = {
  key: 'bisoprolol-1',
  product: catalogue.apoBisoprolol5mg,
  dosing: { ...onceDaily, tabletsPerDose: 0.5 },
  supplyDaysPerFill: 90,
  repeatsAllowed: 1,
  prescriber: familyPhysician,
  written: { day: -380, reason: 'start' },
  ended: null,
  fillDays: Prescription.fillDaysOnCadence(-380, 90, [1]),
}

const bisoprolol5mg: Prescription.Prescription = {
  key: 'bisoprolol-2',
  product: catalogue.apoBisoprolol5mg,
  dosing: onceDaily,
  supplyDaysPerFill: 90,
  repeatsAllowed: 1,
  prescriber: familyPhysician,
  written: { day: -198, reason: 'dose-change' },
  ended: null,
  fillDays: Prescription.fillDaysOnCadence(-198, 90, [2]),
}

const bisoprolol5mgRenewed: Prescription.Prescription = {
  ...bisoprolol5mg,
  key: 'bisoprolol-3',
  repeatsAllowed: 3,
  written: { day: -15, reason: 'renewal' },
  fillDays: [-15],
}

/** A result in `unit` for `test`. */
const drawOf =
  (test: string, unit: string) =>
  (day: StoryDay.StoryDay, value: number): LabDraw.LabDraw => ({ day, test, value, unit })

/** The results of one fasting lipid panel, in mmol/L. */
interface LipidPanel {
  readonly totalCholesterol: number
  readonly triglycerides: number
  readonly hdl: number
  readonly ldl: number
  readonly nonHdl: number
  /** Total cholesterol over HDL. */
  readonly ratio: number
}

/**
 * A lipid panel as the lab reports it: the measured triglycerides and HDL and
 * the LDL the story sets, total cholesterol back-calculated from Friedewald
 * (LDL = total − HDL − triglycerides / 2.2), non-HDL and the ratio from those.
 */
const lipidPanel = (day: StoryDay.StoryDay, panel: LipidPanel): readonly LabDraw.LabDraw[] => [
  drawOf('Total Cholesterol', 'mmol/L')(day, panel.totalCholesterol),
  drawOf('Triglycerides', 'mmol/L')(day, panel.triglycerides),
  drawOf('HDL Cholesterol', 'mmol/L')(day, panel.hdl),
  drawOf('LDL Cholesterol', 'mmol/L')(day, panel.ldl),
  drawOf('Non-HDL Cholesterol', 'mmol/L')(day, panel.nonHdl),
  { day, test: 'Cholesterol/HDL Ratio', value: panel.ratio, unit: null },
]

/** Potassium (mmol/L), creatinine (µmol/L) and the eGFR (CKD-EPI 2021) from it. */
const potassium = drawOf('Potassium', 'mmol/L')
const creatinine = drawOf('Creatinine', 'µmol/L')
const egfr = drawOf('eGFR', 'mL/min/1.73m2')

/** Beau's story: see the module summary. */
const beauStory: Story.Story = {
  person: beau,
  prescriptions: [
    atorvastatin20mg,
    bisoprolol2point5mg,
    atorvastatin40mg,
    bisoprolol5mg,
    bisoprolol5mgRenewed,
  ],
  labDraws: [
    ...lipidPanel(-405, {
      totalCholesterol: 6.14,
      triglycerides: 2.24,
      hdl: 1.02,
      ldl: 4.1,
      nonHdl: 5.12,
      ratio: 6.0,
    }),
    potassium(-405, 4.3),
    creatinine(-405, 84),
    egfr(-405, 99),
    ...lipidPanel(-230, {
      totalCholesterol: 5.13,
      triglycerides: 1.92,
      hdl: 1.06,
      ldl: 3.2,
      nonHdl: 4.07,
      ratio: 4.8,
    }),
    potassium(-230, 4.4),
    creatinine(-230, 86),
    egfr(-230, 96),
    ...lipidPanel(-140, {
      totalCholesterol: 4.44,
      triglycerides: 1.62,
      hdl: 1.1,
      ldl: 2.6,
      nonHdl: 3.34,
      ratio: 4.0,
    }),
    potassium(-140, 4.6),
    creatinine(-140, 89),
    egfr(-140, 92),
    ...lipidPanel(-50, {
      totalCholesterol: 3.99,
      triglycerides: 1.48,
      hdl: 1.12,
      ldl: 2.2,
      nonHdl: 2.87,
      ratio: 3.6,
    }),
    potassium(-50, 4.5),
    creatinine(-50, 88),
    egfr(-50, 93),
  ],
}

/** The family physician orders Beau's lab work; nobody is copied. */
const beauLabRequisition: LifeLabs.LabRequisition = { orderedBy: 'BHATT DR. SUNITA', copyTo: [] }

export { beauLabRequisition, beauStory }
