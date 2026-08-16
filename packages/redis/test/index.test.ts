import { assertEquals, assertRejects } from 'jsr:@std/assert'
import { createClient, type RedisClientType } from 'redis'
import { load, remove, save, watch } from '@targetd/redis'
import { createData } from './fixtures/data.ts'

const REDIS_URL = Deno.env.get('REDIS_URL') ?? 'redis://127.0.0.1:6379'

Deno.test('save then load', async () => {
  await using redis = await useRedis()
  await save(redis.client, {
    greeting: {
      rules: [
        { targeting: { country: ['US'] }, payload: 'Hello!' },
        { payload: 'Hi!' },
      ],
    },
    farewell: { rules: [{ payload: 'Bye!' }] },
  }, { keyPrefix: redis.keyPrefix })

  const data = await load(await createData(), redis.client, {
    keyPrefix: redis.keyPrefix,
  })

  assertEquals(
    await data.getPayload('greeting', { country: 'US' }),
    'Hello!',
  )
  assertEquals(await data.getPayload('greeting'), 'Hi!')
  assertEquals(await data.getPayload('farewell'), 'Bye!')
})

Deno.test('remove deletes stored rules', async () => {
  await using redis = await useRedis()
  await save(redis.client, {
    greeting: { rules: [{ payload: 'Hi!' }] },
    farewell: { rules: [{ payload: 'Bye!' }] },
  }, { keyPrefix: redis.keyPrefix })

  await remove(redis.client, 'greeting', { keyPrefix: redis.keyPrefix })

  const data = await load(await createData(), redis.client, {
    keyPrefix: redis.keyPrefix,
  })
  assertEquals(await data.getPayload('greeting'), undefined)
  assertEquals(await data.getPayload('farewell'), 'Bye!')
})

Deno.test('load rejects invalid JSON with a descriptive error', async () => {
  await using redis = await useRedis()
  await redis.client.set(`${redis.keyPrefix}greeting`, 'not json')
  await assertRejects(
    async () =>
      load(await createData(), redis.client, { keyPrefix: redis.keyPrefix }),
    Error,
    'invalid JSON',
  )
})

Deno.test('watch reloads on change', async () => {
  await using redis = await useRedis()

  await save(redis.client, {
    greeting: { rules: [{ payload: 'Hi!' }] },
  }, { keyPrefix: redis.keyPrefix })

  const { promise: reloaded, resolve: resolveReload } = Promise.withResolvers<
    void
  >()

  const data = await createData()
  let current = data

  await using asyncDispoableStack = new AsyncDisposableStack()
  asyncDispoableStack.adopt(
    await watch(
      data,
      redis.client,
      { keyPrefix: redis.keyPrefix, debounceMS: 50 },
      withCounter((counter, error, next) => {
        if (error) throw error
        current = next
        if (counter > 0) resolveReload?.()
      }),
    ),
    (stop) => stop(),
  )

  assertEquals(await current.getPayload('greeting'), 'Hi!')

  await save(redis.client, {
    greeting: { rules: [{ payload: 'Hey!' }] },
  }, { keyPrefix: redis.keyPrefix })

  await using race = useRace(
    reloaded,
    5000,
    'watch did not reload in time',
  )
  await race.promise

  assertEquals(await current.getPayload('greeting'), 'Hey!')
})

function useRace<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Disposable & { promise: Promise<T> } {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  return {
    promise: Promise.race([promise, timeout]),
    [Symbol.dispose]: () => clearTimeout(timer),
  }
}

async function useRedis(): Promise<
  AsyncDisposable & { client: RedisClientType; keyPrefix: string }
> {
  const keyPrefix = `targetd-test:${crypto.randomUUID()}:`
  const client = createClient({ url: REDIS_URL }) as RedisClientType
  await client.connect()
  return {
    client,
    keyPrefix,
    async [Symbol.asyncDispose]() {
      const keys = await client.keys(`${keyPrefix}*`)
      if (keys.length) await client.del(keys)
      await client.quit()
    },
  }
}

function withCounter<Return, Args extends unknown[]>(
  fn: (counter: number, ...args: Args) => Return,
  start = 0,
): (...args: Args) => Return {
  let counter = start
  return (...args) => fn(counter++, ...args)
}
