import {
  objectEntries,
  objectEveryAsync,
  objectFilter,
  objectKeys,
  objectMap,
  objectSize,
} from './util.ts'
import {
  type DataItemsIn,
  type DataItemsOut,
  DataItemsParser,
} from './parsers/DataItems.ts'
import type { DataItemIn, DataItemOut } from './parsers/DataItem.ts'
import type { DataItemRule } from './parsers/DataItemRule.ts'
import type { MaybeArray, MaybePromise, ZodPartialObject } from './types.ts'
import type { DataItemRulesIn } from './parsers/DataItemRules.ts'
import type * as DT from './types/Data.ts'
import type * as FTTT from './types/FallThroughTargeting.ts'
import type * as PT from './types/Payload.ts'
import type * as QT from './types/Query.ts'
import type {
  $InferObjectOutput,
  $strict,
  $ZodOptional,
  $ZodType,
  output,
} from 'zod/v4/core'
import { partial, strictObject } from 'zod/mini'
import { PromisedData } from './PromisedData.ts'
import { resolveVariables } from './parsers/DataItemVariableResolver.ts'
import type { InsertableData } from './InsertableData.ts'
import type { QueryableData } from './QueryableData.ts'
import type { DataSchema } from './DataSchema.ts'

/**
 * In-memory data store. Configure payload and targeting schemas with
 * {@link DataSchema}, then pass the schema to {@link Data.create}.
 *
 * @example
 * ```ts
 * import { z } from 'zod/mini'
 * import { Data, DataSchema, targetIncludes } from '@targetd/api'
 * import { assertEquals } from 'jsr:@std/assert'
 *
 * const schema = DataSchema.create()
 *   .usePayload({ foo: z.string() })
 *   .useTargeting({ channel: targetIncludes(z.string()) })
 *
 * const data = await Data.create(schema).addRules('foo', [
 *   {
 *     targeting: { channel: ['news'] },
 *     payload: 'bar'
 *   },
 *   {
 *     payload: 'foo'
 *   }
 * ])
 *
 * assertEquals(
 *   await data.getPayloadForEachName({ channel: 'news' }),
 *   { foo: 'bar' },
 * )
 * ```
 */
export default class Data<$ extends DataSchema = DataSchema>
  implements InsertableData<$>, QueryableData<$> {
  readonly #schema: $
  readonly #dataOut: DataItemsOut<$>
  // The pre-parse inputs behind #dataOut. Parsing transforms rules
  // (fallthrough combination, variable resolvers), and parsed output is not
  // valid parser input — so incremental addRules/insert must re-parse from
  // these raw inputs, never from #dataOut.
  readonly #dataIn: DataItemsIn<$>
  readonly #QueryParser: ZodPartialObject<$['queryParsers']>

  /**
   * Create a new empty Data instance from a {@link DataSchema}.
   *
   * @param schema - A schema produced by chaining {@link DataSchema.create} and `use*` calls.
   * @returns A PromisedData instance ready for rules, inserts, and queries.
   *
   * @example
   * ```ts
   * import { Data, DataSchema } from '@targetd/api'
   * import { z } from 'zod'
   *
   * const schema = DataSchema.create()
   *   .usePayload({ greeting: z.string() })
   *
   * const data = await Data.create(schema).addRules('greeting', [
   *   { payload: 'Hello!' },
   * ])
   * ```
   */
  static create<$ extends DataSchema>(
    schema: $,
  ): PromisedData<$> {
    return PromisedData.create(
      new Data<$>(schema, {} as DataItemsOut<$>, {}),
    )
  }

  /**
   * @see {@link Data.create}
   */
  private constructor(
    schema: $,
    dataOut: DataItemsOut<$>,
    dataIn: DataItemsIn<$>,
  ) {
    this.#schema = schema
    this.#dataOut = deepFreeze(dataOut)
    this.#dataIn = Object.freeze(dataIn)
    this.#QueryParser = partial(
      strictObject(schema.queryParsers),
    ) as ZodPartialObject<$['queryParsers']>
  }

  /**
   * Get the schema used to configure this Data instance.
   */
  get schema(): $ {
    return this.#schema
  }

  /**
   * Get all data items including rules and variables.
   *
   * @returns The complete data structure with all rules and variables.
   *   The structure is deeply frozen — mutating it throws.
   */
  get data(): DataItemsOut<$> {
    return this.#dataOut
  }

  /**
   * Get all registered payload parsers (Zod schemas).
   *
   * @returns Object mapping payload names to their Zod schemas.
   */
  get payloadParsers(): $['payloadParsers'] {
    return this.#schema.payloadParsers
  }

  /**
   * Get all registered targeting predicates.
   *
   * @returns Object mapping targeting keys to their predicate functions and configuration.
   */
  get targetingPredicates(): $['targetingPredicates'] {
    return this.#schema.targetingPredicates
  }

  /**
   * Get all registered targeting parsers (Zod schemas for rule targeting).
   *
   * @returns Object mapping targeting keys to their Zod schemas.
   */
  get targetingParsers(): $['targetingParsers'] {
    return this.#schema.targetingParsers
  }

  /**
   * Get all registered query parsers (Zod schemas for query parameters).
   *
   * @returns Object mapping query parameter names to their Zod schemas.
   */
  get queryParsers(): $['queryParsers'] {
    return this.#schema.queryParsers
  }

  /**
   * Get the combined query parser with all query parameters as optional.
   *
   * @returns Zod schema that validates query objects.
   */
  get QueryParser(): ZodPartialObject<$['queryParsers'], $strict> {
    return this.#QueryParser
  }

  /**
   * Get all registered fall-through targeting parsers.
   *
   * @returns Object mapping fall-through targeting keys to their Zod schemas.
   */
  get fallThroughTargetingParsers(): $['fallThroughTargetingParsers'] {
    return this.#schema.fallThroughTargetingParsers
  }

  /**
   * Insert data from another Data instance or add new rules. Commonly used with fall-through targeting
   * to pass unresolved rules between services.
   *
   * @param data - Object mapping payload names to values or __rules__ structures from another Data instance.
   * @returns A new Data instance with the inserted data.
   *
   * @example
   * ```ts
   * const result = await data.getPayload('message', { channel: 'mobile' })
   * // result may contain { __rules__: [...], __variables__: {...} }
   *
   * const updated = await receivingData.insert({
   *   message: result
   * })
   * ```
   */
  async insert(data: DT.InsertableData<$>): Promise<Data<$>> {
    const newDataInItems: Record<string, unknown> = {}

    for (const [name, value] of Object.entries(data)) {
      const dataInItem = (this.#dataIn as Record<string, any>)[name] ||
        {
          rules: [],
          variables: {},
        }
      newDataInItems[name] = {
        rules: [
          ...dataInItem.rules,
          ...this.#isFallThroughRulesPayload(value!)
            ? value.__rules__
            : [{ payload: value }],
        ],
        variables: {
          ...dataInItem.variables,
          ...this.#isFallThroughRulesPayload(value!) ? value.__variables__ : {},
        },
      }
    }

    const dataOut = {
      ...this.#dataOut,
      ...(await DataItemsParser(
        this.#schema.payloadParsers,
        this.#schema.targetingParsers,
        this.#schema.fallThroughTargetingParsers,
      ).parseAsync(newDataInItems)),
    }

    return new Data(this.#schema, dataOut, {
      ...this.#dataIn,
      ...newDataInItems as DataItemsIn<$>,
    })
  }

  // Duck-typed on the envelope structure: __rules__ must be an array of
  // rule-shaped values, so a genuine payload merely containing a __rules__
  // key is not mistaken for an envelope.
  readonly #isFallThroughRulesPayload = <
    Name extends keyof $['payloadParsers'],
  >(
    payload: PT.Payload<$, $['payloadParsers'][Name]>,
  ): payload is FTTT.Rules<$, $['payloadParsers'][Name]> =>
    typeof payload === 'object' && payload !== null &&
    Array.isArray((payload as Record<string, unknown>).__rules__) &&
    ((payload as Record<string, unknown>).__rules__ as unknown[]).every(
      isRuleShaped,
    )

  /**
   * Add targeting rules for a specific payload. Rules are evaluated in order—first match wins.
   *
   * @param name - The name of the payload to add rules for.
   * @param opts - Array of rules, or object with `rules` and optional `variables`.
   * @returns A new Data instance with the rules added.
   *
   * @example
   * ```ts
   * const data = await Data.create(
   *   DataSchema.create()
   *     .usePayload({ greeting: z.string() })
   *     .useTargeting({ country: targetIncludes(z.string()) }),
   * ).addRules('greeting', [
   *   { targeting: { country: ['US'] }, payload: 'Hello!' },
   *   { targeting: { country: ['ES'] }, payload: '¡Hola!' },
   *   { payload: 'Hi!' } // default fallback
   * ])
   * ```
   *
   * @example With variables:
   * ```ts
   * .addRules('config', {
   *   variables: {
   *     featureEnabled: [
   *       { targeting: { country: ['US'] }, payload: true },
   *       { payload: false }
   *     ]
   *   },
   *   rules: [
   *     { payload: { enabled: '{{featureEnabled}}' } }
   *   ]
   * })
   * ```
   */
  async addRules<
    Name extends keyof $['payloadParsers'],
  >(
    name: Name,
    opts:
      | DataItemIn<$, $['payloadParsers'][Name]>
      | DataItemRulesIn<$, $['payloadParsers'][Name]>,
  ): Promise<Data<$>> {
    const dataInItem = (this.#dataIn as Record<string, any>)[name as string] ||
      {
        rules: [],
        variables: {},
      }

    const rules = Array.isArray(opts) ? opts : opts.rules
    const variables = Array.isArray(opts) ? {} : opts.variables

    const newDataInItem = {
      rules: [...dataInItem.rules, ...rules],
      variables: {
        ...dataInItem.variables,
        ...variables,
      },
    }

    const dataOut = {
      ...this.#dataOut,
      ...(await DataItemsParser(
        this.#schema.payloadParsers,
        this.#schema.targetingParsers,
        this.#schema.fallThroughTargetingParsers,
      ).parseAsync({
        [name]: newDataInItem,
      })),
    }

    return new Data(this.#schema, dataOut, {
      ...this.#dataIn,
      [name]: newDataInItem,
    })
  }

  /**
   * Remove all rules from the Data instance while keeping payload parsers, targeting, and queries.
   *
   * @returns A new Data instance with all rules removed.
   *
   * @example
   * ```ts
   * const emptyData = data.removeAllRules()
   * // Parsers and targeting are preserved, but no rules remain
   * ```
   */
  removeAllRules(): Data<$> {
    return new Data(this.#schema, {} as DataItemsOut<$>, {})
  }

  /**
   * Get payloads for all registered payload names at once.
   *
   * @param rawQuery - Optional query object with targeting parameters.
   * @returns Object mapping all payload names to their matched payloads.
   *
   * @example
   * ```ts
   * const allPayloads = await data.getPayloadForEachName({ country: 'US' })
   * // Returns: { greeting: 'Hello!', feature: {...}, ... }
   * ```
   */
  async getPayloadForEachName(
    rawQuery: QT.Raw<$['queryParsers']> = {},
  ): Promise<PT.Payloads<$>> {
    const payloads = {} as PT.Payloads<$>
    // One parsed query and predicate set shared across every payload name
    const predicate = await this.#createRulePredicate(rawQuery)

    await Promise.all(
      objectKeys(this.#dataOut).map(async (name) => {
        payloads[name] = await this.#getPayloadWithPredicate(name, predicate)
      }),
    )

    return payloads
  }

  /**
   * Get the first matching payload for a specific name based on targeting rules.
   * Rules are evaluated in order—first match wins.
   *
   * @param name - The name of the payload to retrieve.
   * @param rawQuery - Optional query object with targeting parameters.
   * @returns The matched payload, or undefined if no rule matched.
   *
   * @example
   * ```ts
   * const greeting = await data.getPayload('greeting', { country: 'US' })
   * // Returns: 'Hello!'
   *
   * const defaultGreeting = await data.getPayload('greeting')
   * // Returns: 'Hi!' (default fallback)
   * ```
   *
   * @example With fall-through targeting:
   * ```ts
   * const result = await data.getPayload('message', { channel: 'mobile' })
   * // May return: { __rules__: [...], __variables__: {...} }
   * // if region targeting cannot be resolved
   * ```
   */
  async getPayload<Name extends keyof $['payloadParsers']>(
    name: Name,
    rawQuery: QT.Raw<$['queryParsers']> = {},
  ): Promise<
    | PT.Payload<$, $['payloadParsers'][Name]>
    | undefined
  > {
    return this.#getPayloadWithPredicate(
      name,
      await this.#createRulePredicate(rawQuery),
    )
  }

  async #getPayloadWithPredicate<Name extends keyof $['payloadParsers']>(
    name: Name,
    predicate: (
      rule: DataItemRule<$, $['payloadParsers'][Name]>,
    ) => Promise<boolean>,
  ): Promise<
    | PT.Payload<$, $['payloadParsers'][Name]>
    | undefined
  > {
    const targetableItem = this.#getTargetableItem(name)
    let payload:
      | PT.Payload<$, $['payloadParsers'][Name]>
      | undefined

    for (const rule of targetableItem.rules) {
      if (await predicate(rule)) {
        payload = this.#mapRule(rule)
        break
      }
    }

    if (payload === undefined) return

    const variables = await this.#getVariables(targetableItem, predicate)
    return this.#resolvePayloadVariables<Name>(payload, variables)
  }

  /**
   * Resolves what variables it can within a payload. Variables that depend on
   * fall-through targeting cannot be resolved yet — they are carried in a
   * `__variables__` envelope for the receiving service to resolve, never
   * substituted into the payload raw.
   */
  #resolvePayloadVariables<Name extends keyof $['payloadParsers']>(
    payload: PT.Payload<$, $['payloadParsers'][Name]>,
    variables: Record<string, any>,
  ): PT.Payload<$, $['payloadParsers'][Name]> {
    const resolvableVariables = objectFilter(
      variables,
      (value) => !this.#isFallThroughRulesPayload(value),
    )
    const nonResolvableVariables = objectFilter(
      variables,
      this.#isFallThroughRulesPayload,
    )
    const resolvedPayload = resolveVariables(
      resolvableVariables,
      payload,
      new Set(objectKeys(nonResolvableVariables)),
    )

    return objectSize(nonResolvableVariables)
      ? {
        __variables__: objectMap(
          nonResolvableVariables,
          (value) => value.__rules__,
        ),
        __rules__: this.#isFallThroughRulesPayload(resolvedPayload)
          ? resolvedPayload.__rules__
          : [{ payload: resolvedPayload }],
      }
      : resolvedPayload
  }

  async #getVariables<Name extends keyof $['payloadParsers']>(
    targetableItem: DataItemOut<$, $['payloadParsers'][Name]>,
    predicate: (
      rule: DataItemRule<$, $['payloadParsers'][Name]>,
    ) => Promise<boolean>,
  ) {
    const variables: Record<string, any> = {}
    if (objectSize(targetableItem.variables)) {
      for (
        const [variableName, rules] of objectEntries(targetableItem.variables)
      ) {
        for (const rule of rules) {
          if (await (predicate(rule))) {
            variables[variableName] = this.#mapRule(rule)
            break
          }
        }
      }
    }
    return variables
  }

  /**
   * Get all matching payloads for a specific name (not just the first match).
   * Useful for debugging or when you need to see all rules that match a query.
   *
   * @param name - The name of the payload to retrieve.
   * @param rawQuery - Optional query object with targeting parameters.
   * @returns Array of all matched payloads.
   *
   * @example
   * ```ts
   * const allMatches = await data.getPayloads('feature', { country: 'US' })
   * // Returns: ['Premium US feature', 'US feature']
   * // (if multiple rules matched)
   * ```
   */
  async getPayloads<Name extends keyof $['payloadParsers']>(
    name: Name,
    rawQuery: QT.Raw<$['queryParsers']> = {},
  ): Promise<
    PT.Payload<$, $['payloadParsers'][Name]>[]
  > {
    const payloads: PT.Payload<$, $['payloadParsers'][Name]>[] = []
    const predicate = await this.#createRulePredicate(rawQuery)
    const targetableItem = this.#getTargetableItem(name)
    for (const rule of targetableItem.rules) {
      if (await predicate(rule as any)) {
        const mappedRule = this.#mapRule(rule)
        if (mappedRule !== undefined) {
          payloads.push(mappedRule)
        }
      }
    }
    const variables = await this.#getVariables(targetableItem, predicate)
    return payloads.map((payload) =>
      this.#resolvePayloadVariables<Name>(payload, variables)
    )
  }

  #mapRule<PayloadParser extends $ZodType>(
    rule: DataItemRule<$, PayloadParser>,
  ): PT.Payload<$, PayloadParser> | undefined {
    return hasPayload(rule)
      ? rule.payload as output<PayloadParser>
      : 'fallThrough' in rule
      ? { __rules__: rule.fallThrough } as FTTT.Rules<$, PayloadParser>
      : undefined
  }

  async #createRulePredicate<Name extends keyof $['payloadParsers']>(
    rawQuery: QT.Raw<$['queryParsers']>,
  ) {
    const query = await this.#QueryParser.parseAsync(rawQuery)

    // Built once per query and shared across every rule evaluation. Each
    // targeting predicate is created lazily on first use — descriptors'
    // predicate factories must not run for targeting keys no rule uses —
    // then memoized for the rest of the query.
    const predicates = objectMap(
      this.#schema.targetingPredicates as Record<string, {
        predicate: (...args: any[]) => any
        requiresQuery: boolean
      }>,
      (target, targetingKey) => {
        let predicate:
          | MaybePromise<(targeting: any) => MaybePromise<boolean>>
          | undefined
        return {
          predicate: () =>
            predicate ??= target.predicate(
              // Query and targeting parsers are registered from the same
              // descriptor record in DataSchema.useTargeting, so their keys
              // align by construction.
              (query as any)[targetingKey],
              query as any,
            ),
          requiresQuery: target.requiresQuery,
        }
      },
    )

    return (
      rule: DataItemRule<$, $['payloadParsers'][Name]>,
    ) =>
      (
        !('targeting' in rule) ||
        this.#targetingPredicate(
          query as any,
          rule.targeting! as any,
          predicates,
        )
      ) as Promise<boolean>
  }

  #getTargetableItem<Name extends keyof $['payloadParsers']>(name: Name) {
    return (
      (
        this.#dataOut as unknown as {
          [Name in keyof $['payloadParsers']]: DataItemOut<
            $,
            $['payloadParsers'][Name]
          >
        }
      )[name] ?? { rules: [], variables: {} }
    )
  }

  async #targetingPredicate(
    query: $InferObjectOutput<
      { [K in keyof $['queryParsers']]: $ZodOptional<$['queryParsers'][K]> },
      {}
    >,
    targeting: MaybeArray<
      $InferObjectOutput<
        {
          [K in keyof $['targetingParsers']]: $ZodOptional<
            $['targetingParsers'][K]
          >
        },
        {}
      >
    >,
    predicates: Record<
      keyof any,
      {
        predicate: () => MaybePromise<(targeting: any) => MaybePromise<boolean>>
        requiresQuery: boolean
      }
    >,
  ): Promise<boolean> {
    const targetings = Array.isArray(targeting) ? targeting : [targeting]
    for (const targeting of targetings) {
      if (
        await objectEveryAsync(
          targeting,
          async (targetingValue, targetingKey) => {
            if (
              !(targetingKey in query) &&
              predicates[targetingKey]?.requiresQuery
            ) {
              return false
            }

            if (targetingKey in predicates) {
              return (await predicates[targetingKey].predicate())(
                targetingValue,
              )
            } else {
              console.warn(`Invalid targeting property ${String(targetingKey)}`)
            }

            return false
          },
        )
      ) {
        return true
      }
    }
    return false
  }
}

function hasPayload<Payload>(x: any): x is { payload: Payload } {
  return 'payload' in x
}

function isRuleShaped(x: unknown): boolean {
  return typeof x === 'object' && x !== null &&
    ('payload' in x || 'fallThrough' in x)
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key])
    }
  }
  return value
}
