// Direct access to Syncia (the MediSync AI assistant) for signed-in users: /api/ai/*.
import {
  chatWithAI,
  getAIModelStatus,
  getAIReadiness,
} from '../controllers/aiControllers.js';
import { authenticate } from '../middlewares/middleware.js';

const historyMessage = {
  type: 'object',
  required: ['role', 'content'],
  additionalProperties: false,
  properties: {
    role: { type: 'string', enum: ['user', 'assistant'] },
    content: { type: 'string', maxLength: 8000 },
  },
};

const chatSchema = {
  body: {
    type: 'object',
    required: ['message'],
    additionalProperties: false,
    properties: {
      message: { type: 'string', minLength: 1, maxLength: 8000 },
      history: { type: 'array', maxItems: 60, items: historyMessage },
      patient_context: {
        type: 'object',
        additionalProperties: false,
        properties: {
          age_years: { type: 'integer', minimum: 0, maximum: 120 },
          sex: { type: 'string', enum: ['female', 'male', 'other', 'unspecified'] },
          known_conditions: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 200 } },
        },
      },
      reply_language: { type: 'string', enum: ['en', 'fil', 'auto'] },
    },
  },
};

export default async function aiRoutes(fastify) {
  fastify.get('/ready', { preHandler: authenticate }, getAIReadiness);
  fastify.get('/models/status', { preHandler: authenticate }, getAIModelStatus);
  fastify.post('/chat', {
    preHandler: authenticate,
    schema: chatSchema,
  }, chatWithAI);
}
