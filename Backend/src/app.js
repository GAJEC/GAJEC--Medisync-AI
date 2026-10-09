import { randomUUID } from 'node:crypto'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import authentication from './plugins/authentication.js'
import database from './plugins/database.js'
import { assessmentRepository } from './repositories/assessmentRepository.js'
import { auditRepository } from './repositories/auditRepository.js'
import { fileRepository } from './repositories/fileRepository.js'
import { messageRepository } from './repositories/messageRepository.js'
import { sessionRepository } from './repositories/sessionRepository.js'
import assessmentRoutes from './routes/assessments.js'
import audioRoutes from './routes/audio.js'
import chatRoutes from './routes/chat.js'
import healthRoutes from './routes/health.js'
import imageRoutes from './routes/images.js'
import sessionRoutes from './routes/sessions.js'
import { assessmentResponseSchema, errorSchema, patientContextSchema } from './schemas/common.js'
import { createAiClient } from './services/aiClient.js'
import { createAssessmentService } from './services/assessmentService.js'
import { createFileStorage } from './services/fileStorage.js'
import { AppError } from './utils/errors.js'

/**
 * Build the Fastify app.
 * @param {object} config  from loadConfig()
 * @param {object} [deps]  test injection: { pool, ai, fileStorage }
 */
export async function buildApp(config, deps = {}) {
  const app = Fastify({
    logger:
      deps.logger ??
      {
        level: config.logLevel,
        // Privacy: never log bodies, auth headers, or query strings with content.
        redact: { paths: ['req.headers.authorization', 'req.headers["x-internal-token"]'], remove: true },
        serializers: {
          req: (req) => ({ method: req.method, url: req.url.split('?')[0], reqId: req.id }),
        },
      },
    genReqId: (req) => {
      const incoming = req.headers['x-request-id']
      return typeof incoming === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(incoming) ? incoming : randomUUID()
    },
    bodyLimit: 64 * 1024,
    trustProxy: false,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: 'array', allErrors: false } },
  })

  app.decorate('config', config)

  app.addSchema(errorSchema)
  app.addSchema(patientContextSchema)
  app.addSchema(assessmentResponseSchema)

  await app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } })
  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  })
  await app.register(rateLimit, {
    global: true,
    max: config.rateLimit.globalPerMinute,
    timeWindow: '1 minute',
    errorResponseBuilder: (req, ctx) => {
      const e = new AppError(429, 'RATE_LIMITED', `Too many requests. Try again in ${Math.ceil(ctx.ttl / 1000)}s.`, {
        retryable: true,
      })
      return e
    },
  })
  await app.register(multipart, {
    limits: { fileSize: Math.max(config.uploads.maxImageBytes, config.uploads.maxAudioBytes), files: 1 },
  })

  await app.register(database, { ...config.db, pool: deps.pool })

  const repos = {
    sessions: sessionRepository(app.db),
    messages: messageRepository(app.db),
    files: fileRepository(app.db),
    assessments: assessmentRepository(app.db),
    audit: auditRepository(app.db, app.log),
  }
  app.decorate('repos', repos)
  app.decorate('ai', deps.ai ?? createAiClient(config.ai, app.log))
  app.decorate('fileStorage', deps.fileStorage ?? createFileStorage(config.uploads.dir))
  app.decorate(
    'assessments',
    createAssessmentService({ ai: app.ai, repos, withTransaction: app.withTransaction, config }),
  )

  await app.register(authentication)

  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id)
    reply.header('cache-control', 'no-store')
  })

  app.setErrorHandler((err, request, reply) => {
    const requestId = request.id
    // Fastify schema validation
    if (err.validation) {
      return reply.code(400).send({
        error: { code: 'INVALID_REQUEST', message: `Invalid request: ${err.message}`.slice(0, 300), request_id: requestId },
      })
    }
    if (typeof err.code === 'string' && err.code.startsWith('FST_') && err.statusCode < 500) {
      return reply.code(err.statusCode).send({
        error: { code: 'INVALID_REQUEST', message: 'The request could not be processed.', request_id: requestId },
      })
    }
    if (err instanceof AppError) {
      if (err.statusCode >= 500) request.log.warn({ code: err.code }, 'request failed')
      return reply.code(err.statusCode).send({
        error: { code: err.code, message: err.message, retryable: err.retryable ?? false, request_id: requestId },
      })
    }
    // Unknown errors (including DB errors): log internally, return a generic message.
    request.log.error({ err: { name: err.name, code: err.code, message: err.message } }, 'unhandled error')
    const dbDown = ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ETIMEDOUT'].includes(err.code)
    return reply.code(dbDown ? 503 : 500).send({
      error: {
        code: dbDown ? 'DATABASE_UNAVAILABLE' : 'INTERNAL_ERROR',
        message: dbDown ? 'The database is currently unavailable.' : 'An unexpected error occurred.',
        retryable: dbDown,
        request_id: requestId,
      },
    })
  })

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found.', request_id: request.id } })
  })

  await app.register(healthRoutes)
  await app.register(sessionRoutes)
  await app.register(chatRoutes)
  await app.register(imageRoutes)
  await app.register(audioRoutes)
  await app.register(assessmentRoutes)

  return app
}
