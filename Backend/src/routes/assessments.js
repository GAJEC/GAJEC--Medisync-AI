import { authHeader, errorResponses } from '../schemas/common.js'
import { notFound } from '../utils/errors.js'

/** GET /api/assessments/:id - only assessments belonging to the caller's session. */
export default async function assessmentRoutes(fastify) {
  fastify.get(
    '/api/assessments/:id',
    {
      onRequest: fastify.authenticate,
      schema: {
        headers: authHeader,
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } },
        response: { ...errorResponses },
      },
    },
    async (request) => {
      const a = await fastify.assessments.get(request.params.id, request.session.id)
      if (!a) throw notFound('Assessment')
      return a
    },
  )
}
