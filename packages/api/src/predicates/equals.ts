import type TargetingDescriptor from '../parsers/TargetingDescriptor.ts'
import type { $ZodType } from 'zod/v4/core'
import { isNegation } from './negation.ts'

/**
 * Create a targeting descriptor that matches when the query value exactly equals the targeting value.
 *
 * @param t - Zod schema for both query and targeting values.
 * @param options - Configuration options.
 * @param options.withNegate - Enable negation support (e.g., `!value` to exclude).
 * @returns A targeting descriptor with exact equality matching.
 *
 * @example
 * ```ts
 * import { Data, DataSchema, targetEquals } from '@targetd/api'
 * import { z } from 'zod'
 *
 * const data = await Data.create(
 *   DataSchema.create()
 *     .usePayload({ feature: z.string() })
 *     .useTargeting({ isPremium: targetEquals(z.boolean()) }),
 * ).addRules('feature', [
 *   { targeting: { isPremium: true }, payload: 'Premium feature' },
 *   { payload: 'Basic feature' }
 * ])
 *
 * await data.getPayload('feature', { isPremium: true }) // 'Premium feature'
 * ```
 *
 * @example With negation:
 * ```ts
 * DataSchema.create()
 *   .useTargeting({ environment: targetEquals(z.string(), { withNegate: true }) })
 * ```
 */
export function targetEquals<T extends $ZodType>(
  t: T,
  options: { withNegate?: boolean } = {},
): TargetingDescriptor<T, T> {
  return {
    predicate: (q) => (t) =>
      options.withNegate && isNegation(t) ? t !== `!${q}` : q === t,
    queryParser: t,
    targetingParser: t,
  }
}
