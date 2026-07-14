import { assertStrictEquals } from 'jsr:@std/assert'
import { setTimeout } from 'node:timers/promises'
import * as path from 'node:path'
import { copy } from 'jsr:@std/fs/copy'
import { data } from './fixtures/data.ts'
import { watch } from '@targetd/fs'

Deno.test('watch picks up changes in subdirectories', async () => {
  const { promise, reject, resolve } = Promise.withResolvers<void>()

  await using disposable = new AsyncDisposableStack()

  const dir = disposable.adopt(
    await Deno.makeTempDir(),
    (path) => Deno.remove(path, { recursive: true }),
  )
  await Deno.mkdir(path.join(dir, 'nested'))
  await Deno.writeTextFile(
    path.join(dir, 'top.json'),
    JSON.stringify({ foo: { rules: [{ payload: 'top' }] } }),
  )

  let firstCall = true

  disposable.adopt(
    watch(
      data,
      dir,
      async (error, data) => {
        try {
          assertStrictEquals(error, null)
          if (firstCall) {
            firstCall = false
            assertStrictEquals(await data.getPayload('foo'), 'top')
            await Deno.writeTextFile(
              path.join(dir, 'nested', 'sub.json'),
              JSON.stringify({ b: { rules: [{ payload: 'from nested' }] } }),
            )
          } else if (await data.getPayload('b') === 'from nested') {
            resolve()
          }
        } catch (error) {
          reject(error)
        }
      },
    ),
    (stopWatching) => stopWatching(),
  )

  await promise
})

Deno.test('stop() prevents further onLoad calls', async () => {
  await using disposable = new AsyncDisposableStack()

  const dir = disposable.adopt(
    await Deno.makeTempDir(),
    (path) => Deno.remove(path, { recursive: true }),
  )

  let calls = 0
  const stopWatching = watch(data, dir, () => {
    calls++
  })
  stopWatching()

  await setTimeout(500)
  assertStrictEquals(calls, 0)
})

Deno.test('watch', async () => {
  const { promise, reject, resolve } = Promise.withResolvers<void>()

  await using disposable = new AsyncDisposableStack()

  const dirTo = disposable.adopt(
    await Deno.makeTempDir(),
    (path) => Deno.remove(path, { recursive: true }),
  )

  let firstCall = true

  disposable.adopt(
    watch(
      data,
      dirTo,
      async (error, data) => {
        if (firstCall) {
          firstCall = false
          await setTimeout(100)
          copy(
            path.join(import.meta.dirname ?? '', 'fixtures', 'rules'),
            dirTo,
            {
              overwrite: true,
            },
          )
        } else {
          try {
            assertStrictEquals(error, null)
            assertStrictEquals(await data.getPayload('foo', {}), 'bar')
            assertStrictEquals(await data.getPayload('b', {}), 'b is a letter')
          } catch (error) {
            return reject(error)
          }
          resolve()
        }
      },
    ),
    (stopWatching) => stopWatching(),
  )

  await promise
})
