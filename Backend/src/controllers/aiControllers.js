import { callAI, medicalChat, AIServiceError } from '../services/aiClient.js';

function sendAIError(request, reply, error) {
  if (!(error instanceof AIServiceError)) {
    request.log.error(error, 'AI request failed');
    return reply.code(500).send({ error: 'Internal server error' });
  }
  request.log.warn({ statusCode: error.status, code: error.code }, 'AI service request failed');
  return reply.code(error.status).send({ error: error.message, code: error.code });
}

export async function chatWithAI(request, reply) {
  try {
    return await medicalChat(request.body, request.id);
  } catch (error) {
    return sendAIError(request, reply, error);
  }
}

export async function getAIReadiness(request, reply) {
  try {
    return await callAI('/internal/ready', { requestId: request.id });
  } catch (error) {
    if (error instanceof AIServiceError && error.payload?.status === 'not_ready') {
      return reply.code(503).send(error.payload);
    }
    return sendAIError(request, reply, error);
  }
}

export async function getAIModelStatus(request, reply) {
  try {
    return await callAI('/internal/models/status', { requestId: request.id });
  } catch (error) {
    return sendAIError(request, reply, error);
  }
}
