import { debounce, Mutex } from '@es-toolkit/es-toolkit'
import {
  watch as fsWatch,
  type WatchOptions as BaseWatchOptions,
} from 'node:fs'
import { load, pathIsLoadable } from './load.ts'
import type { Data, DataSchema } from '@targetd/api'

/**
 * Callback function invoked when rules are loaded or reloaded by the watch function.
 *
 * @template D - Data instance type being watched.
 *
 * @param error - Error object if loading failed, null if successful.
 * @param data - The Data instance with loaded rules (may be unchanged if error occurred).
 * @returns Any value (typically void or a cleanup function).
 *
 * @example
 * ```ts
 * const onLoad: OnLoad<typeof mySchema> = (error, data) => {
 *   if (error) {
 *     console.error('Failed to load rules:', error)
 *   } else {
 *     console.log('Rules loaded successfully')
 *     // Update application state with new data
 *   }
 * }
 * ```
 */
export type OnLoad<$ extends DataSchema> = (
  error: Error | null,
  data: Data<$>,
) => any

/**
 * Options for watching a directory for rule file changes.
 */
export interface WatchOptions extends BaseWatchOptions {
  /**
   * Milliseconds to debounce file change events before reloading rules.
   * @default 300
   */
  debounceMS?: number
}

/**
 * Watch a directory for rule file changes and automatically reload.
 * Provides hot-reloading of targeting rules without restarting the application.
 *
 * @param data - Base Data instance with payloads and targeting configured.
 * @param dir - Directory path to watch for rule files.
 * @param options - Node.js fs.watch options (optional).
 * @param onLoad - Callback invoked when rules are loaded or reloaded.
 * @returns Function to stop watching the directory.
 *
 * @example
 * ```ts
 * import { Data, DataSchema, targetIncludes } from '@targetd/api'
 * import { watch } from '@targetd/fs'
 * import { z } from 'zod'
 *
 * const baseData = await Data.create(
 *   DataSchema.create()
 *     .usePayload({ greeting: z.string() })
 *     .useTargeting({ country: targetIncludes(z.string()) }),
 * )
 *
 * let currentData = baseData
 *
 * const stopWatching = watch(baseData, './rules', (error, data) => {
 *   if (error) {
 *     console.error('Failed to reload rules:', error)
 *   } else {
 *     currentData = data
 *     console.log('Rules reloaded successfully')
 *   }
 * })
 *
 * // Later: stop watching
 * stopWatching()
 * ```
 */
export function watch<$ extends DataSchema>(
  data: Data<$>,
  dir: string,
  options: WatchOptions,
  onLoad: OnLoad<$>,
): WatchDisposer

export function watch<$ extends DataSchema>(
  data: Data<$>,
  dir: string,
  onLoad: OnLoad<$>,
): WatchDisposer

export function watch<$ extends DataSchema>(
  data: Data<$>,
  dir: string,
  optionsOrOnLoad: WatchOptions | OnLoad<$>,
  onLoadParam?: OnLoad<$>,
) {
  const { debounceMS = 300, ...fsOptions } = onLoadParam
    ? optionsOrOnLoad as WatchOptions
    : {}
  const onLoad = (onLoadParam || optionsOrOnLoad) as OnLoad<$>
  const mutex = new Mutex()
  let stopped = false

  const onChange = async () => {
    await mutex.acquire()
    let error: Error | null = null
    try {
      data = await load(data.removeAllRules(), dir)
    } catch ($error: any) {
      error = $error
    } finally {
      mutex.release()
      if (!stopped) await onLoad(error, data)
    }
  }

  const debouncedOnChange = debounce(
    (_eventType: unknown, filename: string | Buffer | null) => {
      if (filename && !pathIsLoadable(String(filename))) return
      onChange().catch(reportUnhandled)
    },
    debounceMS,
  )

  // Watch recursively to match `load`, which reads subdirectories.
  const watcher = fsWatch(
    dir,
    { recursive: true, ...fsOptions },
    debouncedOnChange,
  )

  // Without an error listener, a watcher error (directory removed, EMFILE,
  // EPERM) is an uncaught exception that crashes the host process.
  watcher.on('error', (error) => {
    if (stopped) return
    Promise.resolve(onLoad(error, data)).catch(reportUnhandled)
  })

  const stop: WatchDisposer = () => {
    stopped = true
    debouncedOnChange.cancel()
    watcher.close()
  }

  onChange().catch(reportUnhandled)

  return stop
}

/**
 * Function type that stops watching a directory.
 * Call this function to clean up the file watcher and stop monitoring for changes.
 */
export interface WatchDisposer {
  (): void
}

// Last-resort reporter for rejections with nowhere else to go (an onLoad
// callback that itself throws). Never rethrown: a watcher must not be able
// to crash the host process.
function reportUnhandled(error: unknown) {
  console.error('[@targetd/fs] watch error:', error)
}
