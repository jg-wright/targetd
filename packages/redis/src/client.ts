/**
 * Minimal structural interface describing the subset of a Redis client used by
 * `@targetd/redis`.
 *
 * This is intentionally decoupled from any specific client library. A
 * [node-redis](https://github.com/redis/node-redis) `RedisClientType` satisfies
 * it structurally, so you can pass one directly. Other clients can be adapted
 * by wrapping them in an object of this shape.
 */
export interface RedisClient {
  /**
   * Get the string value of a key, or `null` when the key does not exist.
   */
  get(key: string): Promise<RedisCommandRawReply>

  /**
   * Set the string value of a key.
   */
  set(key: string, value: string): Promise<unknown>

  /**
   * Delete one or more keys.
   */
  del(keys: string | string[]): Promise<unknown>

  /**
   * Find all keys matching the given glob-style pattern.
   *
   * @remarks
   * `KEYS` is O(N) over the keyspace. Rule data is expected to be small, but
   * for very large keyspaces prefer a client that exposes `SCAN`.
   */
  keys(pattern: string): Promise<string[]>

  /**
   * Set a runtime configuration parameter (used to enable keyspace
   * notifications for {@link watch}).
   */
  configSet(parameter: string, value: string): Promise<unknown>

  /**
   * Create an unconnected copy of the client, used to open a dedicated
   * subscriber connection.
   */
  duplicate(): RedisClient

  /**
   * Open the connection.
   */
  connect(): Promise<unknown>

  multi(): RedisClientTransaction

  /**
   * Gracefully close the connection.
   */
  quit(): Promise<unknown>

  /**
   * Subscribe to channels matching a pattern. The listener receives the
   * message followed by the originating channel.
   */
  pSubscribe(
    pattern: string,
    listener: (message: string, channel: string) => unknown,
  ): Promise<unknown>

  /**
   * Unsubscribe from pattern subscriptions.
   */
  pUnsubscribe(pattern?: string): Promise<unknown>

  /**
   * Optional event registration (e.g. `'error'`). Present on node-redis
   * clients. Used by {@link watch} to surface connection errors when available.
   */
  on?(event: string, listener: (...args: any[]) => void): unknown
}

export interface RedisClientTransaction {
  get(key: string): RedisClientTransaction
  del(key: string): RedisClientTransaction
  set(key: string, value: string): RedisClientTransaction
  exec(execAsPipeline?: boolean): Promise<unknown[]>
}

export type RedisCommandRawReply =
  | string
  | number
  | Buffer
  | null
  | undefined
  | Array<RedisCommandRawReply>

/**
 * Default prefix applied to every key holding a payload's rules.
 */
export const DEFAULT_KEY_PREFIX = 'targetd:'
