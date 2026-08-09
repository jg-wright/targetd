import { DEFAULT_KEY_PREFIX, type RedisClient } from './client.ts'
import type { Data, DataSchema } from '@targetd/api'

/**
 * Options for {@link load}.
 */
export interface LoadOptions {
  /**
   * Prefix applied to every key holding a payload's rules.
   * @default 'targetd:'
   */
  keyPrefix?: string
}

/**
 * Load targeting rules from Redis into a {@link Data} instance.
 *
 * Every key matching `${keyPrefix}*` is read and its JSON value added under the
 * payload name derived by stripping the prefix from the key. Each value is the
 * same shape used by `@targetd/fs` files — either an array of rules or an object
 * with `rules` (and optional `variables`).
 *
 * @param data - Base Data instance with payloads and targeting configured.
 * @param redis - A connected Redis client.
 * @param options - Optional key-prefix configuration.
 * @returns Updated Data instance with rules from all matching keys.
 *
 * @example
 * ```ts
 * import { createClient } from 'redis'
 * import { Data, DataSchema, targetIncludes } from '@targetd/api'
 * import { load } from '@targetd/redis'
 * import { z } from 'zod'
 *
 * const redis = createClient()
 * await redis.connect()
 *
 * const baseData = await Data.create(
 *   DataSchema.create()
 *     .usePayload({ greeting: z.string() })
 *     .useTargeting({ country: targetIncludes(z.string()) }),
 * )
 *
 * const data = await load(baseData, redis)
 * ```
 */
export async function load<$ extends DataSchema>(
  data: Data<$>,
  redis: RedisClient,
  options: LoadOptions = {},
): Promise<Data<$>> {
  const keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX

  // Rules are first-match-wins. Different payload names are independent, but a
  // stable order keeps behaviour deterministic regardless of keyspace layout.
  const keys = (await redis.keys(`${keyPrefix}*`))
    .filter((key) => key.startsWith(keyPrefix))
    .sort((a, b) => a.localeCompare(b))

  let result = data

  for (const key of keys) {
    const raw = await redis.get(key)
    // A key can disappear between KEYS and GET (expiry, deletion). Skip it.
    if (raw === null) continue
    result = await addStoredRules(result, key.slice(keyPrefix.length), raw, key)
  }

  return result
}

/**
 * Parse a stored JSON value and add it to the Data instance under `name`.
 */
function addStoredRules<$ extends DataSchema>(
  data: Data<$>,
  name: string,
  raw: string,
  key: string,
): Promise<Data<$>> {
  let value: any
  try {
    value = JSON.parse(raw)
  } catch (cause) {
    throw new Error(
      `Cannot parse rules for "${name}" at ${key}: invalid JSON`,
      { cause },
    )
  }

  // null is always a mistake (an empty stub), mirroring @targetd/fs.
  if (value === null) {
    throw new Error(`Cannot add rules for "${name}" at ${key}: value is null`)
  }

  if (typeof value !== 'object') {
    throw new Error(
      `Cannot add rules for "${name}" at ${key}: expected an array of rules or an object with a "rules" array`,
    )
  }

  return data.addRules(name, value)
}
