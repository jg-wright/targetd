import {
  assertEquals,
  assertRejects,
  assertStrictEquals,
} from 'jsr:@std/assert'
import { assertSnapshot } from 'jsr:@std/testing/snapshot'
import { setTimeout } from 'node:timers/promises'
import z, { type ZodError } from 'zod'
import {
  createTargetingDescriptor,
  Data,
  DataSchema,
  targetEquals,
  targetIncludes,
} from '@targetd/api'

Deno.test('getPayload', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({ 'foo': z.string() })
      .useTargeting({
        weather: targetIncludes(z.string()),
        highTide: targetEquals(z.boolean()),
        asyncThing: {
          predicate: (q) =>
            setTimeout(10, (t: boolean) => q === t && setTimeout(10, true)),
          queryParser: z.boolean(),
          targetingParser: z.boolean(),
        },
      }),
  )
    .addRules('foo', [
      {
        targeting: {
          highTide: true,
          weather: ['sunny'],
        },
        payload: '🏄‍♂️',
      },
      {
        targeting: {
          weather: ['sunny'],
        },
        payload: '😎',
      },
      {
        targeting: {
          weather: ['rainy'],
        },
        payload: '☂️',
      },
      {
        targeting: {
          highTide: true,
        },
        payload: '🌊',
      },
      {
        targeting: {
          asyncThing: true,
        },
        payload: 'Async payload',
      },
      {
        payload: 'bar',
      },
    ])

  assertStrictEquals(await data.getPayload('foo'), 'bar')
  assertStrictEquals(await data.getPayload('foo', { weather: 'sunny' }), '😎')
  assertStrictEquals(await data.getPayload('foo', { weather: 'rainy' }), '☂️')
  assertStrictEquals(await data.getPayload('foo', { highTide: true }), '🌊')
  assertStrictEquals(
    await data.getPayload('foo', { highTide: true, weather: 'sunny' }),
    '🏄‍♂️',
  )
  assertStrictEquals(
    await data.getPayload('foo', { asyncThing: true }),
    'Async payload',
  )

  // @ts-expect-error Mung data type does not exist
  await data.getPayload('mung')

  await assertRejects(() =>
    // @ts-expect-error 'nonExistantKey' is not a queriable value
    data.getPayload('foo', { nonExistantKey: 'some value' })
  )

  await assertRejects(() =>
    data.addRules('foo', [
      {
        targeting: {
          // @ts-expect-error 'nonExistantKey' is not a targetable value
          nonExistantKey: 'some value',
        },
        payload: 'error',
      },
    ])
  )
})

Deno.test('targetEquals with falsy query values', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({ foo: z.string() })
      .useTargeting({ highTide: targetEquals(z.boolean()) }),
  )
    .addRules('foo', [
      { targeting: { highTide: true }, payload: 'high' },
      { targeting: { highTide: false }, payload: 'low' },
      { payload: 'default' },
    ])

  assertStrictEquals(await data.getPayload('foo', { highTide: true }), 'high')
  assertStrictEquals(await data.getPayload('foo', { highTide: false }), 'low')
  assertStrictEquals(await data.getPayload('foo'), 'default')
})

Deno.test('targetEquals with negation', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({ foo: z.string() })
      .useTargeting({ env: targetEquals(z.string(), { withNegate: true }) }),
  )
    .addRules('foo', [
      { targeting: { env: '!staging' }, payload: 'not staging' },
      { targeting: { env: 'staging' }, payload: 'staging' },
      { payload: 'default' },
    ])

  assertStrictEquals(
    await data.getPayload('foo', { env: 'prod' }),
    'not staging',
  )
  assertStrictEquals(
    await data.getPayload('foo', { env: 'staging' }),
    'staging',
  )
  assertStrictEquals(await data.getPayload('foo'), 'default')
})

Deno.test('targetIncludes with negation', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({ foo: z.string() })
      .useTargeting({
        country: targetIncludes(z.string(), { withNegate: true }),
      }),
  )
    .addRules('foo', [
      { targeting: { country: ['US'] }, payload: 'US only' },
      { targeting: { country: ['!FR'] }, payload: 'anywhere but France' },
      { payload: 'default' },
    ])

  assertStrictEquals(
    await data.getPayload('foo', { country: 'US' }),
    'US only',
  )
  assertStrictEquals(
    await data.getPayload('foo', { country: 'DE' }),
    'anywhere but France',
  )
  assertStrictEquals(await data.getPayload('foo', { country: 'FR' }), 'default')
})

Deno.test('consecutive untargeted rules return the first payload', async () => {
  const data = await Data.create(
    DataSchema.create().usePayload({ foo: z.string() }),
  )
    .addRules('foo', [{ payload: 'a' }, { payload: 'b' }])

  assertStrictEquals(await data.getPayload('foo'), 'a')
})

Deno.test('addRules can be called again for the same name', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({ foo: z.string() })
      .useTargeting({ weather: targetIncludes(z.string()) })
      .useFallThroughTargeting({ browser: targetIncludes(z.string()) }),
  )
    .addRules('foo', [
      {
        targeting: { weather: ['sunny'], browser: ['chrome'] },
        payload: '😎',
      },
    ])
    .addRules('foo', [{ payload: 'default' }])

  assertStrictEquals(await data.getPayload('foo'), 'default')
  assertEquals(await data.getPayload('foo', { weather: 'sunny' }), {
    __rules__: [{ targeting: { browser: ['chrome'] }, payload: '😎' }],
  })
})

Deno.test('addRules again after rules with variables', async () => {
  const data = await Data.create(
    DataSchema.create().usePayload({ foo: z.string() }),
  )
    .addRules('foo', {
      variables: { v: [{ payload: 'hello' }] },
      rules: [{ payload: '{{v}}' }],
    })
    .addRules('foo', [{ payload: 'unused fallback' }])

  assertStrictEquals(await data.getPayload('foo'), 'hello')
})

Deno.test('insert rejects unknown payload names and targeting keys', async () => {
  const data = Data.create(
    DataSchema.create()
      .usePayload({ foo: z.string() })
      .useTargeting({ weather: targetIncludes(z.string()) }),
  )

  await assertRejects(() => data.insert({ bar: 'nope' } as any))

  await assertRejects(() =>
    data.insert({
      foo: { __rules__: [{ payload: 'x', targeting: { nonsense: 'y' } }] },
    } as any)
  )
})

Deno.test('removeAllRules', async () => {
  const promised = Data.create(
    DataSchema.create().usePayload({ foo: z.string() }),
  ).addRules('foo', [{ payload: 'bar' }])

  const data = await promised
  assertStrictEquals(await data.getPayload('foo'), 'bar')
  assertStrictEquals(await data.removeAllRules().getPayload('foo'), undefined)

  // Rules can be re-added after clearing, including via PromisedData chaining
  const readded = await promised
    .removeAllRules()
    .addRules('foo', [{ payload: 'baz' }])
  assertStrictEquals(await readded.getPayload('foo'), 'baz')
})

Deno.test('targeting with multiple conditions', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({ foo: z.string() })
      .useTargeting({
        weather: targetIncludes(z.string()),
        highTide: targetEquals(z.boolean()),
      }),
  )
    .addRules('foo', [
      {
        targeting: [
          {
            weather: ['sunny'],
          },
          {
            highTide: true,
          },
        ],
        payload: 'The time is now',
      },
      {
        payload: 'bar',
      },
    ])

  assertStrictEquals(
    await data.getPayload('foo', { weather: 'sunny' }),
    'The time is now',
  )
  assertStrictEquals(
    await data.getPayload('foo', { highTide: true }),
    'The time is now',
  )
  assertStrictEquals(await data.getPayload('foo'), 'bar')
})

Deno.test('targeting without requiring a query', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        foo: z.string(),
      })
      .useTargeting({
        time: {
          predicate: () => (t) => t === 'now!',
          queryParser: z.undefined(),
          requiresQuery: false,
          targetingParser: z.literal('now!'),
        },
      }),
  )
    .addRules('foo', [
      {
        targeting: {
          time: 'now!',
        },
        payload: 'The time is now',
      },
      {
        payload: 'bar',
      },
    ])

  assertStrictEquals(await data.getPayload('foo'), 'The time is now')
})

Deno.test('getPayloads', async (t) => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        foo: z.string(),
      })
      .useTargeting({
        weather: targetIncludes(z.string()),
        highTide: targetEquals(z.boolean()),
      }),
  )
    .addRules('foo', [
      {
        targeting: {
          weather: ['sunny'],
        },
        payload: '😎',
      },
      {
        targeting: {
          weather: ['rainy', 'sunny'],
        },
        payload: '☂️',
      },
      {
        targeting: {
          highTide: true,
        },
        payload: '🏄‍♂️',
      },
      {
        payload: 'bar',
      },
    ])

  await assertSnapshot(t, await data.getPayloads('foo', { weather: 'sunny' }))
})

Deno.test('payload runtype validation', async (t) => {
  try {
    await Data.create(
      DataSchema.create()
        .usePayload({
          foo: z.string().refine((x) => x === 'bar', 'Should be bar'),
        }),
    )
      .addRules('foo', [
        {
          payload: 'rab',
        },
      ])
  } catch (error: any) {
    await assertSnapshot(t, error.message)
    return
  }

  throw new Error('Didnt error correctly')
})

Deno.test('getPayloadForEachName', async (t) => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        foo: z.string(),
        bar: z.string(),
      })
      .useTargeting({
        weather: targetIncludes(z.string()),
        highTide: targetIncludes(z.boolean()),
        asyncThing: {
          predicate: (q) =>
            setTimeout(10, (t: boolean) => q === t && setTimeout(10, true)),
          queryParser: z.boolean(),
          targetingParser: z.boolean(),
        },
      }),
  )
    .addRules('foo', [
      {
        targeting: {
          weather: ['sunny'],
        },
        payload: '😎',
      },
      {
        targeting: {
          weather: ['rainy'],
        },
        payload: '☂️',
      },
    ])
    .addRules('bar', [
      {
        targeting: {
          weather: ['rainy'],
        },
        payload: '😟',
      },
      {
        targeting: {
          weather: ['sunny'],
        },
        payload: '😁',
      },
      {
        targeting: {
          asyncThing: true,
        },
        payload: 'async payloads!',
      },
    ])

  await assertSnapshot(
    t,
    await data.getPayloadForEachName({ weather: 'sunny' }),
  )
  await assertSnapshot(
    t,
    await data.getPayloadForEachName({ asyncThing: true }),
  )
})

Deno.test('fallThrough targeting', async (t) => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        foo: z.string(),
        bar: z.string(),
        mung: z.string(),
      })
      .useTargeting({ surf: targetIncludes(z.string(), { withNegate: true }) })
      .useFallThroughTargeting({ weather: z.array(z.string()) }),
  )
    .addRules('foo', [
      {
        targeting: {
          surf: ['strong'],
          weather: ['sunny'],
        },
        payload: '🏄‍♂️',
      },
      {
        targeting: {
          weather: ['sunny'],
        },
        payload: '😎',
      },
      {
        targeting: {
          weather: ['rainy'],
        },
        payload: '☂️',
      },
    ])
    .addRules('bar', [
      {
        targeting: {
          weather: ['rainy'],
        },
        payload: '😟',
      },
      {
        targeting: {
          weather: ['sunny'],
        },
        payload: '😁',
      },
      {
        payload: '😐',
      },
    ])
    .addRules('mung', [
      {
        targeting: {
          surf: ['!strong'],
          weather: ['rainy'],
        },
        payload: '☂️',
      },
      {
        targeting: {
          surf: ['strong'],
          weather: ['sunny'],
        },
        payload: '🏄‍♂️',
      },
    ])

  await assertSnapshot(t, data.data)
  await assertSnapshot(t, await data.getPayloadForEachName({ surf: 'tame' }))
  await assertSnapshot(t, await data.getPayloadForEachName({ surf: 'strong' }))
})

Deno.test('inserting data', async (t) => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        moo: z.string(),
        foo: z.string(),
        bar: z.string(),
      })
      .useTargeting({
        weather: targetIncludes(z.string()),
      })
      .useFallThroughTargeting({
        highTide: targetEquals(z.boolean()),
      }),
  )
    .insert({
      bar: {
        __rules__: [
          {
            payload: '😟',
            targeting: {
              highTide: false,
            },
          },
          {
            payload: '😁',
            targeting: {
              highTide: true,
            },
          },
        ],
      },
      foo: {
        __rules__: [
          {
            payload: '😎',
            targeting: {
              weather: ['sunny'],
            },
          },
          {
            payload: '☂️',
            targeting: {
              weather: ['rainy'],
            },
          },
        ],
      },
      moo: 'glue',
    })

  await assertSnapshot(
    t,
    await data.getPayloadForEachName({ weather: 'sunny' }),
  )
})

Deno.test('inserting data with variables', async (t) => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        moo: z.string(),
        foo: z.string(),
        bar: z.string(),
      })
      .useTargeting({
        weather: targetIncludes(z.string()),
        highTide: targetEquals(z.boolean()),
      }),
  )
    .insert({
      bar: {
        __variables__: {
          highTide: [
            {
              payload: '😟',
              targeting: {
                highTide: false,
              },
            },
            {
              payload: '😁',
            },
          ],
        },
        __rules__: [
          {
            payload: '{{highTide}}',
            targeting: {},
          },
        ],
      },
      foo: {
        __rules__: [
          {
            payload: '😎',
            targeting: {
              weather: ['sunny'],
            },
          },
          {
            payload: '☂️',
            targeting: {
              weather: ['rainy'],
            },
          },
        ],
      },
      moo: 'glue',
    })

  await assertSnapshot(
    t,
    await data.getPayloadForEachName({ weather: 'sunny', highTide: true }),
  )
})

Deno.test('targeting predicate with full query object', async () => {
  const mungTargeting = createTargetingDescriptor({
    queryParser: z.string(),
    targetingParser: z.string().array(),
    predicate: (queryValue, { bar }: { bar?: boolean }) => (targeting) =>
      bar === true &&
      queryValue !== undefined &&
      targeting.includes(queryValue),
  })

  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        foo: z.string(),
      })
      .useTargeting({
        oof: {
          queryParser: z.string(),
          targetingParser: z.string(),
          predicate: (q) => (t) => q === t,
        },
        bar: {
          queryParser: z.boolean(),
          targetingParser: z.boolean(),
          predicate: (q) => (t) => q === t,
        },
        mung: mungTargeting,
      }),
  )
    .addRules('foo', [
      {
        targeting: { mung: ['mung'] },
        payload: 'yay',
      },
    ])

  assertStrictEquals(await data.getPayload('foo'), undefined)
  assertStrictEquals(await data.getPayload('foo', { mung: 'mung' }), undefined)
  assertStrictEquals(
    await data.getPayload('foo', { bar: true, mung: 'mung' }),
    'yay',
  )
})

Deno.test('broken', async (t) => {
  const browserTargeting = targetIncludes(z.enum(['chrome', 'edge']))

  const channelTargeting = targetIncludes(z.enum(['foo', 'bar']))

  const payloadSchema = {
    foo: z.string(),
  }

  const data = await Data.create(
    DataSchema.create()
      .usePayload(payloadSchema)
      .useTargeting({
        channel: channelTargeting,
      })
      .useFallThroughTargeting({
        browser: browserTargeting,
      }),
  )
    .addRules('foo', [
      {
        targeting: {
          channel: ['foo'],
        },
        payload: 'face',
      },
      {
        targeting: {
          channel: ['bar'],
          browser: ['chrome'],
        },
        payload: 'yay',
      },
      {
        targeting: {
          channel: ['bar'],
          browser: ['edge'],
        },
        payload: 'nay',
      },
    ])

  await assertSnapshot(t, await data.getPayloadForEachName({ channel: 'foo' }))
  await assertSnapshot(t, await data.getPayloadForEachName({ channel: 'bar' }))
})

Deno.test('variables', async (t) => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        foo: z.strictObject({
          a: z.strictObject({
            b: z.strictObject({
              c: z.string(),
              d: z.number(),
            }),
          }),
        }),
      })
      .useTargeting({
        channel: targetIncludes(z.enum(['foo', 'bar'])),
      })
      .useFallThroughTargeting({
        browser: targetIncludes(z.enum(['chrome', 'edge'])),
      }),
  )
    .addRules('foo', {
      variables: {
        c: [
          {
            targeting: {
              channel: ['bar'],
            },
            payload: 'foo',
          },
          {
            payload: 'bar',
          },
        ],
        d: [
          { payload: 1 },
        ],
      },
      rules: [
        {
          payload: {
            a: {
              b: {
                c: '{{c}}',
                d: '{{d}}',
              },
            },
          },
        },
      ],
    })

  await assertSnapshot(t, await data.getPayload('foo', { channel: 'bar' }))

  await assertSnapshot(t, await data.getPayload('foo'))
})

Deno.test('variables using fallthrough targeting', async (t) => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        foo: z.strictObject({
          a: z.strictObject({
            b: z.strictObject({
              c: z.string(),
              d: z.number(),
            }),
          }),
        }),
      })
      .useTargeting({
        channel: targetIncludes(z.enum(['foo', 'bar'])),
      })
      .useFallThroughTargeting({
        browser: targetIncludes(z.enum(['chrome', 'edge'])),
      }),
  )
    .addRules('foo', {
      variables: {
        c: [
          {
            targeting: {
              browser: ['chrome'],
            },
            payload: '1',
          },
          {
            payload: '2',
          },
        ],
        d: [
          { payload: 1 },
        ],
      },
      rules: [
        {
          targeting: {
            channel: ['bar'],
          },
          payload: {
            a: {
              b: {
                c: '{{c}}',
                d: '{{d}}',
              },
            },
          },
        },
      ],
    })

  await assertSnapshot(t, await data.getPayload('foo', { channel: 'bar' }))
})

Deno.test('unresolvable variables error instead of leaking placeholders', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({ foo: z.strictObject({ n: z.number() }) })
      .useTargeting({ channel: targetIncludes(z.string()) }),
  )
    .addRules('foo', {
      variables: {
        v: [{ targeting: { channel: ['news'] }, payload: 1 }],
      },
      rules: [{ payload: { n: '{{v}}' } }],
    })

  assertEquals(await data.getPayload('foo', { channel: 'news' }), { n: 1 })

  // Without a matching variable rule the payload cannot satisfy its schema —
  // previously this returned { n: '{{v}}' }
  await assertRejects(
    () => data.getPayload('foo'),
    Error,
    'Unable to resolve variable "v"',
  )
})

Deno.test('variables resolving to null are substituted', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({ foo: z.strictObject({ a: z.null() }) }),
  )
    .addRules('foo', {
      variables: { v: [{ payload: null }] },
      rules: [{ payload: { a: '{{v}}' } }],
    })

  assertEquals(await data.getPayload('foo'), { a: null })
})

Deno.test('variables in wrapped positions validate against the wrapper', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({ foo: z.strictObject({ a: z.string().nullable() }) }),
  )
    .addRules('foo', {
      variables: { v: [{ payload: null }] },
      rules: [{ payload: { a: '{{v}}' } }],
    })

  assertEquals(await data.getPayload('foo'), { a: null })
})

Deno.test('variables inside union options resolve', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        foo: z.union([z.strictObject({ n: z.number() }), z.boolean()]),
        bar: z.union([z.strictObject({ s: z.string() }), z.number()]),
      }),
  )
    .addRules('foo', {
      variables: { v: [{ payload: 42 }] },
      rules: [{ payload: { n: '{{v}}' } }],
    })
    .addRules('bar', {
      variables: { w: [{ payload: 'resolved' }] },
      rules: [{ payload: { s: '{{w}}' } }],
    })

  assertEquals(await data.getPayload('foo'), { n: 42 })
  // String positions inside unions previously kept the literal placeholder
  assertEquals(await data.getPayload('bar'), { s: 'resolved' })
})

Deno.test('variables inside tuples resolve', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({ foo: z.tuple([z.string(), z.number()]) }),
  )
    .addRules('foo', {
      variables: {
        s: [{ payload: 'str' }],
        n: [{ payload: 7 }],
      },
      rules: [{ payload: ['{{s}}', '{{n}}'] }],
    })

  assertEquals(await data.getPayload('foo'), ['str', 7])
})

Deno.test('variables inside lazy schemas resolve', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({ foo: z.lazy(() => z.strictObject({ n: z.number() })) }),
  )
    .addRules('foo', {
      variables: { v: [{ payload: 42 }] },
      rules: [{ payload: { n: '{{v}}' } }],
    })

  assertEquals(await data.getPayload('foo'), { n: 42 })
})

Deno.test('getPayloads with variables using fallthrough targeting', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        foo: z.strictObject({ a: z.string(), b: z.number() }),
      })
      .useTargeting({
        channel: targetIncludes(z.enum(['foo', 'bar'])),
      })
      .useFallThroughTargeting({
        browser: targetIncludes(z.enum(['chrome', 'edge'])),
      }),
  )
    .addRules('foo', {
      variables: {
        a: [
          {
            targeting: { browser: ['chrome'] },
            payload: 'needs the browser',
          },
          { payload: 'any browser' },
        ],
        b: [{ payload: 1 }],
      },
      rules: [
        {
          targeting: { channel: ['bar'] },
          payload: { a: '{{a}}', b: '{{b}}' },
        },
      ],
    })

  // Fall-through variables must be enveloped exactly as getPayload does,
  // never substituted into payloads as raw {__rules__} objects
  assertEquals(await data.getPayloads('foo', { channel: 'bar' }), [
    await data.getPayload('foo', { channel: 'bar' }),
  ])
})

Deno.test('variables in records', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        foo: z.record(z.string(), z.array(z.number())),
      }),
  )
    .addRules('foo', {
      variables: {
        a: [{ payload: [1, 2, 3] }],
      },
      rules: [{ payload: { a: '{{a}}' } }],
    })

  const payload = await data.getPayload('foo')
  assertEquals(payload, { a: [1, 2, 3] })
})

Deno.test('variables in arrays', async (t) => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        foo: z.array(z.number()),
        bar: z.array(z.strictObject({
          b: z.number(),
          c: z.string(),
        })),
      }),
  ).addRules('foo', {
    variables: {
      a: [{ payload: 1 }],
    },
    rules: [{ payload: ['{{a}}'] }],
  }).addRules('bar', {
    variables: {
      b: [{ payload: 2 }],
      c: [{ payload: '3' }],
    },
    rules: [{ payload: [{ b: '{{b}}', c: '{{c}}' }] }],
  })

  await assertSnapshot(
    t,
    data.data,
  )

  assertEquals(
    await data.getPayload('foo'),
    [1],
  )

  assertEquals(
    await data.getPayload('bar'),
    [{ b: 2, c: '3' }],
  )
})

Deno.test('optional payload properties stay optional', async () => {
  const data = Data.create(
    DataSchema.create().usePayload({
      foo: z.object({
        a: z.string().optional(),
        b: z.string(),
      }),
    }),
  )

  // Omitting the optional property must not error
  const withoutOptional = await (await data).addRules('foo', {
    rules: [{ payload: { b: 'plain' } }],
  })
  assertEquals(await withoutOptional.getPayload('foo'), { b: 'plain' })

  // Variables still resolve inside the optional property when present
  const withOptional = await (await data).addRules('foo', {
    variables: { v: [{ payload: 'resolved' }] },
    rules: [{ payload: { a: '{{v}}', b: 'plain' } }],
  })
  assertEquals(await withOptional.getPayload('foo'), {
    a: 'resolved',
    b: 'plain',
  })
})

Deno.test('errors when using variables with incorrect types', async (t) => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        foo: z.strictObject({
          a: z.strictObject({
            b: z.strictObject({
              c: z.string(),
            }),
          }),
        }),
      }),
  )

  await assertSnapshot(
    t,
    await data.addRules('foo', {
      variables: {
        c: [
          {
            payload: 2,
          },
        ],
      },
      rules: [
        {
          payload: {
            a: {
              b: {
                c: '{{c}}',
              },
            },
          },
        },
      ],
    }).catch((error: ZodError) => error.issues),
  )
})

Deno.test(
  'make sure fallthrough targeting predicates are not called',
  async () => {
    const minInnerWindowWidthTargeting = createTargetingDescriptor({
      queryParser: z.unknown(),
      targetingParser: z.number(),
      requiresQuery: false,
      predicate: () => () => {
        throw new Error('This should never get called')
      },
    })
    const basePayload = DataSchema.create()
      .usePayload({ 'foo': z.string() })
    const clientConfig = basePayload
      .useTargeting({ fft: minInnerWindowWidthTargeting })
    const serverSchema = Data.create(
      basePayload
        .useFallThroughTargeting(clientConfig.targetingParsers),
    ).addRules('foo', {
      variables: {
        x: [{
          targeting: {
            fft: 129,
          },
          payload: 'fft',
        }, {
          payload: 'st',
        }],
      },
      rules: [
        { payload: '{{x}}' },
      ],
    })
    await serverSchema.getPayloadForEachName()
  },
)
