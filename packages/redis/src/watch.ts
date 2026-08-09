import { debounce, Mutex } from '@es-toolkit/es-toolkit'
import { DEFAULT_KEY_PREFIX, type RedisClient } from './client.ts'
import { load, type LoadOptions } from './load.ts'
import type { Data, DataSchema } from '@targetd/api'

/**
 * Callback invoked when rules are loaded or reloaded by {@link watch}.
 *
 * @param error - Error object if loading failed, `null` if successful.
 * @param data - The Data instance with loaded rules (unchanged on error).
 */
export type OnLoad<$ extends DataSchema> = (
  error: Error | null,
  data: Data<$>,
) => any

/**
 * Options for {@link watch}.
 */
export interface WatchOptions extends LoadOptions {
  /**
   * Redis logical database index whose keyspace notifications are observed.
   * Must match the database the client is connected to.
   * @default 0
   */
  db?: number

  /**
   * Milliseconds to debounce keyspace events before reloading.
   * @default 300
   */
  debounceMS?: number

  /**
   * Whether to enable keyspace notifications via
   * `CONFIG SET notify-keyspace-events KEA` on startup. Disable this when the
   * server already has notifications enabled or forbids `CONFIG SET` (e.g. some
   * managed Redis providers).
   * @default true
   */
  configureNotifications?: boolean
}

/**
 * Function that stops watching. Call it to unsubscribe and close the dedicated
 * subscriber connection.
 */
export interface WatchDisposer {
  (): Promise<void>
}

/**
 * Watch Redis for rule changes and reload automatically.
 *
 * A dedicated subscriber connection (a duplicate of `redis`) listens to
 * keyspace notifications. Whenever a key under the configured prefix changes,
 * the full rule set is reloaded and {@link OnLoad} is invoked — mirroring the
 * hot-reload behaviour of `@targetd/fs`'s `watch`.
 *
 * Because reloads are full (not incremental), a briefly missed notification is
 * self-healing: the next change reloads everything.
 *
 * @param data - Base Data instance with payloads and targeting configured.
 * @param redis - A connected Redis client. It is duplicated for the subscriber.
 * @param options - Watch configuration.
 * @param onLoad - Callback invoked on every (re)load.
 * @returns A promise resolving to a disposer that stops watching.
 *
 * @example
 * ```ts
 * import { createClient } from 'redis'
 * import { Data, DataSchema, targetIncludes } from '@targetd/api'
 * import { watch } from '@targetd/redis'
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
 * let currentData = baseData
 *
 * const stop = await watch(baseData, redis, (error, data) => {
 *   if (error) console.error('Failed to reload rules:', error)
 *   else currentData = data
 * })
 *
 * // Later:
 * await stop()
 * ```
 */
export function watch<$ extends DataSchema>(
  data: Data<$>,
  redis: RedisClient,
  options: WatchOptions,
  onLoad: OnLoad<$>,
): Promise<WatchDisposer>

export function watch<$ extends DataSchema>(
  data: Data<$>,
  redis: RedisClient,
  onLoad: OnLoad<$>,
): Promise<WatchDisposer>

export async function watch<$ extends DataSchema>(
  data: Data<$>,
  redis: RedisClient,
  optionsOrOnLoad: WatchOptions | OnLoad<$>,
  onLoadParam?: OnLoad<$>,
): Promise<WatchDisposer> {
  const options = (onLoadParam ? optionsOrOnLoad : {}) as WatchOptions
  const onLoad = (onLoadParam ?? optionsOrOnLoad) as OnLoad<$>
  const {
    keyPrefix = DEFAULT_KEY_PREFIX,
    db = 0,
    debounceMS = 300,
    configureNotifications = true,
  } = options

  const mutex = new Mutex()
  let stopped = false

  if (configureNotifications) {
    try {
      // K = keyspace, E = keyevent, A = all command classes.
      await redis.configSet('notify-keyspace-events', 'KEA')
    } catch (error) {
      // Non-fatal: the initial load still succeeds; only live updates are lost.
      console.warn(
        '[@targetd/redis] could not enable keyspace notifications; ' +
          'live reloading is disabled. Enable `notify-keyspace-events` on the ' +
          'server or pass `configureNotifications: false`.',
        error,
      )
    }
  }

  const onChange = async () => {
    await mutex.acquire()
    let error: Error | null = null
    try {
      data = await load(data.removeAllRules(), redis, { keyPrefix })
    } catch (cause: unknown) {
      error = cause instanceof Error ? cause : new Error(String(cause))
    } finally {
      mutex.release()
      if (!stopped) await onLoad(error, data)
    }
  }

  const debouncedOnChange = debounce(() => {
    onChange().catch(reportUnhandled)
  }, debounceMS)

  // A subscriber connection cannot issue normal commands, so `load` must run on
  // the original client while this duplicate only receives notifications.
  const subscriber = redis.duplicate()
  await subscriber.connect()

  subscriber.on?.('error', (error: unknown) => {
    if (stopped) return
    Promise.resolve(onLoad(error as Error, data)).catch(reportUnhandled)
  })

  // keyevent messages carry the affected key name; filter by our prefix.
  await subscriber.pSubscribe(
    `__keyevent@${db}__:*`,
    (message: string) => {
      if (!message.startsWith(keyPrefix)) return
      debouncedOnChange()
    },
  )

  const stop: WatchDisposer = async () => {
    stopped = true
    debouncedOnChange.cancel()
    try {
      await subscriber.pUnsubscribe()
    } finally {
      await subscriber.quit()
    }
  }

  // Prime with an initial load, matching @targetd/fs's watch behaviour.
  await onChange()

  return stop
}

// Last-resort reporter for rejections with nowhere else to go (an onLoad
// callback that itself throws). Never rethrown: a watcher must not crash the
// host process.
function reportUnhandled(error: unknown) {
  console.error('[@targetd/redis] watch error:', error)
}
