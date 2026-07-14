import type { L } from 'ts-toolbelt'
import type { MaybePromise } from './types.ts'

export function objectMap<O extends Record<string, unknown>, R>(
  obj: O,
  fn: <K extends keyof O>(v: O[K], k: K) => R,
): Record<keyof O, R> {
  const result = {} as Record<keyof O, R>
  for (const [key, value] of objectIterator(obj)) {
    result[key] = fn(value, key)
  }
  return result
}

export function objectKeys<O extends Record<string, unknown>>(
  obj: O,
): (keyof O)[] {
  return Object.keys(obj)
}

export function objectSize(obj: Record<string, unknown>) {
  return Object.keys(obj).length
}

export function objectEntries<T extends Record<string, unknown>>(obj: T) {
  return Object.entries(obj) as Entries<T>[]
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  return keys.reduce(
    (obj, key) => {
      delete obj[key]
      return obj
    },
    { ...obj },
  )
}

export function* objectIterator<T extends Record<string, unknown>>(
  obj: T,
): Generator<Entries<Required<T>>> {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) yield [key, obj[key]]
  }
}

export function objectFilter<T extends Record<string, unknown>>(
  obj: T,
  predicate: <K extends keyof T>(value: T[K], key: K) => boolean,
): Partial<T> {
  const result: Partial<T> = {}

  for (const [key, value] of objectIterator(obj)) {
    if (predicate(value, key)) result[key] = value
  }

  return result
}

export function objectSome<T extends Record<string, unknown>>(
  obj: T,
  predicate: <K extends keyof T>(value: T[K], key: K) => boolean,
): boolean {
  for (const [key, value] of objectIterator(obj)) {
    if (predicate(value, key)) return true
  }

  return false
}

export function someKeysIntersect(
  aObj: Record<string, unknown>,
  bObj: Record<string, unknown>,
) {
  return objectSome(aObj, (_, key) => key in bObj)
}

export function intersection<T extends Record<string, unknown>>(
  aObj: T,
  bObj: Record<string, unknown>,
) {
  return objectFilter(aObj, (_, key) => key in bObj)
}

export function intersectionKeys<T extends Record<string, unknown>>(
  aObj: T,
  bObj: Record<string, unknown>,
): (keyof Partial<T>)[] {
  const keys: (keyof Partial<T>)[] = []
  for (const [key] of objectIterator(aObj)) if (key in bObj) keys.push(key)
  return keys
}

/**
 * Call an asynchronous function on all key/value pairs.
 * Returns true only if all calls return true, short-circuiting on the first
 * false result.
 *
 * @example
 * if (await objectEveryAsync({ foo: 'bar' }, (value) => Promise.resolve(value === 'bar'))) {
 *   console.info('Everything is bar')
 * }
 */
export async function objectEveryAsync<T extends Record<string, unknown>>(
  obj: T,
  fn: <K extends keyof T>(value: T[K], key: K) => MaybePromise<boolean>,
) {
  for (const [key, value] of objectIterator(obj)) {
    if (!(await fn(value, key))) return false
  }
  return true
}

export function arrayInit<T extends unknown[]>(array: T) {
  return array.slice(0, -1) as L.Pop<T>
}

export function arrayLast<T extends unknown[]>(array: T): L.Last<T> {
  return array[array.length - 1]
}

type Entries<T extends Record<string | symbol, unknown>> = {
  [K in keyof T]: [K, T[K]]
}[keyof T]
