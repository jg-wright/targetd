import type { DataSchema, PT } from '@targetd/api'
import type { O, S, U } from 'ts-toolbelt'

/**
 * Type utility that transforms flat payload keys into nested object structure.
 * Used with the explode function to get properly typed nested payloads.
 *
 * @template $ - Data schema.
 * @template PathSeparator - String literal for the path separator character(s) used in flat keys.
 *
 * @example
 * ```ts
 * import type { Data } from '@targetd/api'
 * import type { ExplodedPayloads } from '@targetd/explode'
 *
 * type MyData = Data<...>
 * type NestedPayloads = ExplodedPayloads<MyData, '.'>
 * // 'user.name' becomes { user: { name: ... } }
 * ```
 */
export type ExplodedPayloads<
  $ extends DataSchema,
  PathSeparator extends string,
> = Explode<
  Partial<
    {
      [Name in keyof $['payloadParsers']]:
        | PT.Payload<$, $['payloadParsers'][Name]>
        | undefined
    }
  >,
  PathSeparator
>

/**
 * Type utility that recursively transforms flat keys into nested object structure.
 *
 * @template Rec - Record type with flat keys to transform.
 * @template Sep - String literal for the separator character(s) used to split keys.
 *
 * @example
 * ```ts
 * type Flat = { 'user.name': string, 'user.age': number }
 * type Nested = Explode<Flat, '.'>
 * // Result: { user: { name: string, age: number } }
 * ```
 */
export type Explode<Rec, Sep extends string> = Rec extends
  Record<string, unknown> ? $Explode<Rec, Sep> : Rec

/**
 * Internal helper type that performs the actual explosion transformation.
 * Merges all transformed keys into a single nested object type.
 *
 * @template Rec - Record type with flat keys.
 * @template Sep - Separator string for splitting keys.
 * @internal
 */
type $Explode<
  Rec extends Record<string, unknown>,
  Sep extends string,
> = U.Merge<
  {
    [Key in RecordKey<Rec>]: O.P.Record<S.Split<Key, Sep>, Rec[Key]>
  }[RecordKey<Rec>]
>

/**
 * Internal helper type that extracts the key type from a Record.
 *
 * @template R - Record type to extract keys from.
 * @internal
 */
type RecordKey<R extends Record<keyof any, any>> = R extends
  Record<infer V, any> ? V : never
