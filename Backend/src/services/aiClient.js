import { AI_CONFIG } from '../config.js';
const AI_REQUEST_TIMEOUT_MS = 180_000;

export class AIServiceError extends Error {
  constructor(status, code, message, payload) {
    super(message);
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

// Calls the internal AI service
export async function callAI(path, { method = 'GET', body, requestId, timeoutMs = AI_REQUEST_TIMEOUT_MS } = {}) {
  if (!AI_CONFIG.internalToken) {
    throw new AIServiceError(503, 'AI_NOT_CONFIGURED', 'AI service is not configured.');
  }

  const headers = { 'X-Internal-Token': AI_CONFIG.internalToken };
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (requestId) headers['X-Request-ID'] = String(requestId);

  let response;
  try {
    response = await fetch(`${AI_CONFIG.serviceUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new AIServiceError(504, 'AI_TIMEOUT', 'AI service is taking longer than expected. Please try again shortly.');
    }
    throw new AIServiceError(503, 'AI_UNAVAILABLE', 'AI service is unavailable. Please try again shortly.');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new AIServiceError(502, 'AI_INVALID_RESPONSE', 'AI service returned an invalid response.');
  }

  if (!response.ok) {
    const error = payload && typeof payload.error === 'object' ? payload.error : null;
    throw new AIServiceError(
      response.status,
      error?.code || 'AI_ERROR',
      typeof error?.message === 'string' ? error.message : 'AI service could not process the request.',
      payload,
    );
  }

  return payload;
}

// POST /internal/medical/chat
export async function medicalChat(body, requestId) {
  const payload = await callAI('/internal/medical/chat', { method: 'POST', body, requestId });
  if (!payload || typeof payload !== 'object' || typeof payload.result?.reply !== 'string') {
    throw new AIServiceError(502, 'AI_INVALID_RESPONSE', 'AI service returned an invalid response.');
  }
  return payload;
}

// POST /internal/medical/analyze-image
export async function analyzeImage({ buffer, mimetype, filename }, context, requestId) {
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: mimetype }), filename || 'image');
  form.append('context', JSON.stringify(context));
  const payload = await callAI('/internal/medical/analyze-image', { method: 'POST', body: form, requestId });
  if (!payload || typeof payload !== 'object' || typeof payload.result?.reply !== 'string') {
    throw new AIServiceError(502, 'AI_INVALID_RESPONSE', 'AI service returned an invalid response.');
  }
  return payload;
}

// POST /internal/audio/transcribe
export async function transcribeAudio({ buffer, mimetype, filename }, language, requestId) {
  const form = new FormData();
  form.append('audio', new Blob([buffer], { type: mimetype }), filename || 'audio');
  form.append('language', language);
  const payload = await callAI('/internal/audio/transcribe', { method: 'POST', body: form, requestId });
  if (!payload || typeof payload !== 'object' || typeof payload.text !== 'string') {
    throw new AIServiceError(502, 'AI_INVALID_RESPONSE', 'AI service returned an invalid response.');
  }
  return payload;
}

// GET /internal/progress/:request_id
export async function getProgress(requestId) {
  try {
    return await callAI(`/internal/progress/${encodeURIComponent(requestId)}`, { timeoutMs: 5000 });
  } catch (error) {
    if (error instanceof AIServiceError && error.status === 404) return null;
    throw error;
  }
}

// Maps AI service error codes to patient-facing messages
const PATIENT_MESSAGES = {
  EMPTY_FILE: 'The file you attached is empty.',
  FILE_TOO_LARGE: 'The file you attached is too large.',
  UNSUPPORTED_IMAGE: 'Only JPEG, PNG and WebP photos can be analysed.',
  CORRUPT_IMAGE: 'The photo could not be read. Please try another photo.',
  IMAGE_TOO_LARGE: 'The photo resolution is too large. Please use a smaller photo.',
  IMAGE_TOO_SMALL: 'The photo is too small to analyse.',
  INVALID_CONTEXT: 'The photo could not be sent. Please try again.',
  CORRUPT_AUDIO: 'The recording could not be read. Please record again.',
  NO_AUDIO_STREAM: 'The file does not contain any audio.',
  AUDIO_TOO_SHORT: 'The recording is too short or has too little speech.',
  AUDIO_TOO_LONG: 'The recording is longer than 2 minutes.',
  AI_NOT_CONFIGURED: 'Syncia is not set up yet. Please contact the hospital.',
  AI_UNAVAILABLE: 'Syncia is offline right now. Please try again shortly.',
  AI_TIMEOUT: 'Syncia is taking longer than expected. Please try again shortly.',
  MODEL_NOT_READY: 'Syncia is still starting up. Please try again in a minute.',
  MODEL_DISABLED: 'Syncia is currently turned off. Please contact the hospital.',
  INFERENCE_BUSY: 'Syncia is busy with another request. Please try again shortly.',
  GPU_OUT_OF_MEMORY: 'Your message was too long for Syncia. Try a shorter message.',
  INPUT_TOO_LONG: 'This conversation is too long for Syncia. Please start a new conversation.',
};

export function patientMessageFor(error) {
  return PATIENT_MESSAGES[error?.code] || 'Syncia could not respond. Please try again.';
}
