import type { Data } from '@targetd/api'
import type { RequestHandler } from 'express'
import type { ParsedQs as $ParsedQs } from 'qs'
import type { $ZodType } from 'zod/v4/core'

/**
 * Express middleware that casts query string values to the types expected by
 * the data's query parsers. Query string values always arrive as strings, so
 * each value is cast (boolean, number, array) according to the corresponding
 * query parser's type; values whose parser expects a string are left
 * untouched. Keys without a matching parser fall back to heuristic casting.
 *
 * Requires `res.locals.data` to have been set by
 * {@link import('./resolveData.ts').resolveData}.
 *
 * @internal
 */
export function castQuery(): RequestHandler {
  return function (req, res, next) {
    const { fallThroughTargetingParsers, queryParsers } = res.locals
      .data as Data
    const query: ParsedQs = {}
    for (const [key, value] of Object.entries(req.query)) {
      // Fall-through dimensions are resolved by a downstream service, not
      // here — accept and ignore them so a client can send its full query.
      if (key in fallThroughTargetingParsers && !(key in queryParsers)) {
        continue
      }
      const casted = key in queryParsers
        ? castValueToParser(value, queryParsers[key])
        : castValueHeuristically(value)
      if (casted !== undefined) query[key] = casted
    }
    res.locals.query = query
    next()
  }
}

type ParsedQsParam =
  | $ParsedQs[string]
  | boolean
  | number
  | undefined
  | ParsedQsParam[]
  | ParsedQs

/**
 * Query object with values cast to the types expected by the query parsers.
 *
 * @internal
 */
export type ParsedQs = { [key: string]: ParsedQsParam }

function castValueToParser(
  value: $ParsedQs[string],
  parser: $ZodType,
): ParsedQsParam {
  if (value === undefined || value === '') return undefined

  const def = (parser as any)._zod.def

  switch (def.type) {
    case 'optional':
    case 'nonoptional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'readonly':
      return castValueToParser(value, def.innerType)
    case 'array':
      return (Array.isArray(value) ? value : [value]).map((item) =>
        castValueToParser(item, def.element)
      )
    case 'boolean':
      return isBooleanString(value) ? value === 'true' : value
    case 'number':
      return isNumberString(value) ? Number(value) : value
    case 'string':
    case 'enum':
    case 'literal':
    case 'template_literal':
      return value
    default:
      return castValueHeuristically(value)
  }
}

function castValueHeuristically(value: $ParsedQs[string]): ParsedQsParam {
  if (value === undefined || value === '') return undefined
  if (isBooleanString(value)) return value === 'true'
  if (Array.isArray(value)) return value.map(castValueHeuristically)
  if (typeof value === 'object') return castObjectHeuristically(value)
  if (isNumberString(value)) return Number(value)
  return value
}

function castObjectHeuristically(obj: $ParsedQs): ParsedQs {
  const result: ParsedQs = {}
  for (const [key, value] of Object.entries(obj)) {
    const casted = castValueHeuristically(value)
    if (casted !== undefined) result[key] = casted
  }
  return result
}

function isBooleanString(value: unknown): value is 'true' | 'false' {
  return value === 'true' || value === 'false'
}

function isNumberString(value: unknown): value is `${number}` {
  return typeof value === 'string' && value.trim() !== '' &&
    !Number.isNaN(Number(value))
}
