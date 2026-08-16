import type { DataSchema } from './DataSchema.ts'
import type { DataItemIn } from './parsers/DataItem.ts'
import type { DataItemRulesIn } from './parsers/DataItemRules.ts'

export interface CreatableData<$ extends DataSchema> {
  /**
   * Adds rules for a specific payload name.
   *
   * @template Name - The name type from available payload parsers
   * @param name - The name of the payload to add rules for
   * @param opts - The data item or rules configuration to add
   * @returns A new PromisedData instance with the added rules
   */
  addRules<
    Name extends keyof $['payloadParsers'],
  >(
    name: Name,
    opts:
      | DataItemIn<$, $['payloadParsers'][Name]>
      | DataItemRulesIn<$, $['payloadParsers'][Name]>,
  ): Promise<CreatableData<$>>
}
