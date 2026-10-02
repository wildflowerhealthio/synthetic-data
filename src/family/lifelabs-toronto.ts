import { type Laboratory, PrintedRange } from 'synthetic-data-lifelabs/story'

const { atLeast, below, between, eitherSex } = PrintedRange

/**
 * The LifeLabs laboratory the family's specimens go to — its Toronto site, as
 * its reports print the lab block and licence — and how it prints each test
 * the family's stories draw.
 *
 * @remarks
 * The ranges are adult Ontario community-lab ranges in SI units, printed the
 * way the report prints them: a bounded range as `low - high`, a lipid or
 * kidney target as one-sided `<high` or `>=low`, bounds as printed text
 * (`4.00`, not `4`). Tests print in catalogue order: the complete blood count,
 * coagulation, then chemistry, the lipid assessment and the thyroid.
 */

const HEMATOLOGY = 'Hematology'
const CHEMISTRY = 'Chemistry'
const COAGULATION = 'Coagulation'
const LIPIDS = 'Lipid Assessment'
const ENDOCRINOLOGY = 'Endocrinology'

/** The lower of two printed bounds, as printed. */
const lowerOf = (left: string, right: string): string =>
  Number(right) < Number(left) ? right : left

/** The higher of two printed bounds, as printed. */
const higherOf = (left: string, right: string): string =>
  Number(right) > Number(left) ? right : left

/**
 * A range that differs by sex, printed for a person whose gender is `other` or
 * `unknown` as the span of both: the lowest low and the highest high.
 */
const bySex = (
  male: PrintedRange.PrintedRange,
  female: PrintedRange.PrintedRange
): Laboratory.LifeLabsTest['range'] => {
  const span = ((): PrintedRange.PrintedRange => {
    if (male._tag === 'between' && female._tag === 'between') {
      return between(lowerOf(male.low, female.low), higherOf(male.high, female.high))
    }
    if (male._tag === 'atLeast' && female._tag === 'atLeast') {
      return atLeast(lowerOf(male.low, female.low))
    }
    if (male._tag === 'below' && female._tag === 'below') {
      return below(higherOf(male.high, female.high))
    }
    throw new Error('bySex spans two ranges of the same kind')
  })()
  return { male, female, other: span, unknown: span }
}

/** See the module summary. */
const lifeLabsToronto: Laboratory.Laboratory = {
  addressLines: ['100 International Blvd.', 'Toronto, Ontario', 'Canada M9W 6J6'],
  licence: '#5687',
  timeZone: 'America/Toronto',
  tests: [
    {
      storyTest: 'WBC',
      name: 'WBC',
      section: HEMATOLOGY,
      group: '',
      decimals: 1,
      range: eitherSex(between('4.0', '11.0')),
      comments: [],
    },
    {
      storyTest: 'RBC',
      name: 'RBC',
      section: HEMATOLOGY,
      group: '',
      decimals: 2,
      range: bySex(between('4.50', '6.00'), between('3.80', '5.20')),
      comments: [],
    },
    {
      storyTest: 'Hemoglobin',
      name: 'Hemoglobin',
      section: HEMATOLOGY,
      group: '',
      decimals: 0,
      range: bySex(between('135', '175'), between('120', '160')),
      comments: [],
    },
    {
      storyTest: 'Hematocrit',
      name: 'Hematocrit',
      section: HEMATOLOGY,
      group: '',
      decimals: 3,
      range: bySex(between('0.400', '0.520'), between('0.350', '0.460')),
      comments: [],
    },
    {
      storyTest: 'MCV',
      name: 'MCV',
      section: HEMATOLOGY,
      group: '',
      decimals: 0,
      range: eitherSex(between('80', '100')),
      comments: [],
    },
    {
      storyTest: 'MCH',
      name: 'MCH',
      section: HEMATOLOGY,
      group: '',
      decimals: 1,
      range: eitherSex(between('27.5', '33.0')),
      comments: [],
    },
    {
      storyTest: 'MCHC',
      name: 'MCHC',
      section: HEMATOLOGY,
      group: '',
      decimals: 0,
      range: eitherSex(between('305', '360')),
      comments: [],
    },
    {
      storyTest: 'RDW',
      name: 'RDW',
      section: HEMATOLOGY,
      group: '',
      decimals: 1,
      range: eitherSex(between('11.5', '14.5')),
      comments: [],
    },
    {
      storyTest: 'Platelets',
      name: 'Platelet Count',
      section: HEMATOLOGY,
      group: '',
      decimals: 0,
      range: eitherSex(between('150', '400')),
      comments: [],
    },
    {
      storyTest: 'INR',
      name: 'INR',
      section: HEMATOLOGY,
      group: COAGULATION,
      decimals: 1,
      range: eitherSex(between('0.8', '1.2')),
      comments: ['Therapeutic range for most indications', 'on warfarin: 2.0 - 3.0'],
    },
    {
      storyTest: 'Fasting Glucose',
      name: 'Glucose Fasting',
      section: CHEMISTRY,
      group: '',
      decimals: 1,
      range: eitherSex(between('3.6', '6.0')),
      comments: [],
    },
    {
      storyTest: 'Hemoglobin A1c',
      name: 'Hemoglobin A1C',
      section: CHEMISTRY,
      group: '',
      decimals: 1,
      range: eitherSex(between('4.0', '6.0')),
      comments: ['Target for most people with diabetes: <=7.0%'],
    },
    {
      storyTest: 'Creatinine',
      name: 'Creatinine',
      section: CHEMISTRY,
      group: '',
      decimals: 0,
      range: bySex(between('60', '115'), between('45', '90')),
      comments: [],
    },
    {
      storyTest: 'eGFR',
      name: 'eGFR',
      section: CHEMISTRY,
      group: '',
      decimals: 0,
      range: eitherSex(atLeast('60')),
      comments: ['Calculated with the CKD-EPI 2021 equation.'],
    },
    {
      storyTest: 'Potassium',
      name: 'Potassium',
      section: CHEMISTRY,
      group: '',
      decimals: 1,
      range: eitherSex(between('3.5', '5.0')),
      comments: [],
    },
    {
      storyTest: 'Ferritin',
      name: 'Ferritin',
      section: CHEMISTRY,
      group: '',
      decimals: 0,
      range: bySex(between('30', '400'), between('15', '247')),
      comments: [],
    },
    {
      storyTest: 'Total Cholesterol',
      name: 'Cholesterol',
      section: CHEMISTRY,
      group: LIPIDS,
      decimals: 2,
      range: eitherSex(below('5.20')),
      comments: [],
    },
    {
      storyTest: 'Triglycerides',
      name: 'Triglycerides',
      section: CHEMISTRY,
      group: LIPIDS,
      decimals: 2,
      range: eitherSex(below('1.70')),
      comments: [],
    },
    {
      storyTest: 'HDL Cholesterol',
      name: 'HDL Cholesterol',
      section: CHEMISTRY,
      group: LIPIDS,
      decimals: 2,
      range: bySex(atLeast('1.00'), atLeast('1.30')),
      comments: [],
    },
    {
      storyTest: 'LDL Cholesterol',
      name: 'LDL Cholesterol',
      section: CHEMISTRY,
      group: LIPIDS,
      decimals: 2,
      range: eitherSex(below('3.50')),
      comments: ['Calculated (Friedewald).'],
    },
    {
      storyTest: 'Non-HDL Cholesterol',
      name: 'Non-HDL Cholesterol',
      section: CHEMISTRY,
      group: LIPIDS,
      decimals: 2,
      range: eitherSex(below('4.20')),
      comments: [],
    },
    {
      storyTest: 'Cholesterol/HDL Ratio',
      name: 'Chol/HDL Ratio',
      section: CHEMISTRY,
      group: LIPIDS,
      decimals: 1,
      range: eitherSex(below('5.0')),
      comments: [],
    },
    {
      storyTest: 'TSH',
      name: 'TSH',
      section: CHEMISTRY,
      group: ENDOCRINOLOGY,
      decimals: 2,
      range: eitherSex(between('0.32', '4.00')),
      comments: [],
    },
    {
      storyTest: 'Free T4',
      name: 'Free T4',
      section: CHEMISTRY,
      group: ENDOCRINOLOGY,
      decimals: 1,
      range: eitherSex(between('12.0', '22.0')),
      comments: [],
    },
  ],
}

export { lifeLabsToronto }
