import { DEFAULT_KEY_PREFIX, type RedisClient } from './client.ts'

/**
 * A record of payload name to its stored rules. Each value is the same shape
 * consumed by {@link load} — either an array of rules or an object with `rules`
 * (and optional `variables`).
 */
export type StorableRules = Record<string, unknown>

/**
 * Options for {@link save} and {@link remove}.
 */
export interface SaveOptions {
  /**
   * Prefix applied to every key holding a payload's rules.
   * @default 'targetd:'
   */
  keyPrefix?: string
}

/**
 * Persist targeting rules to Redis, one key per payload name.
 *
 * Writing a key triggers a keyspace notification, so a running {@link watch}
 * subscriber reloads automatically — no explicit publish required.
 *
 * @param redis - A connected Redis client.
 * @param rules - Map of payload name to its rules (array or `{ rules, variables }`).
 * @param options - Optional key-prefix configuration.
 *
 * @example
 * ```ts
 * import { createClient } from 'redis'
 * import { save } from '@targetd/redis'
 *
 * const redis = createClient()
 * await redis.connect()
 *
 * await save(redis, {
 *   greeting: {
 *     rules: [
 *       { targeting: { country: ['US'] }, payload: 'Hello!' },
 *       { payload: 'Hi!' },
 *     ],
 *   },
 * })
 * ```
 */
export async function save(
  redis: RedisClient,
  rules: StorableRules,
  options: SaveOptions = {},
): Promise<void> {
  const keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX

  await Promise.all(
    Object.entries(rules).map(([name, value]) =>
      redis.set(`${keyPrefix}${name}`, JSON.stringify(value))
    ),
  )
}

/**
 * Remove stored rules for one or more payload names.
 *
 * @param redis - A connected Redis client.
 * @param names - Payload name(s) whose rules should be deleted.
 * @param options - Optional key-prefix configuration.
 *
 * @example
 * ```ts
 * await remove(redis, 'greeting')
 * await remove(redis, ['greeting', 'farewell'])
 * ```
 */
export async function remove(
  redis: RedisClient,
  names: string | string[],
  options: SaveOptions = {},
): Promise<void> {
  const keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX
  const list = Array.isArray(names) ? names : [names]
  if (list.length === 0) return
  await redis.del(list.map((name) => `${keyPrefix}${name}`))
}
