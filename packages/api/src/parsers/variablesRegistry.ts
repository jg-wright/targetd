import type { $ZodType, ParsePayload } from 'zod/v4/core'

interface VariableRegistryItem {
  parser: $ZodType
  ctx: ParsePayload
}

type VariableRegistryItems = Record<string, VariableRegistryItem>

/**
 * Collects the variable references discovered while parsing a data item's
 * rules, so the item's `variables` can be validated against the parsers of
 * the positions where each variable is used.
 *
 * One registry is created per {@link DataItemParser} instance, and parsers
 * are rebuilt for every `addRules`/`insert` call — registrations never leak
 * across parses.
 */
export interface VariablesRegistry {
  getAll(): VariableRegistryItems
  set(varName: string, item: VariableRegistryItem): void
}

export function createVariablesRegistry(): VariablesRegistry {
  const items: VariableRegistryItems = {}
  return {
    getAll: () => items,
    set: (varName, item) => {
      items[varName] = item
    },
  }
}
