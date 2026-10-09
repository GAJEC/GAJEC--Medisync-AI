/** GET /api/health - backend, database, AI service, and per-model readiness. No secrets or paths. */
export default async function healthRoutes(fastify) {
  fastify.get(
    '/api/health',
    {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok', 'degraded'] },
              backend: { type: 'string' },
              database: { type: 'string', enum: ['up', 'down'] },
              ai_service: { type: 'string', enum: ['up', 'down'] },
              models: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: { enabled: { type: 'boolean' }, state: { type: 'string' } },
                },
              },
              features: {
                type: 'object',
                properties: {
                  chat: { type: 'boolean' },
                  image_analysis: { type: 'boolean' },
                  transcription: { type: 'boolean' },
                  voice_analysis: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const [dbUp, aiUp] = await Promise.all([fastify.dbHealthy(), fastify.ai.health()])
      let models = {}
      if (aiUp) {
        try {
          const status = await fastify.ai.modelStatus(request.id)
          for (const [k, v] of Object.entries(status.models ?? {})) {
            models[k] = { enabled: Boolean(v.enabled), state: String(v.state) }
          }
        } catch {
          models = {}
        }
      }
      const ready = (k) => aiUp && models[k]?.state === 'ready'
      const features = {
        chat: ready('medgemma'),
        image_analysis: ready('medgemma'),
        transcription: ready('whisper'),
        voice_analysis: fastify.config.features.voiceAnalysis && ready('meralion'),
      }
      return {
        status: dbUp && features.chat ? 'ok' : 'degraded',
        backend: 'up',
        database: dbUp ? 'up' : 'down',
        ai_service: aiUp ? 'up' : 'down',
        models,
        features,
      }
    },
  )
}
