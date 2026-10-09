import { authHeader, errorResponses } from '../schemas/common.js'
import { badRequest, notFound } from '../utils/errors.js'

/** POST /api/chat - symptom intake turn via MedGemma + deterministic safety layer. */
export default async function chatRoutes(fastify) {
  fastify.post(
    '/api/chat',
    {
      onRequest: fastify.authenticate,
      config: { rateLimit: { max: fastify.config.rateLimit.inferencePerMinute, timeWindow: '1 minute' } },
      schema: {
        headers: authHeader,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['session_id', 'message'],
          properties: {
            session_id: { type: 'string', format: 'uuid' },
            message: { type: 'string', minLength: 1, maxLength: 4000 },
            input_mode: { type: 'string', enum: ['text', 'voice'], default: 'text' },
            patient_context: { $ref: 'PatientContext#' },
          },
        },
        response: { 200: { $ref: 'AssessmentResponse#' }, ...errorResponses },
      },
    },
    async (request) => {
      const { session_id, message, input_mode, patient_context } = request.body
      if (session_id !== request.session.id) throw notFound('Session')
      const text = message.trim()
      if (!text) throw badRequest('EMPTY_MESSAGE', 'Message must not be empty.')
      try {
        const result = await fastify.assessments.chat({
          session: request.session, message: text, inputMode: input_mode, patientContext: patient_context,
          requestId: request.id,
        })
        await fastify.repos.audit.record({
          sessionId: request.session.id, eventType: 'chat.assessed', requestId: request.id,
          detail: { triage: result.triage.level, override: result.triage.safety_override,
            validated: result.uncertainty.output_validated, input_mode },
        })
        await fastify.repos.sessions.touch(request.session.id)
        return result
      } catch (err) {
        await fastify.repos.audit.record({
          sessionId: request.session.id, eventType: 'chat.assessed', outcome: 'failure', requestId: request.id,
          detail: { code: err.code ?? 'INTERNAL' },
        })
        throw err
      }
    },
  )
}
