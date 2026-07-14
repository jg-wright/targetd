import type Data from './Data.ts'
import type { DataSchema } from './DataSchema.ts'
import type * as DT from './types/Data.ts'
import type * as PT from './types/Payload.ts'
import type * as QT from './types/Query.ts'
import type { DataItemRulesIn } from './parsers/DataItemRules.ts'
import type { MaybePromise } from './types.ts'
import type { DataItemIn } from './parsers/DataItem.ts'
import type { InsertableData } from './InsertableData.ts'
import type { QueryableData } from './QueryableData.ts'

/**
 * A Promise-based wrapper for Data that implements the InsertableData and
 * QueryableData interfaces. Allows chaining data and query operations on Data
 * instances that may be resolved asynchronously.
 *
 * Produced by {@link Data.create}; schema configuration lives on
 * {@link DataSchema} and happens before the PromisedData is created.
 *
 * @template $ - The {@link DataSchema} type.
 * @extends {Promise<Data<$>>}
 * @implements {InsertableData<$>}
 * @implements {QueryableData<$>}
 */
export class PromisedData<$ extends DataSchema> extends Promise<Data<$>>
  implements InsertableData<$>, QueryableData<$> {
  /**
   * Creates a new PromisedData instance.
   *
   * @param executor - A function that receives resolve and reject callbacks
   */
  constructor(
    executor: (
      resolve: (value: MaybePromise<Data<$>>) => void,
      reject: (reason?: any) => void,
    ) => void,
  ) {
    super(executor)
  }

  /**
   * Factory method to create a PromisedData instance from a Data instance or Promise.
   *
   * @template $ - The {@link DataSchema} type.
   * @param promisedData - A Data instance or a Promise that resolves to a Data instance
   * @returns A new PromisedData instance
   */
  static create<$ extends DataSchema>(
    promisedData: MaybePromise<Data<$>>,
  ): PromisedData<$> {
    return new PromisedData((resolve) => resolve(promisedData))
  }

  /**
   * Internal helper method to create a new PromisedData instance by applying a transformation.
   *
   * @param cb - Callback function that transforms the Data instance
   * @returns A new PromisedData instance with the transformed Data
   */
  #create(cb: (data: Data<$>) => MaybePromise<Data<$>>): PromisedData<$> {
    return new PromisedData((resolve) => resolve(this.then(cb)))
  }

  /**
   * Inserts data items into the dataset.
   *
   * @param insertableData - The data to insert
   * @returns A new PromisedData instance with the inserted data
   */
  insert(insertableData: DT.InsertableData<$>): PromisedData<$> {
    return this.#create((data) => data.insert(insertableData))
  }

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
  ): PromisedData<$> {
    return this.#create((data) => data.addRules(name, opts))
  }

  /**
   * Retrieves payloads for all registered payload names, optionally filtered by a query.
   *
   * @param rawQuery - Optional raw query object for filtering
   * @returns A Promise that resolves to an object containing payloads for each name
   */
  async getPayloadForEachName(
    rawQuery?: QT.Raw<$['queryParsers']>,
  ): Promise<
    PT.Payloads<$>
  > {
    const data = await this
    return data.getPayloadForEachName(rawQuery)
  }

  /**
   * Retrieves the payload for a specific name, optionally filtered by a query.
   *
   * @template Name - The name type from available payload parsers
   * @param name - The name of the payload to retrieve
   * @param rawQuery - Optional raw query object for filtering
   * @returns A Promise that resolves to the payload or undefined if not found
   */
  async getPayload<Name extends keyof $['payloadParsers']>(
    name: Name,
    rawQuery?: QT.Raw<$['queryParsers']>,
  ): Promise<
    | PT.Payload<$, $['payloadParsers'][Name]>
    | undefined
  > {
    const data = await this
    return data.getPayload(name, rawQuery)
  }

  /**
   * Retrieves all payloads for a specific name as an array, optionally filtered by a query.
   *
   * @template Name - The name type from available payload parsers
   * @param name - The name of the payloads to retrieve
   * @param rawQuery - Optional raw query object for filtering
   * @returns A Promise that resolves to an array of payloads
   */
  async getPayloads<Name extends keyof $['payloadParsers']>(
    name: Name,
    rawQuery?: QT.Raw<$['queryParsers']>,
  ): Promise<
    PT.Payload<$, $['payloadParsers'][Name]>[]
  > {
    const data = await this
    return data.getPayloads(name, rawQuery)
  }

  /**
   * Removes all rules from the Data instance.
   *
   * @returns A new PromisedData instance with all rules removed
   */
  removeAllRules(): PromisedData<$> {
    return this.#create((data) => data.removeAllRules())
  }
}
