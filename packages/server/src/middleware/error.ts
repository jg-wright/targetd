import type express from 'express'
import { $ZodError } from 'zod/v4/core'

/**
 * Express error handler middleware that formats errors as JSON responses.
 * Handles Zod validation errors (400), StatusError with custom codes, and
 * generic errors.
 *
 * Only the error's status and message are serialized — never the error object
 * itself, which may carry internal details (stack traces, filesystem paths on
 * Node system errors). Unexpected errors are logged server-side and reported
 * to the client as a generic 500.
 *
 * @returns Express ErrorRequestHandler middleware.
 *
 * @internal
 */
export function errorHandler(): express.ErrorRequestHandler {
  return (err, _req, res, next) => {
    if (res.headersSent) return next(err)

    if (err instanceof $ZodError) {
      res.status(400)
      res.json({
        status: 'validation error',
        issues: err.issues,
      })
      return
    }

    const status = typeof err?.status === 'number' ? err.status : 500
    if (status >= 500) console.error(err)
    res.status(status)
    res.json({
      status,
      message: status < 500 && err instanceof Error
        ? err.message
        : 'Internal Server Error',
    })
  }
}
