import type { DataSetManifest } from 'synthetic-data-core'

import { beau, fern, tyra, warren } from './people.ts'

/**
 * How the data set introduces each person in `index.json`: their name and a
 * paragraph on what their records show.
 */

const introductionOf = (person: typeof warren, summary: string): DataSetManifest.Person => ({
  key: person.key,
  displayName: `${person.givenName} ${person.familyName}`,
  summary,
})

const introductions: readonly DataSetManifest.Person[] = [
  introductionOf(
    warren,
    "Tyra's father, 78, with atrial fibrillation and type 2 diabetes, filled at Rexall. His warfarin is cut from 5 to 4 mg when his INR reaches 3.8. A clarithromycin course for a cough pushes the INR to 4.1, so warfarin is held and resumed, and the INR recovers. Metformin goes from 500 to 1000 mg twice daily and his HbA1c falls from 8.4 to 7.0. A chest X-ray is taken at the cough visit."
  ),
  introductionOf(
    tyra,
    "The centre of the family, 46, with hypothyroidism; she holds the family's Shoppers Drug Mart account. Levothyroxine goes from 50 to 75 to 112 mcg and her TSH falls from 8.9 to 0.08, an overshoot her Pebble shows as a resting heart rate climbing toward 92 and broken sleep. Twelve days before the as-of date the dose is cut to 88 mcg: her heart rate and sleep recover and her TSH comes back at 1.9."
  ),
  introductionOf(
    beau,
    "Tyra's spouse, 48, with hypertension and a high LDL, filled on Tyra's Shoppers account. Atorvastatin goes from 20 to 40 mg and his LDL falls from 4.1 to 2.2 mmol/L. Bisoprolol goes from 2.5 to 5 mg, with his potassium, creatinine and eGFR checked alongside each lipid panel."
  ),
  introductionOf(
    fern,
    "Tyra and Beau's daughter, 16, with iron-deficiency anemia, filled on Tyra's Shoppers account. On ferrous sulfate 300 mg daily her hemoglobin rises from 98 to 128 g/L and her ferritin from 6 to 45 µg/L over about four months, with a plateau while a refill is two weeks late."
  ),
]

export { introductions }
