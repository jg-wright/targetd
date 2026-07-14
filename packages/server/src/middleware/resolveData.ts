import type { Data, DataSchema } from '@targetd/api'
import type { RequestHandler } from 'express'
import type { MaybePromise } from '../types.ts'

/**
 * Express middleware that resolves the Data instance once per request and
 * stores it on `res.locals.data`, so all subsequent middleware and handlers
 * observe the same Data instance even when it is hot-reloaded between
 * requests.
 *
 * @internal
 */
export function resolveData<$ extends DataSchema>(
  getData: () => MaybePromise<Data<$>>,
): RequestHandler {
  return async (_req, res, next) => {
    res.locals.data = await getData()
    next()
  }
}
