import { randomUUID } from 'node:crypto'
import { hashToken, newToken } from '../plugins/authentication.js'
import { authHeader, errorResponses } from '../schemas/common.js'
import { notFound } from '../utils/errors.js'

export default async function sessionRoutes(fastify) {
  const { sessions, messages, audit } = fastify.repos
  const { ttlHours } = fastify.config.session

  // POST /api/sessions - start an anonymous demo session.
  fastify.post(
    '/api/sessions',
    {
      config: { rateLimit: { max: fastify.config.rateLimit.sessionsPerHour, timeWindow: '1 hour' } },
      schema: {
        body: {
          type: ['object', 'null'],
          additionalProperties: false,
          properties: { reply_language: { type: 'string', enum: ['auto', 'en', 'fil'], default: 'auto' } },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              session_id: { type: 'string' },
              token: { type: 'string' },
              expires_at: { type: 'string' },
              mode: { type: 'string' },
              notice: { type: 'string' },
            },
          },
          ...errorResponses,
        },
      },
    },
    async (request, reply) => {
      const id = randomUUID()
      const token = newToken()
      const s = await sessions.create({
        id, tokenHash: hashToken(token), replyLanguage: request.body?.reply_language ?? 'auto', ttlHours,
      })
      await audit.record({ sessionId: id, eventType: 'session.created', requestId: request.id })
      reply.code(201)
      return {
        session_id: id,
        token,
        expires_at: new Date(s.expires_at).toISOString(),
        mode: 'demo',
        notice: 'Demo session: anonymous, stored on this server for a limited time, and not linked to a verified identity.',
      }
    },
  )

  // PATCH /api/sessions/:id - update preferences (reply language).
  fastify.patch(
    '/api/sessions/:id',
    {
      onRequest: fastify.authenticate,
      schema: {
        headers: authHeader,
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['reply_language'],
          properties: { reply_language: { type: 'string', enum: ['auto', 'en', 'fil'] } },
        },
        response: { 204: { type: 'null' }, ...errorResponses },
      },
    },
    async (request, reply) => {
      if (request.params.id !== request.session.id) throw notFound('Session')
      await sessions.setLanguage(request.session.id, request.body.reply_language)
      reply.code(204).send()
    },
  )

  // DELETE /api/sessions/:id - end the session (token stops working).
  fastify.delete(
    '/api/sessions/:id',
    {
      onRequest: fastify.authenticate,
      schema: {
        headers: authHeader,
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } },
        response: { 204: { type: 'null' }, ...errorResponses },
      },
    },
    async (request, reply) => {
      if (request.params.id !== request.session.id) throw notFound('Session')
      await sessions.close(request.session.id)
      await audit.record({ sessionId: request.session.id, eventType: 'session.closed', requestId: request.id })
      reply.code(204).send()
    },
  )

  // GET /api/sessions/:id/messages - authorized conversation history.
  fastify.get(
    '/api/sessions/:id/messages',
    {
      onRequest: fastify.authenticate,
      schema: {
        headers: authHeader,
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } },
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            before_id: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              session_id: { type: 'string' },
              reply_language: { type: 'string' },
              messages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    role: { type: 'string' },
                    input_mode: { type: ['string', 'null'] },
                    content: { type: 'string' },
                    has_attachment: { type: 'boolean' },
                    assessment_id: { type: ['string', 'null'] },
                    created_at: { type: 'string' },
                  },
                },
              },
            },
          },
          ...errorResponses,
        },
      },
    },
    async (request) => {
      // Ownership: a token can only read its own session. Return 404 (not 403) to avoid ID probing.
      if (request.params.id !== request.session.id) throw notFound('Session')
      const rows = await messages.listForSession(request.session.id, {
        beforeId: request.query.before_id ?? null,
        limit: request.query.limit,
      })
      return {
        session_id: request.session.id,
        reply_language: request.session.reply_language,
        messages: rows.map((m) => ({
          id: Number(m.id),
          role: m.role,
          input_mode: m.input_mode,
          content: m.content,
          has_attachment: Boolean(m.file_id),
          assessment_id: m.assessment_id ?? null,
          created_at: new Date(m.created_at).toISOString(),
        })),
      }
    },
  )

}
