const AI_REQUEST_TIMEOUT_MS = 180_000;

function sendError(reply, statusCode, message) {
  return reply.code(statusCode).send({ error: message });
}

function aiServiceUrl(path) {
  const baseUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001').replace(/\/+$/, '');
  return `${baseUrl}${path}`;
}

async function requestAI(request, reply, path, options = {}) {
  const internalToken = process.env.AI_INTERNAL_TOKEN;
  if (!internalToken) {
    request.log.error('AI_INTERNAL_TOKEN is not configured');
    return sendError(reply, 503, 'AI service is not configured.');
  }

  let response;
  try {
    response = await fetch(aiServiceUrl(path), {
      ...options,
      headers: {
        ...options.headers,
        'X-Internal-Token': internalToken,
        'X-Request-ID': request.id,
      },
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
    request.log.warn({ code: timedOut ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE' }, 'AI service request failed');
    return sendError(
      reply,
      timedOut ? 504 : 503,
      timedOut ? 'AI service is taking longer than expected. Please try again shortly.' :
        'AI service is unavailable. Please try again shortly.',
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    request.log.error({ statusCode: response.status }, 'AI service returned invalid JSON');
    return sendError(reply, 502, 'AI service returned an invalid response.');
  }

  if (!response.ok) {
    request.log.warn({ statusCode: response.status }, 'AI service rejected request');
    if (payload && typeof payload === 'object') {
      return reply.code(response.status).send(payload);
    }
    return sendError(reply, response.status, 'AI service could not process the request.');
  }

  return payload;
}

export async function chatWithAI(request, reply) {
  const payload = await requestAI(request, reply, '/internal/medical/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request.body),
  });

  if (reply.sent) return payload;
  if (!payload || typeof payload !== 'object' || typeof payload.result?.reply !== 'string') {
    request.log.error('AI chat response did not match the expected contract');
    return sendError(reply, 502, 'AI service returned an invalid response.');
  }
  return reply.send(payload);
}

export async function getAIReadiness(request, reply) {
  const payload = await requestAI(request, reply, '/internal/ready');
  if (reply.sent) return payload;
  return reply.send(payload);
}

export async function getAIModelStatus(request, reply) {
  const payload = await requestAI(request, reply, '/internal/models/status');
  if (reply.sent) return payload;
  return reply.send(payload);
}
