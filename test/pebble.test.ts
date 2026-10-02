import { Schema } from 'effect'
import type { FhirResource } from 'fhir-r4/resources'
import { StoryDay } from 'synthetic-data-fundamentals/story'
import { describe, expect, test } from 'vite-plus/test'

import { AS_OF, TYRA_CUT_DAY, tyraPhysiology, tyraStory } from '../src/family/index.ts'
import { recordsOf } from './family.test-helpers.ts'

/**
 * Tyra's 28 days of Pebble data, read back from the Observations the way a
 * viewer would: her heart rate is up while levothyroxine 112 mcg overshoots
 * and falls after the cut to 88 mcg, and her nights are broken by 3 a.m.
 * wake-ups during the overshoot and consolidate after it.
 */

const tyra = recordsOf('tyra')
const MILLIS_PER_DAY = 86_400_000
const MILLIS_PER_MINUTE = 60_000

const HEART_RATE = '8867-4'
const SLEEP = 'HealthActivitySleep'
const WALK = 'HealthActivityWalk'

/** An optional field, which the typed resource writes as `null` when absent. */
const nullable = <A, I>(
  schema: Schema.Schema<A, I>
): Schema.optional<Schema.NullOr<Schema.Schema<A, I>>> => Schema.optional(Schema.NullOr(schema))

const Codings = nullable(
  Schema.Struct({ coding: Schema.Array(Schema.Struct({ code: nullable(Schema.String) })) })
)

/** The parts of a Pebble Observation these checks read, as its JSON carries them. */
const Json = Schema.parseJson(
  Schema.Struct({
    code: Codings,
    valueCodeableConcept: Codings,
    valueSampledData: nullable(Schema.Struct({ data: nullable(Schema.String) })),
    effectivePeriod: nullable(
      Schema.Struct({ start: nullable(Schema.String), end: nullable(Schema.String) })
    ),
    subject: nullable(Schema.Struct({ reference: nullable(Schema.String) })),
  })
)
type Json = typeof Json.Type

const decodeJson = Schema.decodeUnknownSync(Json)

const jsonOf = (resource: FhirResource): Json => decodeJson(JSON.stringify(resource))

const observations = tyra.resources.pebble.map(jsonOf)

/** Local (UTC−4) milliseconds since the as-of day's local midnight. */
const localMillisOf = (instant: string): number =>
  Date.parse(instant) +
  tyraPhysiology.utcOffsetHours * 60 * MILLIS_PER_MINUTE -
  Date.parse(StoryDay.toIsoDate(AS_OF, 0))

/** The story day a local instant falls on. */
const storyDayOf = (instant: string): number => Math.floor(localMillisOf(instant) / MILLIS_PER_DAY)

const activitiesOf = (code: string): readonly Json[] =>
  observations.filter((observation) => observation.valueCodeableConcept?.coding?.[0]?.code === code)

/** Every heart-rate sample, with the story day it was taken on. */
const heartRates = observations
  .filter((observation) => observation.code?.coding?.[0]?.code === HEART_RATE)
  .flatMap((observation) => {
    const start = observation.effectivePeriod?.start ?? ''
    return (observation.valueSampledData?.data ?? '').split(' ').flatMap((sample, minute) =>
      sample === 'E'
        ? []
        : [
            {
              day: storyDayOf(
                new Date(Date.parse(start) + minute * MILLIS_PER_MINUTE).toISOString()
              ),
              bpm: Number(sample),
            },
          ]
    )
  })

const medianOf = (values: readonly number[]): number => {
  const sorted = values.toSorted((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN
}

const medianHeartRateOver = (from: number, to: number): number =>
  medianOf(heartRates.filter(({ day }) => day >= from && day <= to).map(({ bpm }) => bpm))

const overshoot = tyraStory.prescriptions.find(
  (prescription) => prescription.key === 'levothyroxine-3'
)

/** Sleep stretches per night, keyed by the day the night ends on. */
const sleepStretchesByNight = activitiesOf(SLEEP).reduce<Map<number, number>>((nights, sleep) => {
  const day = storyDayOf(sleep.effectivePeriod?.end ?? '')
  return nights.set(day, (nights.get(day) ?? 0) + 1)
}, new Map())

const meanStretchesOver = (from: number, to: number): number => {
  const counts = [...sleepStretchesByNight].filter(([day]) => day >= from && day <= to)
  return counts.reduce((total, [, count]) => total + count, 0) / counts.length
}

describe("Tyra's Pebble", () => {
  test('covers the 28 days before the as-of day, filed on her Shoppers Patient', () => {
    const days = new Set(heartRates.map(({ day }) => day))
    expect(Math.min(...days)).toBe(-28)
    expect(Math.max(...days)).toBe(-1)
    expect(days.size).toBe(28)
    const subject = tyra.pharmacyPatient.reference
    expect(new Set(observations.map((observation) => observation.subject?.reference))).toEqual(
      new Set([subject])
    )
  })

  test('starts inside the 112 mcg overshoot and runs past the cut', () => {
    expect(overshoot?.written.day).toBeLessThan(-28)
    expect(overshoot?.ended?.day).toBe(TYRA_CUT_DAY)
    expect(TYRA_CUT_DAY).toBeGreaterThan(-28)
  })

  test('shows the median heart rate higher on 112 mcg than after the cut', () => {
    const onOvershoot = medianHeartRateOver(-28, TYRA_CUT_DAY - 1)
    const afterCut = medianHeartRateOver(TYRA_CUT_DAY, -1)
    expect(onOvershoot).toBeGreaterThan(afterCut)
    // The last week, recovered, sits well below the overshoot's final week.
    expect(medianHeartRateOver(TYRA_CUT_DAY - 7, TYRA_CUT_DAY - 1)).toBeGreaterThanOrEqual(
      medianHeartRateOver(-7, -1) + 12
    )
  })

  test('shows the heart rate rising through the overshoot', () => {
    expect(medianHeartRateOver(TYRA_CUT_DAY - 5, TYRA_CUT_DAY - 1)).toBeGreaterThan(
      medianHeartRateOver(-28, -24)
    )
  })

  test('shows sleep more fragmented on 112 mcg than after the cut', () => {
    const onOvershoot = meanStretchesOver(-27, TYRA_CUT_DAY - 1)
    const recovered = meanStretchesOver(-5, -1)
    expect(onOvershoot).toBeGreaterThan(recovered)
    expect(recovered).toBe(1)
  })

  test('breaks overshoot nights with a wake-up around 3 a.m.', () => {
    const peakNights = [...sleepStretchesByNight].filter(
      ([day]) => day >= TYRA_CUT_DAY - 7 && day < TYRA_CUT_DAY
    )
    for (const [day] of peakNights) {
      const stretches = activitiesOf(SLEEP)
        .filter((sleep) => storyDayOf(sleep.effectivePeriod?.end ?? '') === day)
        .map((sleep) => localMillisOf(sleep.effectivePeriod?.end ?? '') - day * MILLIS_PER_DAY)
      // A stretch ends between 2:30 and 3:30 a.m.
      expect(
        stretches.some((end) => end >= 2.5 * 3_600_000 && end <= 3.5 * 3_600_000),
        `night ending on day ${day}`
      ).toBe(true)
    }
  })

  test('records a few walks', () => {
    expect(activitiesOf(WALK).length).toBeGreaterThanOrEqual(6)
  })
})
