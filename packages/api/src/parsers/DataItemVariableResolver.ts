import {
  pipe,
  string,
  templateLiteral,
  transform,
  type ZodMiniPipe,
  type ZodMiniString,
  type ZodMiniTemplateLiteral,
  type ZodMiniTransform,
} from 'zod/mini'
import type {
  $PartsToTemplateLiteral,
  $ZodType,
  ParsePayload,
} from 'zod/v4/core'
import { objectMap } from '../util.ts'
import type { VariablesRegistry } from './variablesRegistry.ts'

export const variableStringParser = () =>
  templateLiteral(['{{', string(), '}}'])

export type VariableStringParser = ZodMiniTemplateLiteral<`{{${string}}}`>

export function DataItemVariableResolverParser(
  registry: VariablesRegistry,
  parser: $ZodType,
): DataItemVariableResolverParser {
  return pipe(
    variableStringParser(),
    transform((input, ctx) =>
      stringToVariableResolver(registry, parser, input, ctx)
    ),
  )
}

export function DataItemVariableResolverTransformer<T extends string>(
  registry: VariablesRegistry,
  parser: $ZodType,
  input: T,
  ctx: ParsePayload,
): T extends VariableString ? VariableResolver : T {
  return isVariableString(input)
    ? stringToVariableResolver(registry, parser, input, ctx) as any
    : input as any
}

export type DataItemVariableResolverParser = ZodMiniPipe<
  ZodMiniTemplateLiteral<
    $PartsToTemplateLiteral<
      ['{{', ZodMiniString<string>, '}}']
    >
  >,
  ZodMiniTransform<
    VariableResolver,
    `{{${string}}}`
  >
>

export interface VariableResolver {
  (
    variables: Record<string, any>,
    keepUnresolved?: ReadonlySet<string>,
  ): any
  $$resolver$$: true
}

export function isVariableResolver(x: unknown): x is VariableResolver {
  return typeof x === 'function' && '$$resolver$$' in x &&
    x.$$resolver$$ === true
}

/**
 * Substitute variable resolvers within a payload with their values.
 *
 * @param variables - Resolved variable values by name.
 * @param x - The payload to resolve.
 * @param keepUnresolved - Variable names allowed to stay as `{{name}}`
 *   placeholders (fall-through variables that a downstream service will
 *   resolve). Any other unresolvable variable reference throws.
 */
export function resolveVariables(
  variables: Record<string, any>,
  x: unknown,
  keepUnresolved: ReadonlySet<string> = new Set(),
) {
  return Array.isArray(x)
    ? recursivelyResolveArrayVariables(variables, x, keepUnresolved)
    : typeof x === 'object' && x !== null
    ? recursivelyResolveObjectVariables(
      variables,
      x as Record<string, unknown>,
      keepUnresolved,
    )
    : resolveVariable(variables, x, keepUnresolved)
}

export function isVariableString(input: string): input is VariableString {
  return /^\{\{[^\}]+\}\}$/.test(input)
}

type VariableString = `{{${string}}}`

function resolveVariable(
  variables: Record<string, any>,
  x: unknown,
  keepUnresolved: ReadonlySet<string>,
) {
  return isVariableResolver(x) ? x(variables, keepUnresolved) : x
}

function recursivelyResolveArrayVariables(
  variables: Record<string, any>,
  x: unknown[],
  keepUnresolved: ReadonlySet<string>,
): unknown[] {
  return x.map((value) => resolveVariables(variables, value, keepUnresolved))
}

function recursivelyResolveObjectVariables(
  variables: Record<string, any>,
  x: Record<string, unknown>,
  keepUnresolved: ReadonlySet<string>,
): Record<string, unknown> {
  return objectMap(
    x,
    (value) => resolveVariables(variables, value, keepUnresolved),
  )
}

function stringToVariableResolver(
  registry: VariablesRegistry,
  parser: $ZodType,
  input: VariableString,
  ctx: ParsePayload,
): VariableResolver {
  const key = extractVariableName(input)
  const resolver: VariableResolver = (
    variables: Record<string, any>,
    keepUnresolved?: ReadonlySet<string>,
  ) => {
    // An `in` check rather than `??` so a variable legitimately resolving
    // to null or undefined is substituted, not left as a placeholder.
    if (key in variables) return variables[key]
    if (keepUnresolved?.has(key)) return input
    throw new Error(
      `Unable to resolve variable "${key}": no rule for the variable matched the query. ` +
        `Add an untargeted rule to "${key}" if a fallback value is intended.`,
    )
  }
  resolver.$$resolver$$ = true
  registry.set(key, {
    ctx,
    parser,
  })
  return resolver
}

function extractVariableName(input: string) {
  return input.slice(2).slice(0, -2)
}
