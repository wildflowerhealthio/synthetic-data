import { type PebbleObservations, Seeded, type StoryDay } from 'synthetic-data-core'

import { tyraStory } from './tyra.ts'

/**
 * What Tyra's Pebble recorded over the 28 days before the as-of day (−28 to
 * −1): her resting heart rate and sleep while levothyroxine 112 mcg overshoots,
 * and their recovery after the cut to 88 mcg.
 *
 * @remarks
 * Day numbers are relative to the as-of date (see `StoryDay`); times are
 * minutes from local midnight on Toronto's daylight clock (UTC−4, which every
 * day of the window is on for the fixed as-of date).
 *
 * - **Resting heart rate.** About 68 bpm before 112 mcg. From the day 112 mcg
 *   starts (−45) it climbs, slowly at first as the dose reaches steady state,
 *   toward 92 on the last day before the cut (−13) — so the window opens at
 *   about 77 and rises. After the cut (−12) it falls back toward 70 over about
 *   a week, as the excess clears.
 * - **Sleep.** Bed around 22:45, up around 06:40. While the overshoot builds
 *   she wakes around 3:00 and gets up — for longer, and a second time around
 *   5:00, as it peaks — and deep (restful) sleep takes a smaller share of each
 *   stretch. After the cut the wake-ups shorten and stop, and the nights
 *   consolidate. The first day's night is not recorded: the watch's data starts
 *   at its midnight.
 * - **Walks.** A lunchtime walk about every third day.
 * - **Charging.** The watch comes off for about an hour each evening, after
 *   dinner and well before bed.
 *
 * Small day-to-day jitter (bedtime, walk length, charge length) is hashed from
 * the day (`Seeded`), so the physiology is the same on every regeneration.
 */

const levothyroxineOf = (key: string): (typeof tyraStory.prescriptions)[number] => {
  const prescription = tyraStory.prescriptions.find((candidate) => candidate.key === key)
  if (prescription === undefined) throw new Error(`Tyra has no prescription ${key}`)
  return prescription
}

const overshoot = levothyroxineOf('levothyroxine-3')
/** The day 112 mcg starts. */
const OVERSHOOT_START_DAY: StoryDay.StoryDay = overshoot.written.day
/** The day it is cut to 88 mcg. */
const CUT_DAY: StoryDay.StoryDay = overshoot.ended?.day ?? 0

/** The watch's window: the 28 days before the as-of day. */
const FIRST_DAY: StoryDay.StoryDay = -28
const LAST_DAY: StoryDay.StoryDay = -1

const UTC_OFFSET_HOURS = -4

const BASELINE_HEART_RATE_BPM = 68
const OVERSHOOT_HEART_RATE_BPM = 92
const RECOVERED_HEART_RATE_BPM = 70
/** Days for the post-cut excess to fall by a factor of e. */
const RECOVERY_DAYS = 4

/**
 * How far into the overshoot a day is, from `0` (none) to `1` (its peak on the
 * last day on 112 mcg): a slow start that steepens as the dose accumulates,
 * then an exponential fall after the cut.
 */
const overshootOf = (day: StoryDay.StoryDay): number => {
  if (day < OVERSHOOT_START_DAY) return 0
  if (day < CUT_DAY)
    return ((day - OVERSHOOT_START_DAY) / (CUT_DAY - 1 - OVERSHOOT_START_DAY)) ** 1.5
  return Math.exp(-(day - CUT_DAY + 1) / RECOVERY_DAYS)
}

const restingHeartRateOf = (day: StoryDay.StoryDay): number =>
  day < CUT_DAY
    ? Math.round(
        BASELINE_HEART_RATE_BPM +
          (OVERSHOOT_HEART_RATE_BPM - BASELINE_HEART_RATE_BPM) * overshootOf(day)
      )
    : Math.round(
        RECOVERED_HEART_RATE_BPM +
          (OVERSHOOT_HEART_RATE_BPM - RECOVERED_HEART_RATE_BPM) * overshootOf(day)
      )

/** A jitter in `[min, max]` for `day`, hashed from what it is for. */
const jitterOf = (day: StoryDay.StoryDay, what: string, min: number, max: number): number =>
  Seeded.integerOf(['tyra', 'pebble', what, String(day)], min, max)

/** The stretches of sleep between falling asleep, the wake-ups and waking. */
const stretchesOf = (
  asleepMinute: number,
  wakeUps: readonly PebbleObservations.Span[],
  awakeMinute: number
): readonly { readonly start: number; readonly end: number }[] => {
  const bounds = [
    asleepMinute,
    ...wakeUps.flatMap((wakeUp) => [
      wakeUp.startMinute,
      wakeUp.startMinute + wakeUp.durationMinutes,
    ]),
    awakeMinute,
  ]
  return Array.from({ length: bounds.length / 2 }, (_, index) => ({
    start: bounds[index * 2] ?? asleepMinute,
    end: bounds[index * 2 + 1] ?? awakeMinute,
  }))
}

/** The night that ends on `day`. */
const nightOf = (day: StoryDay.StoryDay): PebbleObservations.Night => {
  const severity = overshootOf(day)
  const asleepMinute = -75 + jitterOf(day, 'asleep', -20, 20)
  const awakeMinute = 400 + jitterOf(day, 'awake', -15, 15)
  const wakeUps: PebbleObservations.Span[] = []
  if (severity > 0.2) {
    wakeUps.push({
      startMinute: 180 + jitterOf(day, 'three-am', -20, 20),
      durationMinutes: Math.round(20 + 40 * severity),
    })
  }
  if (severity > 0.6) {
    wakeUps.push({
      startMinute: 300 + jitterOf(day, 'five-am', -10, 10),
      durationMinutes: Math.round(10 + 15 * severity),
    })
  }
  /** Deep sleep's share of a stretch: about a third, less as the overshoot builds. */
  const restfulShare = 0.34 - 0.18 * severity
  const restfulSleeps = stretchesOf(asleepMinute, wakeUps, awakeMinute).flatMap(
    ({ start, end }): readonly PebbleObservations.Span[] => {
      const durationMinutes = Math.round((end - start) * restfulShare)
      return end - start >= 90 && durationMinutes > 0
        ? [
            {
              startMinute: start + 30,
              durationMinutes: Math.min(durationMinutes, end - start - 45),
            },
          ]
        : []
    }
  )
  return { asleepMinute, awakeMinute, wakeUps, restfulSleeps }
}

/** A lunchtime walk about every third day. */
const walksOf = (day: StoryDay.StoryDay): readonly PebbleObservations.Walk[] =>
  (day - FIRST_DAY) % 3 === 1
    ? [
        {
          startMinute: 12 * 60 + 10 + jitterOf(day, 'walk-start', 0, 15),
          durationMinutes: jitterOf(day, 'walk-length', 28, 46),
          stepsPerMinute: jitterOf(day, 'walk-cadence', 100, 114),
          heartRateRiseBpm: jitterOf(day, 'walk-rise', 22, 30),
        },
      ]
    : []

/** The evening charge, after dinner. */
const chargingOf = (day: StoryDay.StoryDay): readonly PebbleObservations.Span[] => [
  {
    startMinute: 19 * 60 + 30 + jitterOf(day, 'charge-start', -10, 10),
    durationMinutes: jitterOf(day, 'charge-length', 50, 70),
  },
]

/** See the module summary. */
const tyraPhysiology: PebbleObservations.Physiology = {
  utcOffsetHours: UTC_OFFSET_HOURS,
  circadian: { amplitudeBpm: 6, nadirMinute: 4 * 60 },
  days: Array.from({ length: LAST_DAY - FIRST_DAY + 1 }, (_, index) => {
    const day = FIRST_DAY + index
    return {
      day,
      restingHeartRateBpm: restingHeartRateOf(day),
      night: day === FIRST_DAY ? null : nightOf(day),
      walks: walksOf(day),
      charging: chargingOf(day),
    }
  }),
}

export { CUT_DAY, tyraPhysiology }
