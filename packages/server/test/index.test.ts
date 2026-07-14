import { assertSnapshot } from 'jsr:@std/testing/snapshot'
import { Data, DataSchema, targetEquals, targetIncludes } from '@targetd/api'
import dateRangeTargeting from '@targetd/date-range'
import _ from 'npm:lodash'
import { setTimeout } from 'node:timers/promises'
// @ts-types='npm:@types/supertest'
import request from 'npm:supertest'
import z from 'zod'
import { createServer, type CreateServerOptions } from '@targetd/server'
import { promisify } from 'node:util'
import type { Server } from 'node:http'

Deno.test('get one data point', async (t) => {
  await using server = await createDisposableServer()

  await request(server)
    .get('/foo')
    .expect('Content-Type', /json/)
    .expect('"bar"')
    .expect(200)

  await request(server)
    .get('/foo?weather=sunny')
    .expect('Content-Type', /json/)
    .expect('"😎"')
    .expect(200)

  await request(server)
    .get('/foo?weather=rainy')
    .expect('Content-Type', /json/)
    .expect('"☂️"')
    .expect(200)

  await request(server)
    .get('/foo?highTide=true')
    .expect('Content-Type', /json/)
    .expect('"🌊"')
    .expect(200)

  await request(server)
    .get('/foo?highTide=true&weather=sunny')
    .expect('Content-Type', /json/)
    .expect('"🏄‍♂️"')
    .expect(200)

  await request(server)
    .get('/foo?asyncThing=true')
    .expect('Content-Type', /json/)
    .expect('"Async payload"')
    .expect(200)

  await request(server)
    .get('/timed?date[start]=2002-01-01')
    .expect('Content-Type', /json/)
    .expect('"in time"')
    .expect(200)

  await request(server)
    .get('/timed?date[start]=2012-01-01')
    .expect('Content-Type', /json/)
    .expect('"out of time"')
    .expect(200)

  await request(server)
    .get('/foo?arrayThing=a')
    .expect('Content-Type', /json/)
    .expect('"a t\'ing"')
    .expect(200)

  await request(server)
    .get('/foo?arrayThing=a&arrayThing=b')
    .expect('Content-Type', /json/)
    .expect('"b t\'ing"')
    .expect(200)

  // A numeric-looking value for a string query parser must stay a string
  await request(server)
    .get('/foo?weather=42')
    .expect('Content-Type', /json/)
    .expect('"bar"')
    .expect(200)

  const response = await request(server)
    .get('/foo?weather=rainy&weather=sunny')
    .expect(400)
  await assertSnapshot(t, response.body)
})

Deno.test('get all', async (t) => {
  await using server = await createDisposableServer()

  let response = await request(server)
    .get('/')
    .expect('Content-Type', /json/)
    .expect(200)
  await assertSnapshot(t, response.body)

  response = await request(server)
    .get('/?weather=sunny')
    .expect('Content-Type', /json/)
    .expect(200)
  await assertSnapshot(t, response.body)

  response = await request(server)
    .get('/?weather=rainy')
    .expect('Content-Type', /json/)
    .expect(200)
  await assertSnapshot(t, response.body)

  response = await request(server)
    .get('/?highTide=true')
    .expect('Content-Type', /json/)
    .expect(200)
  await assertSnapshot(t, response.body)

  response = await request(server)
    .get('/?highTide=true&weather=sunny')
    .expect('Content-Type', /json/)
    .expect(200)
  await assertSnapshot(t, response.body)

  response = await request(server)
    .get('/?asyncThing=true')
    .expect('Content-Type', /json/)
    .expect(200)
  await assertSnapshot(t, response.body)
})

async function createDisposableServer(options?: {
  cors?: CreateServerOptions['cors']
  data?: Data
  pathStructure?: string[]
}): Promise<Server & AsyncDisposable> {
  const data = options?.data ?? createData()
  const app = createServer(() => data, {
    cors: options?.cors,
    pathStructure: options?.pathStructure as any,
  })
  const { promise, reject, resolve } = Promise.withResolvers<void>()
  const server = app.listen(0, (error) => error ? reject(error) : resolve())
  await promise
  server[Symbol.asyncDispose] = promisify(server.close.bind(server))
  return server
}

function createData() {
  return Data.create(
    DataSchema.create()
      .usePayload({
        foo: z.string(),
        bar: z.number(),
        timed: z.string(),
      })
      .useTargeting({
        weather: targetIncludes(z.string()),
        highTide: targetEquals(z.boolean()),
        asyncThing: {
          predicate: (q) =>
            setTimeout(10, (t) => q === t && setTimeout(10, true)),
          queryParser: z.boolean(),
          targetingParser: z.boolean(),
        },
        arrayThing: {
          predicate: (q) => (t) => _.difference(q, t).length === 0,
          queryParser: z.string().array(),
          targetingParser: z.string().array(),
        },
        date: dateRangeTargeting,
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
        targeting: {
          arrayThing: ['a'],
        },
        payload: "a t'ing",
      },
      {
        targeting: {
          arrayThing: ['a', 'b'],
        },
        payload: "b t'ing",
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
      {
        payload: 'out of time',
      },
    ])
}

Deno.test('custom path structure', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        content: z.string(),
        config: z.number(),
      })
      .useTargeting({
        region: targetIncludes(z.string()),
        device: targetIncludes(z.string()),
      }),
  )
    .addRules('content', [
      {
        targeting: {
          region: ['US'],
          device: ['mobile'],
        },
        payload: 'US Mobile Content',
      },
      {
        targeting: {
          region: ['US'],
          device: ['desktop'],
        },
        payload: 'US Desktop Content',
      },
      {
        targeting: {
          region: ['EU'],
          device: ['mobile'],
        },
        payload: 'EU Mobile Content',
      },
      {
        targeting: {
          region: ['EU'],
          device: ['desktop'],
        },
        payload: 'EU Desktop Content',
      },
      {
        payload: 'Default Content',
      },
    ])
    .addRules('config', [
      {
        targeting: {
          device: ['mobile'],
        },
        payload: 10,
      },
      {
        targeting: {
          device: ['desktop'],
        },
        payload: 50,
      },
      {
        payload: 5,
      },
    ])

  await using server = await createDisposableServer({
    data,
    pathStructure: ['region', 'device'],
  })

  // Test path-based routing
  await request(server)
    .get('/US/mobile')
    .expect('Content-Type', /json/)
    .expect(200)
    .expect((res) => {
      if (res.body.content !== 'US Mobile Content') {
        throw new Error(
          `Expected "US Mobile Content", got "${res.body.content}"`,
        )
      }
      if (res.body.config !== 10) {
        throw new Error(`Expected 10, got "${res.body.config}"`)
      }
    })

  await request(server)
    .get('/US/desktop')
    .expect('Content-Type', /json/)
    .expect(200)
    .expect((res) => {
      if (res.body.content !== 'US Desktop Content') {
        throw new Error(
          `Expected "US Desktop Content", got "${res.body.content}"`,
        )
      }
      if (res.body.config !== 50) {
        throw new Error(`Expected 50, got "${res.body.config}"`)
      }
    })

  await request(server)
    .get('/EU/mobile')
    .expect('Content-Type', /json/)
    .expect(200)
    .expect((res) => {
      if (res.body.content !== 'EU Mobile Content') {
        throw new Error(
          `Expected "EU Mobile Content", got "${res.body.content}"`,
        )
      }
    })

  await request(server)
    .get('/EU/desktop')
    .expect('Content-Type', /json/)
    .expect(200)
    .expect((res) => {
      if (res.body.content !== 'EU Desktop Content') {
        throw new Error(
          `Expected "EU Desktop Content", got "${res.body.content}"`,
        )
      }
    })

  // Test with no matching rules - should return defaults
  await request(server)
    .get('/UNKNOWN/tablet')
    .expect('Content-Type', /json/)
    .expect(200)
    .expect((res) => {
      if (res.body.content !== 'Default Content') {
        throw new Error(
          `Expected "Default Content", got "${res.body.content}"`,
        )
      }
      if (res.body.config !== 5) {
        throw new Error(`Expected 5, got "${res.body.config}"`)
      }
    })

  // The single payload endpoint remains reachable alongside a path structure
  await request(server)
    .get('/content?region=US&device=mobile')
    .expect('Content-Type', /json/)
    .expect('"US Mobile Content"')
    .expect(200)

  // ...and so does the all-matching-payloads endpoint
  await request(server)
    .get('/content/all?region=EU&device=mobile')
    .expect('Content-Type', /json/)
    .expect(200)
    .expect((res) => {
      if (!Array.isArray(res.body) || res.body[0] !== 'EU Mobile Content') {
        throw new Error(
          `Expected all matching payloads, got ${JSON.stringify(res.body)}`,
        )
      }
    })

  // Path values that collide with reserved segments fall through to the
  // path structure route
  await request(server)
    .get('/US/all')
    .expect('Content-Type', /json/)
    .expect(200)
    .expect((res) => {
      if (res.body.content !== 'Default Content') {
        throw new Error(
          `Expected "Default Content", got "${res.body.content}"`,
        )
      }
    })
})

Deno.test('get all matching payloads', async (t) => {
  await using server = await createDisposableServer()

  let response = await request(server)
    .get('/foo/all')
    .expect('Content-Type', /json/)
    .expect(200)
  await assertSnapshot(t, response.body)

  response = await request(server)
    .get('/foo/all?weather=sunny')
    .expect('Content-Type', /json/)
    .expect(200)
  await assertSnapshot(t, response.body)

  response = await request(server)
    .get('/foo/all?highTide=true&weather=sunny')
    .expect('Content-Type', /json/)
    .expect(200)
  await assertSnapshot(t, response.body)

  // Empty results
  response = await request(server)
    .get('/timed/all')
    .expect('Content-Type', /json/)
    .expect(200)
  await assertSnapshot(t, response.body)

  // 404 for unknown name
  await request(server)
    .get('/nonexistent/all')
    .expect(404)
})

Deno.test('cors configuration', async () => {
  // Default: any origin
  {
    await using server = await createDisposableServer()
    await request(server)
      .get('/foo')
      .expect('Access-Control-Allow-Origin', '*')
      .expect(200)
  }

  // Restricted to a specific origin
  {
    await using server = await createDisposableServer({
      cors: { origin: 'https://example.com' },
    })
    await request(server)
      .get('/foo')
      .expect('Access-Control-Allow-Origin', 'https://example.com')
      .expect(200)
  }

  // Disabled entirely
  {
    await using server = await createDisposableServer({ cors: false })
    const response = await request(server).get('/foo').expect(200)
    if ('access-control-allow-origin' in response.headers) {
      throw new Error('Expected no CORS headers when disabled')
    }
  }
})

Deno.test('error handling', async (t) => {
  await using server = await createDisposableServer()

  // Test 404 for non-existent payload name — the body carries the message
  await request(server)
    .get('/nonexistent')
    .expect('Content-Type', /json/)
    .expect(404, { status: 404, message: 'Unknown data property nonexistent' })

  // Test 400 for invalid query parameter (Zod validation error)
  let response = await request(server)
    .get('/foo?weather=rainy&weather=sunny')
    .expect('Content-Type', /json/)
    .expect(400)
  await assertSnapshot(t, response.body)

  // Test 400 for invalid boolean value
  response = await request(server)
    .get('/foo?highTide=notaboolean')
    .expect('Content-Type', /json/)
    .expect(400)
  await assertSnapshot(t, response.body)
})
