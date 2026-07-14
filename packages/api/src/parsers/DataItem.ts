import {
  _default,
  strictObject,
  type ZodMiniAny,
  type ZodMiniDefault,
  type ZodMiniObject,
} from 'zod/mini'
import type { $strict, $ZodType } from 'zod/v4/core'
import {
  type DataItemRulesIn,
  type DataItemRulesOut,
  DataItemRulesParser,
} from './DataItemRules.ts'
import { DataItemVariablesParser } from './DataItemVariablesParser.ts'
import { createVariablesRegistry } from './variablesRegistry.ts'
import type { DataSchema } from '../DataSchema.ts'

/**
 * Parses an "item".
 *
 * An item, within the Data class, contains all the details of that piece
 * of data.
 *
 * @remarks
 * Currently this is just restricted to `rules`.
 */
export function DataItemParser<
  $ extends DataSchema,
  PayloadParser extends $ZodType,
>(
  Payload: PayloadParser,
  targeting: $['targetingParsers'],
  fallThroughTargeting: $['fallThroughTargetingParsers'],
  strictTargeting: boolean,
): DataItemParser<$, PayloadParser> {
  const variablesRegistry = createVariablesRegistry()
  return strictObject({
    rules: DataItemRulesParser(
      variablesRegistry,
      Payload,
      targeting,
      fallThroughTargeting,
      strictTargeting,
    ),
    variables: _default(
      DataItemVariablesParser(
        variablesRegistry,
        targeting,
        fallThroughTargeting,
        strictTargeting,
      ),
      {},
    ),
  })
}

/**
 * Zod parser type for a single data item with rules and variables.
 *
 * @template $ - Data schema
 * @template PayloadParser - Zod parser for the payload type.
 */
export type DataItemParser<
  $ extends DataSchema,
  PayloadParser extends $ZodType,
> = ZodMiniObject<
  {
    rules: DataItemRulesParser<$, PayloadParser>
    variables: ZodMiniDefault<DataItemVariablesParser<$>>
  },
  $strict
>

/**
 * The data shape expected for {@link DataItemParser} inputs.
 */
export interface DataItemIn<
  $ extends DataSchema,
  PayloadParser extends $ZodType,
> {
  rules: DataItemRulesIn<$, PayloadParser>
  variables?: Record<
    string,
    DataItemRulesIn<$, ZodMiniAny>
  >
}

/**
 * The data shape expected for {@link DataItemParser} outputs.
 */
export interface DataItemOut<
  $ extends DataSchema,
  PayloadParser extends $ZodType,
> {
  rules: DataItemRulesOut<$, PayloadParser>
  variables: Record<
    string,
    DataItemRulesOut<$, ZodMiniAny>
  >
}
