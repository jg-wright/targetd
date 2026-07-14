import {
  createTargetingDescriptor,
  type TargetingDescriptor,
} from '@targetd/api'
import {
  array,
  partial,
  refine,
  regex,
  strictObject,
  string,
  union,
  type ZodMiniArray,
  type ZodMiniObject,
  type ZodMiniOptional,
  type ZodMiniString,
  type ZodMiniUnion,
} from 'zod/mini'
import type { $strict, output } from 'zod/v4/core'

type ISODateTimeParser = ZodMiniString<string>

const isoDateTimeParser: ISODateTimeParser = string().check(
  regex(
    /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])(T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]+)?(Z|[+-](?:2[0-3]|[01][0-9]):[0-5][0-9])?)?$/,
    'Must represent an ISO date',
  ),
  // The regex only validates digit shapes; V8 rolls dates like 2024-02-30
  // over to the next month rather than rejecting them.
  refine(isValidISODate, 'Must represent a valid calendar date'),
)

type DateRangeParser = ZodMiniObject<{
  end: ZodMiniOptional<ISODateTimeParser>
  start: ZodMiniOptional<ISODateTimeParser>
}, $strict>

const dateRangeParser: DateRangeParser = partial(strictObject({
  end: isoDateTimeParser,
  start: isoDateTimeParser,
}))

type DateRange = output<typeof dateRangeParser>

type TargetingParser = ZodMiniUnion<
  [typeof dateRangeParser, ZodMiniArray<typeof dateRangeParser>]
>

const targetingParser: TargetingParser = union([
  dateRangeParser,
  array(dateRangeParser),
])

/**
 * Built-in targeting descriptor for date range queries in ISO 8601 format.
 * Automatically evaluates against the current time when no query is provided.
 *
 * Range bounds are inclusive and optional — a missing bound is unbounded.
 * Targeting may also be an array of ranges, matching when any range matches;
 * an empty array matches every query.
 *
 * @example
 * ```ts
 * import { Data, DataSchema } from '@targetd/api'
 * import dateRangeTargeting from '@targetd/date-range'
 * import { z } from 'zod'
 *
 * const data = await Data.create(
 *   DataSchema.create()
 *     .usePayload({ campaign: z.string() })
 *     .useTargeting({ date: dateRangeTargeting }),
 * ).addRules('campaign', [
 *   {
 *     targeting: {
 *       date: { start: '2024-12-01', end: '2024-12-31' }
 *     },
 *     payload: 'Holiday Campaign'
 *   },
 *   { payload: 'Regular Campaign' }
 * ])
 *
 * // Automatic current date evaluation
 * await data.getPayload('campaign')
 *
 * // Historical query
 * await data.getPayload('campaign', { date: { start: '2024-12-15' } })
 * ```
 */
const dateRangeTargeting: TargetingDescriptor<
  TargetingParser,
  typeof dateRangeParser,
  {
    end?: string
    start?: string
  }
> = createTargetingDescriptor({
  predicate: (q) => (t) =>
    Array.isArray(t) ? dateRangesPredicate(t, q) : dateRangePredicate(t, q),
  queryParser: dateRangeParser,
  requiresQuery: false,
  targetingParser,
})

export default dateRangeTargeting

function dateRangePredicate(t: DateRange, q?: DateRange): boolean {
  return q?.start || q?.end ? queryDateRange(t, q) : queryDateRangeAgainstNow(t)
}

function dateRangesPredicate(ts: DateRange[], q?: DateRange): boolean {
  return ts.length === 0 || ts.some((t) => dateRangePredicate(t, q))
}

function queryDateRange(t: DateRange, q: DateRange): boolean {
  const qStart = parseTime(q.start, -Infinity)
  const tStart = parseTime(t.start, -Infinity)
  const qEnd = parseTime(q.end, Infinity)
  const tEnd = parseTime(t.end, Infinity)
  if (
    Number.isNaN(qStart) || Number.isNaN(tStart) ||
    Number.isNaN(qEnd) || Number.isNaN(tEnd)
  ) {
    return false
  }
  const tooLate = tEnd < qStart
  const tooEarly = tStart > qEnd
  return !tooLate && !tooEarly
}

function queryDateRangeAgainstNow(t: DateRange) {
  const now = Date.now()
  const tStart = parseTime(t.start, -Infinity)
  const tEnd = parseTime(t.end, Infinity)
  if (Number.isNaN(tStart) || Number.isNaN(tEnd)) return false
  return tStart <= now && tEnd >= now
}

// A missing bound is unbounded rather than epoch 0 — otherwise every
// pre-1970 range comparison is wrong. NaN (an invalid date that slipped past
// parsing) is returned as-is so predicates can fail closed.
function parseTime(value: string | undefined, defaultTime: number): number {
  return value === undefined ? defaultTime : new Date(value).getTime()
}

function isValidISODate(value: string): boolean {
  if (Number.isNaN(new Date(value).getTime())) return false
  const match = /^(-?\d+)-(\d{2})-(\d{2})/.exec(value)
  if (!match) return false
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ]
  // Round-trip through Date to detect rollover (e.g. Feb 30 → Mar 1)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}
