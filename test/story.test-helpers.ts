import { Prescription, type Story } from 'synthetic-data-fundamentals/story'

/**
 * Readers the family's story tests share: a story's prescriptions of one drug,
 * their daily doses as text, and its lab values by test.
 */

/** `story`'s prescriptions for `genericName`, in the order they were written. */
const prescriptionsOf = (
  story: Story.Story,
  genericName: string
): readonly Prescription.Prescription[] =>
  story.prescriptions.filter((prescription) => prescription.product.genericName === genericName)

/** Each prescription's daily dose as `'<value> <unit>'` (`'2.5 mg'`). */
const dailyDosesOf = (prescriptions: readonly Prescription.Prescription[]): readonly string[] =>
  prescriptions.map((prescription) => {
    const dose = Prescription.dailyDoseOf(prescription)
    return `${dose.value} ${dose.unit}`
  })

/** Every `labTest` draw in `story`, as `[day, value]`, in the order drawn. */
const labValuesOf = (story: Story.Story, labTest: string): readonly (readonly [number, number])[] =>
  story.labDraws.filter((draw) => draw.test === labTest).map((draw) => [draw.day, draw.value])

/** The value of `labTest` drawn most recently before `day`. */
const lastDrawBefore = (story: Story.Story, labTest: string, day: number): number | undefined =>
  labValuesOf(story, labTest).findLast(([drawDay]) => drawDay < day)?.[1]

export { dailyDosesOf, labValuesOf, lastDrawBefore, prescriptionsOf }
