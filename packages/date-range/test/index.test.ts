import { assertRejects, assertStrictEquals } from 'jsr:@std/assert'
import { FakeTime } from 'jsr:@std/testing/time'
import { Data, DataSchema } from '@targetd/api'
import z from 'zod'
import dateRangeTargeting from '@targetd/date-range'

Deno.test('date range predicate', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({
        foo: z.string(),
      })
      .useTargeting({
        dateRange: dateRangeTargeting,
      }),
  )
    .addRules('foo', [
      {
        targeting: {
          dateRange: {
            start: '1939-09-01',
            end: '1945-09-02',
          },
        },
        payload: 'WWII',
      },
      {
        targeting: {
          dateRange: {
            start: '2020-01-01T00:00:00',
          },
        },
        payload: '😷',
      },
      {
        payload: 'bar',
      },
    ])

  await assertUsingFakeTime('1930-01-01', 'bar')
  await assertUsingFakeTime('1940-01-01', 'WWII')
  await assertUsingFakeTime('2021-01-01', '😷')
  // Range ends are inclusive
  await assertUsingFakeTime('1945-09-02', 'WWII')
  await assertUsingRange({ start: '2020-01-01' }, '😷')
  await assertUsingRange({ start: '2019-01-01' }, '😷')
  await assertUsingRange({ start: '2019-01-01', end: '2019-12-01' }, 'bar')
  // An end-only query must reach pre-1970 ranges (a missing start is
  // unbounded, not epoch 0)
  await assertUsingRange({ end: '1946-01-01' }, 'WWII')
  await assertUsingRange({ end: '1930-01-01' }, 'bar')

  async function assertUsingFakeTime(iso: string, expectation: string) {
    using _fakeTime = setTime(iso)
    assertStrictEquals(await data.getPayload('foo'), expectation)
  }

  async function assertUsingRange(
    dateRange: NonNullable<
      Required<Parameters<typeof data.getPayload<'foo'>>[1]>
    >['dateRange'],
    expectation: string,
  ) {
    assertStrictEquals(
      await data.getPayload('foo', { dateRange }),
      expectation,
    )
  }
})

Deno.test('invalid calendar dates are rejected', async () => {
  const data = await Data.create(
    DataSchema.create()
      .usePayload({ foo: z.string() })
      .useTargeting({ dateRange: dateRangeTargeting }),
  )
    .addRules('foo', [
      {
        targeting: { dateRange: { start: '2024-01-01' } },
        payload: 'dated',
      },
    ])

  // Shapes that pass the regex but are not real dates
  await assertRejects(() =>
    data.getPayload('foo', { dateRange: { start: '2024-02-30' } })
  )

  await assertRejects(() =>
    Data.create(
      DataSchema.create()
        .usePayload({ foo: z.string() })
        .useTargeting({ dateRange: dateRangeTargeting }),
    ).addRules('foo', [
      {
        targeting: { dateRange: { end: '2100-02-29' } },
        payload: 'never valid',
      },
    ])
  )
})

function setTime(iso: string) {
  const fakeTime = new FakeTime(iso)
  return { [Symbol.dispose]: () => fakeTime.restore() }
}
