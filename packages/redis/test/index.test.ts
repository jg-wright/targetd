import { assertEquals, assertRejects } from 'jsr:@std/assert'
import { createClient, type RedisClientType } from 'redis'
import { load, remove, save, watch } from '@targetd/redis'
import { createData } from './fixtures/data.ts'

const REDIS_URL = Deno.env.get('REDIS_URL') ?? 'redis://127.0.0.1:6379'

/**
 * Tests need a live Redis. Locally they are skipped when none is reachable, so
 * the suite stays green without one. In CI (where a Redis service is provided)
 * an unreachable server is a real failure, so the tests must run instead.
 */
const redisRequired = Deno.env.get('CI') === 'true'
const redisAvailable = await canConnect()

if (redisRequired && !redisAvailable) {
  throw new Error(
    `Redis is required in CI but was unreachable at ${REDIS_URL}. ` +
      'Ensure the redis service is running.',
  )
}

async function canConnect(): Promise<boolean> {
  let client: RedisClientType | undefined
  try {
    client = createClient({
      url: REDIS_URL,
      socket: { connectTimeout: 500, reconnectStrategy: false },
    })
    client.on('error', () => {})
    await client.connect()
    await client.ping()
    return true
  } catch {
    return false
  } finally {
    try {
      await client?.quit()
    } catch { /* ignore */ }
  }
}

async function withClient(
  keyPrefix: string,
  fn: (redis: RedisClientType) => Promise<void>,
) {
  const redis = createClient({ url: REDIS_URL }) as RedisClientType
  redis.on('error', () => {})
  await redis.connect()
  try {
    await fn(redis)
  } finally {
    const keys = await redis.keys(`${keyPrefix}*`)
    if (keys.length) await redis.del(keys)
    await redis.quit()
  }
}

// Unique prefix per test run avoids collisions with real data or parallel runs.
function uniquePrefix() {
  return `targetd-test:${crypto.randomUUID()}:`
}

Deno.test({
  name: 'save then load',
  ignore: !redisAvailable,
  fn: () => {
    const keyPrefix = uniquePrefix()
    return withClient(keyPrefix, async (redis) => {
      await save(redis, {
        greeting: {
          rules: [
            { targeting: { country: ['US'] }, payload: 'Hello!' },
            { payload: 'Hi!' },
          ],
        },
        farewell: { rules: [{ payload: 'Bye!' }] },
      }, { keyPrefix })

      const data = await load(await createData(), redis, { keyPrefix })

      assertEquals(
        await data.getPayload('greeting', { country: 'US' }),
        'Hello!',
      )
      assertEquals(await data.getPayload('greeting'), 'Hi!')
      assertEquals(await data.getPayload('farewell'), 'Bye!')
    })
  },
})

Deno.test({
  name: 'remove deletes stored rules',
  ignore: !redisAvailable,
  fn: () => {
    const keyPrefix = uniquePrefix()
    return withClient(keyPrefix, async (redis) => {
      await save(redis, {
        greeting: { rules: [{ payload: 'Hi!' }] },
        farewell: { rules: [{ payload: 'Bye!' }] },
      }, { keyPrefix })

      await remove(redis, 'greeting', { keyPrefix })

      const data = await load(await createData(), redis, { keyPrefix })
      assertEquals(await data.getPayload('greeting'), undefined)
      assertEquals(await data.getPayload('farewell'), 'Bye!')
    })
  },
})

Deno.test({
  name: 'load rejects invalid JSON with a descriptive error',
  ignore: !redisAvailable,
  fn: () => {
    const keyPrefix = uniquePrefix()
    return withClient(keyPrefix, async (redis) => {
      await redis.set(`${keyPrefix}greeting`, 'not json')
      await assertRejects(
        async () => load(await createData(), redis, { keyPrefix }),
        Error,
        'invalid JSON',
      )
    })
  },
})

Deno.test({
  name: 'watch reloads on change',
  ignore: !redisAvailable,
  fn: () => {
    const keyPrefix = uniquePrefix()
    return withClient(keyPrefix, async (redis) => {
      await save(redis, {
        greeting: { rules: [{ payload: 'Hi!' }] },
      }, { keyPrefix })

      let resolveReload: (() => void) | undefined
      const data = await createData()
      let current = data
      let sawInitial = false

      const stop = await watch(
        data,
        redis,
        { keyPrefix, debounceMS: 50 },
        (error, next) => {
          if (error) throw error
          current = next
          if (sawInitial) resolveReload?.()
          sawInitial = true
        },
      )

      try {
        assertEquals(await current.getPayload('greeting'), 'Hi!')

        const reloaded = new Promise<void>((resolve) => {
          resolveReload = resolve
        })
        await save(redis, {
          greeting: { rules: [{ payload: 'Hey!' }] },
        }, { keyPrefix })

        await withTimeout(reloaded, 5000, 'watch did not reload in time')
        assertEquals(await current.getPayload('greeting'), 'Hey!')
      } finally {
        await stop()
      }
    })
  },
})

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() =>
    clearTimeout(timer)
  ) as Promise<T>
}
