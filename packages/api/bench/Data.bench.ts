// Query-path benchmarks. Run with `deno task bench`; compare two revisions
// with `deno bench --json` output from each.
import z from 'zod'
import { Data, DataSchema, targetIncludes } from '../src/index.ts'

const TARGETING_KEYS = 20
const RULES = 200
const NAMES = 50

const wideData = await createWideData()
const manyNamesData = await createManyNamesData()

Deno.bench('getPayload — full scan to default rule', async () => {
  await wideData.getPayload('foo', { t3: 'no-match' })
})

Deno.bench('getPayload — first-match early exit', async () => {
  await wideData.getPayload('foo', { t0: 'v0', t1: 'w0' })
})

Deno.bench('getPayloads — all matches', async () => {
  await wideData.getPayloads('foo', { t3: 'no-match' })
})

Deno.bench('getPayloadForEachName — 50 names', async () => {
  await manyNamesData.getPayloadForEachName({ t3: 'no-match' })
})

Deno.bench('addRules — parse 200 rules', async () => {
  await Data.create(wideSchema()).addRules('foo', wideRules())
})

function targetingShape() {
  const targeting: Record<string, ReturnType<typeof targetIncludes>> = {}
  for (let i = 0; i < TARGETING_KEYS; i++) {
    targeting[`t${i}`] = targetIncludes(z.string())
  }
  return targeting
}

function wideSchema() {
  return DataSchema.create()
    .usePayload({ foo: z.string() })
    .useTargeting(targetingShape())
}

function wideRules() {
  const rules: any[] = []
  for (let i = 0; i < RULES; i++) {
    rules.push({
      targeting: {
        [`t${i % TARGETING_KEYS}`]: [`v${i}`],
        [`t${(i + 1) % TARGETING_KEYS}`]: [`w${i}`],
      },
      payload: `p${i}`,
    })
  }
  rules.push({ payload: 'default' })
  return rules
}

async function createWideData() {
  return await Data.create(wideSchema()).addRules('foo', wideRules())
}

async function createManyNamesData() {
  const payloads: Record<string, z.ZodString> = {}
  for (let i = 0; i < NAMES; i++) payloads[`name${i}`] = z.string()

  let data = Data.create(
    DataSchema.create()
      .usePayload(payloads)
      .useTargeting(targetingShape()),
  )
  for (let i = 0; i < NAMES; i++) {
    data = data.addRules(`name${i}`, [
      { targeting: { [`t${i % TARGETING_KEYS}`]: ['x'] }, payload: 'targeted' },
      { payload: 'default' },
    ])
  }
  return await data
}
