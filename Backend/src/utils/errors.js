/** Application error with a stable client-facing code. Never put paths, SQL or tracebacks in `message`. */
export class AppError extends Error {
  constructor(statusCode, code, message, { retryable = false, cause } = {}) {
    super(message, cause ? { cause } : undefined)
    this.statusCode = statusCode
    this.code = code
    this.retryable = retryable
  }
}

export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found.`)
export const badRequest = (code, message) => new AppError(400, code, message)
