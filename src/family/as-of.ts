import { DateTime } from 'effect'

/**
 * The data set's as-of date: the day every story is dated back from (see
 * `StoryDay` in `synthetic-data-fundamentals`), and the day the pharmacy sessions are
 * captured.
 *
 * @remarks
 * Fixed rather than "today", so the published data does not drift between
 * regenerations. Move it and regenerate to refresh the data set: every date
 * moves with it, and the intervals between events — the stories — stay put.
 * Only its UTC calendar day matters.
 */
const AS_OF: DateTime.Utc = DateTime.unsafeMake('2026-09-28T12:00:00Z')

export { AS_OF }
