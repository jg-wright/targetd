import {
  Data,
  type DataSchema,
  type PT,
  type QT,
  type QueryableData,
} from '@targetd/api'
import { queryToURLSearchParams } from './queryToURLSearchParams.ts'
import { ZodError } from 'zod'
import { ResponseError } from './ResponseError.ts'

/**
 * Type-safe HTTP client for querying @targetd/server instances.
 * Mirrors the Data API but makes HTTP requests instead of in-memory queries.
 *
 * @example
 * ```ts
 * import { Client } from '@targetd/client'
 * import { schema } from './schema.ts' // Your DataSchema definition
 *
 * const client = await Client.create('http://localhost:3000', schema)
 *
 * const greeting = await client.getPayload('greeting', { country: 'US' })
 * const allPayloads = await client.getPayloadForEachName({ country: 'US' })
 * ```
 */
export class Client<$ extends DataSchema = DataSchema>
  implements QueryableData<$> {
  readonly #baseURL: string

  readonly #data: Data<$>

  readonly #init?: RequestInit

  /**
   * Create a new Client instance from a {@link DataSchema}.
   *
   * @param baseURL - The base URL of the @targetd/server instance.
   * @param schema - DataSchema used to validate queries and parse responses.
   * @param init - Optional fetch RequestInit options to apply to all requests.
   *
   * @example
   * ```ts
   * const client = await Client.create('http://localhost:3000', schema, {
   *   headers: { 'Authorization': 'Bearer token' },
   * })
   * ```
   */
  static async create<$ extends DataSchema>(
    baseURL: string,
    schema: $,
    init?: RequestInit,
  ): Promise<Client<$>> {
    return new Client<$>(baseURL, await Data.create(schema), init)
  }

  /**
   * @see {@link Client.create}
   */
  constructor(
    baseURL: string,
    data: Data<$>,
    init?: RequestInit,
  ) {
    this.#baseURL = baseURL
    this.#data = data
    this.#init = init
  }

  /**
   * Fetch a single payload from the server by name.
   *
   * @param name - The name of the payload to retrieve.
   * @param rawQuery - Optional query object with targeting parameters.
   * @returns The matched payload, undefined if no rule matched, or void if not found.
   * @throws {ZodError} When query parameters fail validation.
   * @throws {ResponseError} When the server returns an error response.
   *
   * @example
   * ```ts
   * const greeting = await client.getPayload('greeting', { country: 'US' })
   * // Returns: 'Hello!'
   *
   * const defaultGreeting = await client.getPayload('greeting')
   * // Returns: 'Hi!' (default fallback)
   * ```
   */
  async getPayload<Name extends keyof $['payloadParsers']>(
    name: Name,
    rawQuery?: QT.Raw<$['queryParsers']>,
  ): Promise<
    | PT.Payload<$, $['payloadParsers'][Name]>
    | undefined
  > {
    const query = this.#data.QueryParser.parse(rawQuery ?? {})
    const urlSearchParams = queryToURLSearchParams(query)
    const response = await fetch(
      `${this.#baseURL}/${encodeURIComponent(String(name))}?${urlSearchParams}`,
      {
        method: 'GET',
        ...this.#init,
      },
    )

    switch (true) {
      case response.status === 204:
        return undefined
      case response.status === 400:
        throw await validationError(response)
      case response.status !== 200:
        throw new ResponseError(response)
      default: {
        const data = await this.#data.insert({
          [name]: await response.json(),
        } as any)
        // Re-evaluate with the original query: inserted fall-through rules
        // carry targeting that is resolvable client-side
        return data.getPayload(name, rawQuery)
      }
    }
  }

  /**
   * Fetch all payloads from the server at once.
   *
   * @param rawQuery - Optional query object with targeting parameters.
   * @returns Object mapping all payload names to their matched payloads.
   *
   * @example
   * ```ts
   * const allPayloads = await client.getPayloadForEachName({ country: 'US' })
   * // Returns: { greeting: 'Hello!', feature: {...}, ... }
   * ```
   */
  async getPayloadForEachName(
    rawQuery?: QT.Raw<$['queryParsers']>,
  ): Promise<PT.Payloads<$>> {
    const query = this.#data.QueryParser.parse(rawQuery ?? {})
    const urlSearchParams = queryToURLSearchParams(query)
    const response = await fetch(`${this.#baseURL}?${urlSearchParams}`, {
      method: 'GET',
      ...this.#init,
    })

    switch (true) {
      case response.status === 400:
        throw await validationError(response)
      case response.status !== 200:
        throw new ResponseError(response)
      default: {
        const data = await this.#data.insert((await response.json()) as any)
        return data.getPayloadForEachName(rawQuery)
      }
    }
  }

  /**
   * Fetch all matching payloads from the server by name.
   *
   * @param name - The name of the payload to retrieve.
   * @param rawQuery - Optional query object with targeting parameters.
   * @returns Array of all matching payloads.
   * @throws {ZodError} When query parameters fail validation.
   * @throws {ResponseError} When the server returns an error response.
   *
   * @example
   * ```ts
   * const greetings = await client.getPayloads('greeting', { country: 'US' })
   * // Returns: ['Hello!', 'Hi!']
   * ```
   */
  async getPayloads<Name extends keyof $['payloadParsers']>(
    name: Name,
    rawQuery?: QT.Raw<$['queryParsers']>,
  ): Promise<
    PT.Payload<$, $['payloadParsers'][Name]>[]
  > {
    const query = this.#data.QueryParser.parse(rawQuery ?? {})
    const urlSearchParams = queryToURLSearchParams(query)
    const response = await fetch(
      `${this.#baseURL}/${
        encodeURIComponent(String(name))
      }/all?${urlSearchParams}`,
      {
        method: 'GET',
        ...this.#init,
      },
    )

    switch (true) {
      case response.status === 400:
        throw await validationError(response)
      case response.status !== 200:
        throw new ResponseError(response)
      default: {
        const payloads = await response.json() as any[]
        const data = await this.#data.addRules(
          name,
          payloads.map((payload) => ({ payload })) as any,
        )
        return data.getPayloads(name, rawQuery)
      }
    }
  }
}

/**
 * Turn a 400 response into the error to throw: a ZodError rebuilt from the
 * server's validation issues when the body carries them, otherwise a
 * ResponseError. The response body is cloned before reading so callers can
 * still consume `error.response`.
 */
async function validationError(response: Response): Promise<Error> {
  const body = await response.clone().json().catch(() => undefined)
  return body && Array.isArray(body.issues)
    ? new ZodError(body.issues)
    : new ResponseError(response)
}
