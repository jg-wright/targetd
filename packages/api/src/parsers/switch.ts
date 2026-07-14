import { safeParse, safeParseAsync, union } from 'zod/mini'
import {
  $constructor,
  type $ZodCustomDef,
  type $ZodCustomInternals,
  type $ZodRawIssue,
  $ZodType,
  type $ZodType as $ZodTypeType,
  type $ZodUnion,
  NEVER,
  type ParsePayload,
} from 'zod/v4/core'

/**
 * A tuple array representing switch case mappings.
 * Each entry is a [condition, parser] pair where the condition determines which parser to use.
 */
export type $ZodSwitchMap = [condition: $ZodTypeType, parser: $ZodTypeType][]

/**
 * Definition for a ZodSwitch schema.
 * Extends the base custom def with a switchMap and precomputed union.
 */
export interface ZodSwitchDef extends $ZodCustomDef {
  switchMap: $ZodSwitchMap
  union: $ZodUnion
}

/**
 * Internal state for a ZodSwitch schema.
 */
export interface ZodSwitchInternals<O = unknown, I = unknown>
  extends $ZodCustomInternals<O, I> {
  def: ZodSwitchDef
}

/**
 * A Zod schema that evaluates conditions and applies the corresponding parser.
 * The union metadata is stored directly on the instance (no external registry).
 *
 * @template SwitchMap - The switch map defining condition-parser pairs
 */
export interface ZodSwitch<SwitchMap extends $ZodSwitchMap = $ZodSwitchMap>
  extends $ZodType {
  _zod: ZodSwitchInternals<
    SwitchMap[number][1]['_zod']['output'],
    SwitchMap[number][1]['_zod']['input']
  >
}

export const ZodSwitch: $constructor<ZodSwitch> = $constructor(
  'ZodSwitch',
  (inst, def) => {
    $ZodType.init(inst, def)
    // The async variant exists because sync safeParse throws on parsers
    // with async refinements; which one runs is decided by the parse
    // context so sync callers keep working unchanged.
    inst._zod.parse = (payload, ctx) =>
      ctx.async ? parseSwitchAsync(def, payload) : parseSwitchSync(def, payload)
  },
)

function parseSwitchSync(
  def: ZodSwitchDef,
  payload: ParsePayload,
): ParsePayload {
  const input = payload.value
  let unfoundIssue = noMatchingConditionIssue(input)
  payload.value = NEVER
  for (const [condition, parser] of def.switchMap) {
    const conditionResult = safeParse(condition, input)
    if (conditionResult.success) unfoundIssue = undefined
    else continue
    applyCaseResult(payload, input, safeParse(parser, input))
    break
  }
  if (unfoundIssue) payload.issues.push(unfoundIssue)
  return payload
}

async function parseSwitchAsync(
  def: ZodSwitchDef,
  payload: ParsePayload,
): Promise<ParsePayload> {
  const input = payload.value
  let unfoundIssue = noMatchingConditionIssue(input)
  payload.value = NEVER
  for (const [condition, parser] of def.switchMap) {
    const conditionResult = await safeParseAsync(condition, input)
    if (conditionResult.success) unfoundIssue = undefined
    else continue
    applyCaseResult(payload, input, await safeParseAsync(parser, input))
    break
  }
  if (unfoundIssue) payload.issues.push(unfoundIssue)
  return payload
}

function noMatchingConditionIssue(input: unknown): $ZodRawIssue | undefined {
  return {
    code: 'custom',
    input,
    message: 'no matching condition',
  }
}

function applyCaseResult(
  payload: ParsePayload,
  input: unknown,
  parseResult: ReturnType<typeof safeParse>,
) {
  if (parseResult.success) {
    payload.value = parseResult.data
  } else {
    for (const issue of parseResult.error.issues) {
      payload.issues.push({
        ...issue,
        input: input as any,
      })
    }
  }
}

/**
 * Check if a Zod schema is a ZodSwitch instance.
 */
export function isZodSwitch(parser: $ZodTypeType): parser is ZodSwitch {
  return parser instanceof ZodSwitch
}

/**
 * Create a conditional Zod parser that evaluates different schemas based on conditions.
 * Similar to a switch statement, it tests each condition and applies the corresponding parser.
 *
 * @param switchMap - Array of [condition, parser] tuples to evaluate in order.
 * @returns A Zod schema that conditionally validates based on the switch map.
 *
 * @example
 * ```ts
 * import { zodSwitch } from '@targetd/api'
 * import { z } from 'zod'
 *
 * const paymentSchema = zodSwitch([
 *   [z.object({ type: z.literal('card') }), z.object({ cardNumber: z.string(), cvv: z.string() })],
 *   [z.object({ type: z.literal('paypal') }), z.object({ email: z.string().email() })],
 *   [z.object({ type: z.literal('bank') }), z.object({ accountNumber: z.string(), routing: z.string() })]
 * ])
 * ```
 */
export function zodSwitch<SwitchMap extends $ZodSwitchMap>(
  switchMap: SwitchMap,
): ZodSwitch<SwitchMap> {
  return new ZodSwitch({
    type: 'custom',
    check: 'custom',
    fn: () => true,
    abort: true,
    switchMap,
    union: union(switchMap.map(([, type]) => type)) as $ZodUnion,
  }) as ZodSwitch<SwitchMap>
}
