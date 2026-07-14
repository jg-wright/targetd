import type { Data, DataSchema, QT } from '@targetd/api'
import cors from 'cors'
import express from 'express'
import { errorHandler } from './middleware/error.ts'
import { StatusError } from './StatusError.ts'
import { castQuery } from './middleware/castQuery.ts'
import { resolveData } from './middleware/resolveData.ts'
import type { MaybeCallable, MaybePromise } from './types.ts'

/**
 * Configuration options for createServer.
 */
export interface CreateServerOptions<
  $ extends DataSchema = DataSchema,
  App extends express.Express = express.Express,
> {
  /**
   * Existing Express app to extend. If not provided, a new Express app is created.
   */
  app?: App
  /**
   * CORS configuration, passed to the `cors` middleware. Defaults to
   * allowing all origins. Pass `false` to disable the middleware entirely
   * (e.g. to mount your own).
   */
  cors?: cors.CorsOptions | boolean
  /**
   * Array of query parameter names to use as path segments for REST-friendly URLs.
   *
   * Payload-name routes take precedence: a single path segment that matches a
   * payload name is served by the `/:name` endpoint, not the path structure.
   *
   * @example
   * ```ts
   * pathStructure: ['region', 'language']
   * // Creates route: /:region/:language
   * // GET /US/en is equivalent to /?region=US&language=en
   * ```
   */
  pathStructure?: (keyof $['queryParsers'])[]
}

/**
 * Create an Express HTTP server that exposes Data targeting endpoints.
 * Provides REST API access to @targetd/api Data instances.
 *
 * @param data - Data instance or function returning Data (for dynamic data).
 * @param options - Server configuration options.
 * @param options.app - Existing Express app to extend (creates new one if not provided).
 * @param options.pathStructure - Array of query parameter names to use as path segments for REST-friendly URLs.
 * @returns Express application instance with targeting endpoints.
 *
 * @example Basic server:
 * ```ts
 * import { Data, DataSchema, targetIncludes } from '@targetd/api'
 * import { createServer } from '@targetd/server'
 * import { z } from 'zod'
 *
 * const data = await Data.create(
 *   DataSchema.create()
 *     .usePayload({ greeting: z.string() })
 *     .useTargeting({ country: targetIncludes(z.string()) }),
 * ).addRules('greeting', [
 *   { targeting: { country: ['US'] }, payload: 'Hello!' },
 *   { payload: 'Hi!' }
 * ])
 *
 * createServer(data).listen(3000)
 * // GET /greeting?country=US → "Hello!"
 * // GET / → {"greeting":"Hi!"}
 * ```
 *
 * @example With path structure:
 * ```ts
 * createServer(data, {
 *   pathStructure: ['region', 'language']
 * }).listen(3000)
 * // GET /US/en → equivalent to /?region=US&language=en
 * ```
 *
 * @example Dynamic data with hot reloading:
 * ```ts
 * let currentData = baseData
 * watch(baseData, './rules', (error, data) => {
 *   if (!error) currentData = data
 * })
 *
 * createServer(() => currentData).listen(3000)
 * ```
 */
export function createServer<
  $ extends DataSchema,
  App extends express.Express = express.Express,
>(
  data: MaybeCallable<MaybePromise<Data<$>>>,
  {
    app = express() as App,
    cors: corsConfig = true,
    pathStructure,
  }: CreateServerOptions<$, App> = {},
): App {
  const getData = typeof data === 'function' ? data : () => data
  const hasPathStructure = !!pathStructure?.length

  let server = app.set('query parser', 'extended')

  if (corsConfig !== false) {
    server = server.use(cors(corsConfig === true ? undefined : corsConfig))
  }

  server = server
    .get(
      '/:name/all',
      resolveData(getData),
      castQuery(),
      async (req, res, next) => {
        const data = res.locals.data as Data<$>
        const name = req.params.name as string

        if (!(name in data.payloadParsers)) {
          if (hasPathStructure) return next('route')
          throw new StatusError(404, `Unknown data property ${name}`)
        }

        res.json(
          await data.getPayloads(
            name,
            res.locals.query as QT.Raw<$['queryParsers']>,
          ),
        )
      },
    )
    .get(
      '/:name',
      resolveData(getData),
      castQuery(),
      async (req, res, next) => {
        const data = res.locals.data as Data<$>
        const name = req.params.name as string

        if (!(name in data.payloadParsers)) {
          if (hasPathStructure) return next('route')
          throw new StatusError(404, `Unknown data property ${name}`)
        }

        const payload = await data.getPayload(
          name,
          res.locals.query as QT.Raw<$['queryParsers']>,
        )

        if (payload === undefined) res.sendStatus(204)
        else res.json(payload)
      },
    )

  if (hasPathStructure) {
    server = server.get(
      `/:${pathStructure!.join('/:')}`,
      resolveData(getData),
      castQuery(),
      async (req, res) => {
        res.json(
          await (res.locals.data as Data<$>).getPayloadForEachName(
            {
              ...req.params,
              ...(res.locals.query as object),
            } as QT.Raw<$['queryParsers']>,
          ),
        )
      },
    )
  }

  return server
    .get(
      '/',
      resolveData(getData),
      castQuery(),
      async (_req, res) => {
        res.json(
          await (res.locals.data as Data<$>).getPayloadForEachName(
            res.locals.query as QT.Raw<$['queryParsers']>,
          ),
        )
      },
    )
    .use(errorHandler())
}
