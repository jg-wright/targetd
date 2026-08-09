import { Data, DataSchema, targetIncludes } from '@targetd/api'
import { string, z } from 'zod'

export function createData() {
  return Data.create(
    DataSchema.create()
      .usePayload({
        greeting: z.string(),
        farewell: z.string(),
      })
      .useTargeting({ country: targetIncludes(string()) }),
  )
}
