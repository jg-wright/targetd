import { assertStrictEquals } from 'jsr:@std/assert'
import { assertSnapshot } from 'jsr:@std/testing/snapshot'
import { Data, DataSchema, targetEquals, targetIncludes } from '@targetd/api'
import dateRangeTargeting from '@targetd/date-range'
import { createServer } from '@targetd/server'
import type { AddressInfo } from 'node:net'
import { setTimeout } from 'node:timers/promises'
import z from 'zod'
import { Client } from '@targetd/client'
import { promisify } from 'node:util'

const schema = DataSchema.create()
  .usePayload({
    foo: z.string(),
    bar: z.number(),
    timed: z.string(),
  })
  .useTargeting({
    weather: targetIncludes(z.string()),
    highTide: targetEquals(z.boolean()),
    asyncThing: {
      predicate: (q) => setTimeout(10, (t) => q === t && setTimeout(10, true)),
      queryParser: z.boolean(),
      targetingParser: z.boolean(),
    },
    date: dateRangeTargeting,
  })

const data = await Data.create(schema)
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
  .addRules('bar', [
    {
      payload: 123,
    },
  ])
  .addRules('timed', [
    {
      targeting: {
        date: { start: '2001-01-01', end: '2010-01-01' },
      },
      payload: 'in time',
    },
  ])

Deno.test('get one data point', async (t) => {
  await using service = await startService()
  const { client } = service

  assertStrictEquals(await client.getPayload('foo'), 'bar')
  assertStrictEquals(await client.getPayload('foo', { weather: 'sunny' }), '😎')
  assertStrictEquals(await client.getPayload('foo', { weather: 'rainy' }), '☂️')
  assertStrictEquals(await client.getPayload('foo', { highTide: true }), '🌊')
  assertStrictEquals(
    await client.getPayload('foo', { highTide: true, weather: 'sunny' }),
    '🏄‍♂️',
  )
  await assertSnapshot(t, await client.getPayload('foo', { asyncThing: true }))
  await assertSnapshot(
    t,
    await client.getPayload('timed', { date: { start: '2002-01-01' } }),
  )
  assertStrictEquals(
    await client.getPayload('timed', { date: { start: '2012-01-01' } }),
    undefined,
  )
})

Deno.test('get all', async (t) => {
  await using service = await startService()
  const { client } = service

  await assertSnapshot(t, await client.getPayloadForEachName())
  await assertSnapshot(
    t,
    await client.getPayloadForEachName({ weather: 'sunny' }),
  )
  await assertSnapshot(
    t,
    await client.getPayloadForEachName({ weather: 'rainy' }),
  )
  await assertSnapshot(
    t,
    await client.getPayloadForEachName({ highTide: true }),
  )
  await assertSnapshot(
    t,
    await client.getPayloadForEachName({ highTide: true, weather: 'sunny' }),
  )
  await assertSnapshot(
    t,
    await client.getPayloadForEachName({ asyncThing: true }),
  )
})

Deno.test('get all matching payloads', async (t) => {
  await using service = await startService()
  const { client } = service

  await assertSnapshot(t, await client.getPayloads('foo'))
  await assertSnapshot(t, await client.getPayloads('foo', { weather: 'sunny' }))
  await assertSnapshot(
    t,
    await client.getPayloads('foo', { highTide: true, weather: 'sunny' }),
  )
})

async function startService(): Promise<
  AsyncDisposable & { client: Client<typeof schema> }
> {
  const app = createServer(data)
  const { promise, reject, resolve } = Promise.withResolvers<void>()
  const server = app.listen(0, (error) => error ? reject(error) : resolve())
  await promise
  const address = server.address() as AddressInfo
  const client = await Client.create(
    `http://localhost:${address.port}`,
    schema,
  )
  return {
    client,
    [Symbol.asyncDispose]: promisify(server.close.bind(server)),
  }
}
