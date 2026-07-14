import {
  array,
  object,
  optional,
  partial,
  strictObject,
  union,
  type ZodMiniArray,
  type ZodMiniObject,
  type ZodMiniOptional,
  type ZodMiniUnion,
} from 'zod/mini'
import type { ZodPartialObject } from '../types.ts'
import type { $strict, $ZodShape, $ZodType, input, output } from 'zod/v4/core'
import {
  attachVariableResolver,
  type RecursiveVariableResolver,
} from './attachVariableResolver.ts'
import type { VariablesRegistry } from './variablesRegistry.ts'
import type { DataSchema } from '../DataSchema.ts'

/**
 * Parses a single item rule.
 *
 * @example
 * Payload only rules
 * ```ts
 * import { equal, assertThrows } from 'jsr:@std/assert'
 * import { z } from 'zod/mini'
 * import { createVariablesRegistry } from './variablesRegistry.ts'
 * const dataItemRuleParser = DataItemRuleParser(
 *   createVariablesRegistry(),
 *   z.number(),
 *   {},
 *   {}
 * )
 * equal(
 *   z.parse(dataItemRuleParser, { payload: 123 }),
 *   { payload: 123 }
 * )
 * assertThrows(() => z.parse(dataItemRuleParser, {}))
 * assertThrows(() => z.parse(dataItemRuleParser, { payload: '123' }))
 * ```
 *
 * With targeting.
 * ```ts
 * import { equal } from 'jsr:@std/assert'
 * import { z } from 'zod/mini'
 * const dataItemRuleParser = DataItemRuleParser(
 *   createVariablesRegistry(),
 *   z.number(),
 *   { foo: z.array(z.string()) },
 *   {}
 * )
 * equal(
 *   z.parse(dataItemRuleParser, {
 *     targeting: { foo: ['bar'] },
 *     payload: 123
 *   }),
 *   {
 *     targeting: { foo: ['bar'] },
 *     payload: 123
 *   }
 * )
 * ```
 *
 * With fall through targeting:
 * ```ts
 * import { assertThrows, equal } from 'jsr:@std/assert'
 * import { z } from 'zod/mini'
 * const dataItemRuleParser = DataItemRuleParser(
 *   createVariablesRegistry(),
 *   z.number(),
 *   {},
 *   { foo: z.array(z.string()) },
 * )
 * equal(
 *   z.parse(dataItemRuleParser, {
 *     fallThrough: [{ targeting: { foo: ['bar'] }, payload: 123 }],
 *   }),
 *   {
 *     fallThrough: [{ targeting: { foo: ['bar'] }, payload: 123 }],
 *   }
 * )
 * assertThrows(() => z.parse(dataItemRuleParser, {
 *   targeting: { foo: ['bar'] },
 *   fallThrough: [{ payload: 123 }]
 * }))
 * ```
 */
export function DataItemRuleParser<
  $ extends DataSchema,
  PayloadParser extends $ZodType,
  VariableRegistry extends Record<string, any>,
  AllowMultipleTargeting extends boolean = true,
>(
  variablesRegistry: VariablesRegistry,
  Payload: PayloadParser,
  targeting: $['targetingParsers'],
  fallThroughTargeting: $['fallThroughTargetingParsers'],
  allowMultipleTargeting = true,
): DataItemRuleParser<
  $,
  PayloadParser,
  AllowMultipleTargeting
> {
  const Rule = RuleWithPayloadParser(
    variablesRegistry,
    Payload,
    targeting,
    allowMultipleTargeting,
  )

  const FallThroughRule = RuleWithFallThroughParser(
    variablesRegistry,
    Payload,
    targeting,
    fallThroughTargeting,
    allowMultipleTargeting,
  )

  return union([Rule, FallThroughRule]) as DataItemRuleParser<
    $,
    PayloadParser,
    AllowMultipleTargeting
  >
}

export type DataItemRuleParser<
  $ extends DataSchema,
  PayloadParser extends $ZodType,
  AllowMultipleTargeting extends boolean = true,
> = ZodMiniUnion<
  [
    RuleWithPayloadParser<$, PayloadParser, AllowMultipleTargeting>,
    RuleWithFallThroughParser<$, PayloadParser, AllowMultipleTargeting>,
  ]
>

/**
 * Represents a single targeting rule which can be either a direct payload rule or a fallthrough rule.
 *
 * @template $ - Data meta configuration.
 * @template PayloadParser - Zod parser for the payload type.
 * @template AllowMultipleTargeting - Whether multiple targeting values are allowed.
 */
export type DataItemRule<
  $ extends DataSchema,
  PayloadParser extends $ZodType,
  AllowMultipleTargeting extends boolean = true,
> =
  | RuleWithPayload<
    PayloadParser,
    $['targetingParsers'],
    AllowMultipleTargeting
  >
  | RuleWithFallThrough<$, PayloadParser, AllowMultipleTargeting>

type SingularRuleTargeting<Targeting extends $ZodShape> = ZodPartialObject<
  Targeting,
  $strict
>

function SingularRuleTargeting<Targeting extends $ZodShape>(
  targeting: Targeting,
  strict: boolean,
): SingularRuleTargeting<Targeting> {
  return partial((strict ? strictObject : object)(targeting))
}

type MultipleRuleTargeting<Targeting extends $ZodShape> = ZodMiniUnion<
  [
    ZodPartialObject<Targeting, $strict>,
    ZodMiniArray<ZodPartialObject<Targeting, $strict>>,
  ]
>

function MultipleRuleTargeting<Targeting extends $ZodShape>(
  targeting: Targeting,
  strict: boolean,
): MultipleRuleTargeting<Targeting> {
  const t = SingularRuleTargeting(targeting, strict)
  return union([t, array(t)])
}

/**
 * Zod parser type for rules with direct payload values.
 * Handles optional targeting conditions and payload parsing.
 *
 * @template $ - Data meta configuration with TargetingParsers.
 * @template Payload - Zod parser for the payload type.
 * @template AllowMultipleTargeting - Whether multiple targeting values are allowed.
 */
export type RuleWithPayloadParser<
  $ extends Pick<DataSchema, 'targetingParsers'>,
  Payload extends $ZodType,
  AllowMultipleTargeting extends boolean = true,
> = ZodMiniObject<
  {
    payload: RecursiveVariableResolver<Payload>
    targeting: ZodMiniOptional<
      AllowMultipleTargeting extends true
        ? MultipleRuleTargeting<$['targetingParsers']>
        : SingularRuleTargeting<$['targetingParsers']>
    >
  },
  $strict
>

/**
 * Creates a Zod parser for rules with direct payload values.
 * Handles targeting conditions and payload parsing with variable resolution.
 *
 * @template $ - Data schema
 * @template PayloadParser - Zod parser for the payload type.
 * @template AllowMultipleTargeting - Whether multiple targeting values are allowed.
 */
export function RuleWithPayloadParser<
  $ extends DataSchema,
  PayloadParser extends $ZodType,
  AllowMultipleTargeting extends boolean = true,
>(
  variablesRegistry: VariablesRegistry,
  Payload: PayloadParser,
  targeting: $['targetingParsers'] & $['fallThroughTargetingParsers'],
  strictTargeting: boolean,
  allowMultipleTargeting = true as AllowMultipleTargeting,
): RuleWithPayloadParser<$, PayloadParser, AllowMultipleTargeting> {
  return strictObject({
    payload: attachVariableResolver(variablesRegistry, Payload),
    targeting: optional(
      allowMultipleTargeting
        ? MultipleRuleTargeting(targeting, strictTargeting)
        : SingularRuleTargeting(targeting, strictTargeting),
    ),
  }) as RuleWithPayloadParser<$, PayloadParser, AllowMultipleTargeting>
}

/**
 * Input type for rule parsers that accept rules with payloads.
 * Used before transformation to fallthrough structure.
 *
 * @template $ - Data meta configuration.
 * @template PayloadParser - Zod parser for the payload type.
 * @template AllowMultipleTargeting - Whether multiple targeting values are allowed.
 *
 * @see https://github.com/colinhacks/zod/issues/4698
 */
export interface RuleWithPayloadIn<
  $ extends DataSchema,
  PayloadParser extends $ZodType,
  AllowMultipleTargeting extends boolean = true,
> {
  payload: input<RecursiveVariableResolver<PayloadParser>>
  targeting?: input<
    AllowMultipleTargeting extends true ? MultipleRuleTargeting<
        $['targetingParsers'] & $['fallThroughTargetingParsers']
      >
      : SingularRuleTargeting<
        $['targetingParsers'] & $['fallThroughTargetingParsers']
      >
  >
}

/**
 * A targeting rule with a direct payload value.
 * Represents the simplest form of a rule with optional targeting conditions.
 *
 * @template PayloadParser - Zod parser for the payload type.
 * @template TargetingParsers - Zod shape for targeting fields.
 * @template AllowMultipleTargeting - Whether multiple targeting values are allowed.
 *
 * @see https://github.com/colinhacks/zod/issues/4698
 */
export interface RuleWithPayload<
  Payload extends $ZodType,
  Targeting extends $ZodShape,
  AllowMultipleTargeting extends boolean = true,
> {
  payload: output<Payload>
  targeting?: output<
    AllowMultipleTargeting extends true ? MultipleRuleTargeting<Targeting>
      : SingularRuleTargeting<Targeting>
  >
}

export type RuleWithFallThroughParser<
  $ extends DataSchema,
  PayloadParser extends $ZodType,
  AllowMultipleTargeting extends boolean = true,
> = ZodMiniObject<
  {
    targeting: ZodMiniOptional<
      AllowMultipleTargeting extends true
        ? MultipleRuleTargeting<$['targetingParsers']>
        : SingularRuleTargeting<$['targetingParsers']>
    >
    fallThrough: ZodMiniArray<
      RuleWithPayloadParser<
        $,
        PayloadParser,
        AllowMultipleTargeting
      >
    >
  },
  $strict
>

/**
 * A targeting rule that contains nested fallthrough rules instead of a direct payload.
 * Used when targeting needs to be split into primary and fallthrough conditions.
 *
 * @template $ - Data meta configuration.
 * @template PayloadParser - Zod parser for the payload type.
 * @template AllowMultipleTargeting - Whether multiple targeting values are allowed.
 *
 * @see https://github.com/colinhacks/zod/issues/4698
 */
export interface RuleWithFallThrough<
  $ extends DataSchema,
  PayloadParser extends $ZodType,
  AllowMultipleTargeting extends boolean = true,
> {
  fallThrough: RuleWithPayload<
    PayloadParser,
    $['fallThroughTargetingParsers'],
    AllowMultipleTargeting
  >[]
  targeting?: output<
    AllowMultipleTargeting extends true
      ? MultipleRuleTargeting<$['targetingParsers']>
      : SingularRuleTargeting<$['targetingParsers']>
  >
}

export function RuleWithFallThroughParser<
  $ extends DataSchema,
  PayloadParser extends $ZodType,
  Variables extends Record<string, any>,
  AllowMultipleTargeting extends boolean = true,
>(
  variablesRegistry: VariablesRegistry,
  payload: PayloadParser,
  targeting: $['targetingParsers'],
  fallThroughTargeting: $['fallThroughTargetingParsers'],
  strictTargeting: boolean,
  allowMultipleTargeting = true,
): RuleWithFallThroughParser<$, PayloadParser, AllowMultipleTargeting> {
  return strictObject({
    targeting: optional(
      allowMultipleTargeting
        ? MultipleRuleTargeting(targeting, strictTargeting)
        : SingularRuleTargeting(targeting, strictTargeting),
    ),
    fallThrough: array(
      RuleWithPayloadParser(
        variablesRegistry,
        payload,
        fallThroughTargeting,
        strictTargeting,
      ),
    ),
  }) as RuleWithFallThroughParser<$, PayloadParser, AllowMultipleTargeting>
}
