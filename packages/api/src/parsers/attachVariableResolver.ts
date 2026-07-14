import {
  type output,
  pipe,
  safeExtend,
  transform,
  type ZodMiniAny,
  ZodMiniObject,
  type ZodMiniPipe,
  type ZodMiniTransform,
} from 'zod/mini'
import { objectEntries } from '../util.ts'
import {
  DataItemVariableResolverParser,
  DataItemVariableResolverTransformer,
  type ParserPosition,
  type VariableStringParser,
  variableStringParser,
} from './DataItemVariableResolver.ts'
import type {
  $ZodArray,
  $ZodCatch,
  $ZodDefault,
  $ZodLazy,
  $ZodNonOptional,
  $ZodNullable,
  $ZodObject,
  $ZodOptional,
  $ZodPrefault,
  $ZodReadonly,
  $ZodRecord,
  $ZodTuple,
  $ZodType,
  $ZodUnion,
} from 'zod/v4/core'
import { any, type ZodObject } from 'zod'
import { type ZodSwitch, zodSwitch } from './switch.ts'
import type { VariablesRegistry } from './variablesRegistry.ts'

export function attachVariableResolver<
  Parser extends $ZodType,
>(
  variablesRegistry: VariablesRegistry,
  parser: Parser,
  position?: ParserPosition,
): RecursiveVariableResolver<Parser> {
  switch (parser._zod.def.type) {
    case 'object':
      return objectVariableResolverParser(
        variablesRegistry,
        parser as unknown as (ZodObject | ZodMiniObject),
        position,
      ) as unknown as RecursiveVariableResolver<Parser>

    case 'record':
      return recordVariableResolverParser(
        variablesRegistry,
        parser as unknown as $ZodRecord,
        position,
      ) as RecursiveVariableResolver<Parser>

    case 'array':
      return arrayVariableResolverParser(
        variablesRegistry,
        parser as unknown as $ZodArray,
        position,
      ) as RecursiveVariableResolver<Parser>

    case 'union':
      return unionVariableResolverParser(
        variablesRegistry,
        parser as unknown as $ZodUnion,
        position,
      ) as RecursiveVariableResolver<Parser>

    case 'tuple':
      return tupleVariableResolverParser(
        variablesRegistry,
        parser as unknown as $ZodTuple,
        position,
      ) as RecursiveVariableResolver<Parser>

    case 'lazy':
      return lazyVariableResolverParser(
        variablesRegistry,
        parser as unknown as $ZodLazy,
        position,
      ) as RecursiveVariableResolver<Parser>

    case 'optional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'catch':
    case 'nonoptional':
    case 'readonly':
      return wrapperVariableResolverParser(
        variablesRegistry,
        parser as unknown as WrapperParser,
        position,
      ) as RecursiveVariableResolver<Parser>

    default:
      return variableResolverParser(
        variablesRegistry,
        parser,
        position,
      ) as RecursiveVariableResolver<Parser>
  }
}

function variableResolverParser<
  Parser extends $ZodType,
>(
  variablesRegistry: VariablesRegistry,
  parser: Parser,
  position?: ParserPosition,
): WithVariableResolver<Parser> {
  return (parser._zod.def.type === 'string'
    ? pipe(
      parser,
      transform((input, ctx) =>
        DataItemVariableResolverTransformer(
          variablesRegistry,
          parser,
          input as string,
          ctx,
          position,
        )
      ),
    )
    : zodSwitch([
      [
        variableStringParser(),
        DataItemVariableResolverParser(variablesRegistry, parser, position),
      ],
      [any(), parser],
    ])) as WithVariableResolver<Parser>
}

function arrayVariableResolverParser<Parser extends $ZodArray>(
  variablesRegistry: VariablesRegistry,
  arrayParser: Parser,
  position?: ParserPosition,
): RecursiveVariableResolver<Parser> {
  const $arrayParser = new arrayParser._zod.constr({
    ...arrayParser._zod.def,
    element: attachVariableResolver(
      variablesRegistry,
      arrayParser._zod.def.element,
    ),
  })
  return variableResolverParser(
    variablesRegistry,
    $arrayParser,
    position,
  ) as RecursiveVariableResolver<Parser>
}

function unionVariableResolverParser<Parser extends $ZodUnion>(
  variablesRegistry: VariablesRegistry,
  unionParser: Parser,
  position?: ParserPosition,
): RecursiveVariableResolver<Parser> {
  // Discriminated unions rely on their options' literal discriminator
  // properties; transforming the options would hide them. Variables can
  // still stand in for the whole union value, just not nested within it.
  if ('discriminator' in unionParser._zod.def) {
    return variableResolverParser(
      variablesRegistry,
      unionParser,
      position,
    ) as unknown as RecursiveVariableResolver<Parser>
  }

  const $unionParser = new unionParser._zod.constr({
    ...unionParser._zod.def,
    options: unionParser._zod.def.options.map((option) =>
      attachVariableResolver(variablesRegistry, option)
    ),
  })
  return variableResolverParser(
    variablesRegistry,
    $unionParser,
    position,
  ) as unknown as RecursiveVariableResolver<Parser>
}

function tupleVariableResolverParser<Parser extends $ZodTuple>(
  variablesRegistry: VariablesRegistry,
  tupleParser: Parser,
  position?: ParserPosition,
): RecursiveVariableResolver<Parser> {
  const def = tupleParser._zod.def
  const $tupleParser = new tupleParser._zod.constr({
    ...def,
    items: def.items.map((item) =>
      attachVariableResolver(variablesRegistry, item)
    ),
    rest: def.rest && attachVariableResolver(variablesRegistry, def.rest),
  })
  return variableResolverParser(
    variablesRegistry,
    $tupleParser,
    position,
  ) as unknown as RecursiveVariableResolver<Parser>
}

function lazyVariableResolverParser<Parser extends $ZodLazy>(
  variablesRegistry: VariablesRegistry,
  lazyParser: Parser,
  position?: ParserPosition,
): RecursiveVariableResolver<Parser> {
  const def = lazyParser._zod.def
  let inner: $ZodType | undefined
  return new lazyParser._zod.constr({
    ...def,
    getter: () =>
      inner ??= attachVariableResolver(
        variablesRegistry,
        def.getter(),
        position,
      ),
  }) as unknown as RecursiveVariableResolver<Parser>
}

type WrapperParser =
  | $ZodOptional
  | $ZodNullable
  | $ZodDefault
  | $ZodPrefault
  | $ZodCatch
  | $ZodNonOptional
  | $ZodReadonly

function wrapperVariableResolverParser<Parser extends WrapperParser>(
  variablesRegistry: VariablesRegistry,
  wrapperParser: Parser,
  position?: ParserPosition,
): RecursiveVariableResolver<Parser> {
  // Variables inside this wrapper must validate against the whole wrapper
  // chain (e.g. accept null at a nullable position), so the outermost
  // wrapper threads a position reference down to the leaves and completes
  // it once the transformed wrapper exists.
  const isOutermostWrapper = !position
  const $position = position ?? { parser: wrapperParser }
  const $wrapperParser = new wrapperParser._zod.constr({
    ...wrapperParser._zod.def,
    innerType: attachVariableResolver(
      variablesRegistry,
      wrapperParser._zod.def.innerType,
      $position,
    ),
  }) as unknown as RecursiveVariableResolver<Parser>
  if (isOutermostWrapper) $position.parser = $wrapperParser as $ZodType
  return $wrapperParser
}

function recordVariableResolverParser<Parser extends $ZodRecord>(
  variablesRegistry: VariablesRegistry,
  recordParser: Parser,
  position?: ParserPosition,
): RecursiveVariableResolver<Parser> {
  const $recordParser = new recordParser._zod.constr({
    ...recordParser._zod.def,
    valueType: attachVariableResolver(
      variablesRegistry,
      recordParser._zod.def.valueType,
    ),
  })
  return variableResolverParser(
    variablesRegistry,
    $recordParser,
    position,
  ) as RecursiveVariableResolver<Parser>
}

function objectVariableResolverParser<
  Parser extends ZodObject | ZodMiniObject,
>(
  variablesRegistry: VariablesRegistry,
  objectParser: Parser,
  position?: ParserPosition,
): RecursiveVariableResolver<Parser> {
  const $objectParser = objectParser instanceof ZodMiniObject
    ? objectEntries(objectParser._zod.def.shape).reduce<ZodMiniObject>(
      (acc, [key, parser]) =>
        safeExtend(acc, {
          [key]: attachVariableResolver(variablesRegistry, parser),
        }),
      objectParser,
    )
    : objectEntries(objectParser._zod.def.shape).reduce<ZodObject>(
      (acc, [key, parser]) =>
        acc.safeExtend({
          [key]: attachVariableResolver(variablesRegistry, parser) as any,
        }),
      objectParser,
    )

  return variableResolverParser(
    variablesRegistry,
    $objectParser,
    position,
  ) as RecursiveVariableResolver<
    Parser
  >
}

type WithVariableResolver<
  Parser extends $ZodType,
> = Parser['_zod']['def']['type'] extends 'string'
  ? ZodMiniPipe<Parser, ZodMiniTransform<unknown, output<Parser>>>
  : ZodSwitch<[
    [VariableStringParser, DataItemVariableResolverParser],
    [ZodMiniAny, Parser],
  ]>

export type RecursiveVariableResolver<
  Parser extends $ZodType,
> = Parser extends $ZodOptional
  ? $ZodOptional<RecursiveVariableResolver<Parser['_zod']['def']['innerType']>>
  : Parser extends $ZodNullable ? $ZodNullable<
      RecursiveVariableResolver<Parser['_zod']['def']['innerType']>
    >
  : Parser extends $ZodDefault
    ? $ZodDefault<RecursiveVariableResolver<Parser['_zod']['def']['innerType']>>
  : Parser extends $ZodPrefault ? $ZodPrefault<
      RecursiveVariableResolver<Parser['_zod']['def']['innerType']>
    >
  : Parser extends $ZodCatch
    ? $ZodCatch<RecursiveVariableResolver<Parser['_zod']['def']['innerType']>>
  : Parser extends $ZodNonOptional ? $ZodNonOptional<
      RecursiveVariableResolver<Parser['_zod']['def']['innerType']>
    >
  : Parser extends $ZodReadonly ? $ZodReadonly<
      RecursiveVariableResolver<Parser['_zod']['def']['innerType']>
    >
  : Parser extends $ZodArray ? WithVariableResolver<
      $ZodArray<
        RecursiveVariableResolver<Parser['_zod']['def']['element']>
      >
    >
  : Parser extends $ZodRecord ? WithVariableResolver<
      $ZodRecord<
        Parser['_zod']['def']['keyType'],
        RecursiveVariableResolver<Parser['_zod']['def']['valueType']>
      >
    >
  : Parser extends $ZodUnion<infer Options extends readonly $ZodType[]>
    ? WithVariableResolver<
      $ZodUnion<
        Extract<
          { [K in keyof Options]: RecursiveVariableResolver<Options[K]> },
          readonly $ZodType[]
        >
      >
    >
  : Parser extends
    $ZodTuple<infer Items extends readonly $ZodType[], infer Rest>
    ? WithVariableResolver<
      $ZodTuple<
        Extract<
          { [K in keyof Items]: RecursiveVariableResolver<Items[K]> },
          readonly $ZodType[]
        >,
        Rest extends $ZodType ? RecursiveVariableResolver<Rest> : null
      >
    >
  : Parser extends $ZodLazy<infer Inner extends $ZodType>
    ? $ZodLazy<RecursiveVariableResolver<Inner>>
  : Parser extends $ZodObject ? WithVariableResolver<
      $ZodObject<
        {
          [K in keyof Parser['_zod']['def']['shape']]:
            RecursiveVariableResolver<
              Parser['_zod']['def']['shape'][K]
            >
        },
        ZodObjectConfig<Parser>
      >
    >
  : WithVariableResolver<Parser>

type ZodObjectConfig<T extends $ZodObject> = T extends $ZodObject<any, infer V>
  ? V
  : never
