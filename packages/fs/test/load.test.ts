import { assertRejects, assertStrictEquals } from 'jsr:@std/assert'
import * as path from 'node:path'
import { load } from '@targetd/fs'
import { data } from './fixtures/data.ts'

Deno.test('load', async () => {
  const $data = await load(
    data,
    path.join(import.meta.dirname ?? '', 'fixtures', 'rules'),
  )
  assertStrictEquals(await $data.getPayload('foo'), 'bar')
  assertStrictEquals(await $data.getPayload('b'), 'b is a letter')
})

Deno.test('load rejects null rule values with a descriptive error', async () => {
  const dir = await Deno.makeTempDir()
  try {
    await Deno.writeTextFile(path.join(dir, 'broken.yaml'), 'foo:\n')
    await assertRejects(
      () => load(data, dir),
      Error,
      'Cannot add rules for "foo"',
    )
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
})
