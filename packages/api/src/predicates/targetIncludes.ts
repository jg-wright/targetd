import type TargetingDescriptor from '../parsers/TargetingDescriptor.ts'
import type { $ZodArray, $ZodType, output } from 'zod/v4/core'
import { array } from 'zod/mini'
import { isNegation } from './negation.ts'

/**
 * Create a targeting descriptor that matches when a targeting array includes the query value.
 * The query is a single value, while targeting is an array that may contain that value.
 *
 * @param t - Zod schema for the query value (targeting will be an array of this type).
 * @param options - Configuration options.
 * @param options.withNegate - Enable negation support (e.g., `!value` to exclude).
 * @returns A targeting descriptor with array inclusion matching.
 *
 * @example
 * ```ts
 * import { Data, DataSchema, targetIncludes } from '@targetd/api'
 * import { z } from 'zod'
 *
 * const data = await Data.create(
 *   DataSchema.create()
 *     .usePayload({ content: z.string() })
 *     .useTargeting({ country: targetIncludes(z.string()) }),
 * ).addRules('content', [
 *   { targeting: { country: ['US', 'CA'] }, payload: 'North America content' },
 *   { targeting: { country: ['UK', 'FR'] }, payload: 'Europe content' },
 *   { payload: 'Default content' }
 * ])
 *
 * await data.getPayload('content', { country: 'US' }) // 'North America content'
 * await data.getPayload('content', { country: 'UK' }) // 'Europe content'
 * ```
 *
 * @example With negation:
 * ```ts
 * DataSchema.create()
 *   .useTargeting({ platform: targetIncludes(z.string(), { withNegate: true }) })
 * ```
 */
export function targetIncludes<T extends $ZodType>(
  t: T,
  options: { withNegate?: boolean } = {},
): TargetingDescriptor<$ZodArray<T>, T> {
  return {
    predicate: (q) => (ts) =>
      q !== undefined &&
      (options.withNegate ? includesWithNegate(q, ts) : ts.includes(q)),
    queryParser: t,
    targetingParser: array(t),
  }
}

function includesWithNegate<T extends $ZodType>(
  q: output<T>,
  ts: output<T>[],
): boolean {
  const negations = ts.filter(isNegation)
  if (negations.some((t) => t === `!${q}`)) return false
  const positives = ts.filter((t) => !isNegation(t))
  return positives.length ? positives.includes(q) : negations.length > 0
}
