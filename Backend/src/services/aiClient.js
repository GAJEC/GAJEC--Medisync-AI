/**
 * Client for the private Python AI service.
 * Uses Node's built-in fetch/FormData/Blob. Every call has a timeout, sends the
 * internal token and correlation ID, and validates the response shape.
 */
import { AppError } from '../utils/errors.js'
import {
  validateChatResponse,
  validateImageResponse,
  validateTranscription,
  validateVoiceAnalysis,
} from '../utils/validate.js'

// AI-service error codes that are safe and useful to pass to the client.
const PASSTHROUGH_422 = new Set([
  'EMPTY_FILE', 'FILE_TOO_LARGE', 'UNSUPPORTED_IMAGE', 'CORRUPT_IMAGE', 'IMAGE_TOO_LARGE', 'IMAGE_TOO_SMALL',
  'NO_AUDIO_STREAM', 'CORRUPT_AUDIO', 'AUDIO_TOO_LONG', 'AUDIO_TOO_SHORT', 'INPUT_TOO_LONG', 'INVALID_LANGUAGE',
])

export function createAiClient({ baseUrl, token, inferenceTimeoutMs, audioTimeoutMs, statusTimeoutMs }, log) {
  async function call(path, { method = 'POST', json, form, timeoutMs, requestId }) {
    const headers = { 'x-internal-token': token, 'x-request-id': requestId ?? '' }
    let body
    if (json !== undefined) {
      headers['content-type'] = 'application/json'
      body = JSON.stringify(json)
    } else if (form) {
      body = form
    }
    let res
    try {
      res = await fetch(`${baseUrl}${path}`, { method, headers, body, signal: AbortSignal.timeout(timeoutMs) })
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        throw new AppError(504, 'AI_TIMEOUT', 'The AI service took too long to respond. Please try again.', {
          retryable: true,
        })
      }
      log?.warn({ err: { code: err.cause?.code ?? err.code } }, 'AI service unreachable')
      throw new AppError(503, 'AI_UNAVAILABLE', 'The AI service is currently unavailable.', { retryable: true })
    }

    let payload
    try {
      payload = await res.json()
    } catch {
      throw new AppError(502, 'AI_BAD_RESPONSE', 'The AI service returned an invalid response.', { retryable: true })
    }

    if (!res.ok) {
      const code = payload?.error?.code
      log?.warn({ status: res.status, aiCode: code }, 'AI service returned an error')
      if (res.status === 422 && PASSTHROUGH_422.has(code)) {
        throw new AppError(422, code, String(payload.error.message ?? 'Invalid input.').slice(0, 200))
      }
      if (res.status === 503) {
        const map = {
          MODEL_DISABLED: [503, 'FEATURE_DISABLED', 'This feature is disabled on this server.', false],
          MODEL_NOT_READY: [503, 'MODEL_NOT_READY', 'The AI model is still loading or unavailable. Please retry shortly.', true],
          INFERENCE_BUSY: [503, 'AI_BUSY', 'The AI engine is busy. Please retry shortly.', true],
          GPU_OUT_OF_MEMORY: [503, 'AI_RESOURCE_EXHAUSTED', 'The AI engine ran out of memory. Try a shorter message or smaller file.', true],
        }
        const [s, c, m, retryable] = map[code] ?? [503, 'AI_UNAVAILABLE', 'The AI service is currently unavailable.', true]
        throw new AppError(s, c, m, { retryable })
      }
      if (res.status === 401) {
        log?.error('AI service rejected the internal token; check AI_INTERNAL_TOKEN in both .env files')
      }
      throw new AppError(502, 'AI_ERROR', 'The AI service could not process this request.', { retryable: true })
    }
    return payload
  }

  function validated(fn, payload) {
    try {
      return fn(payload)
    } catch (err) {
      log?.warn({ reason: err.message }, 'AI response failed validation')
      throw new AppError(502, 'AI_BAD_RESPONSE', 'The AI service returned an invalid response.', { retryable: true })
    }
  }

  function fileForm(field, buffer, filename, mimetype, extra = {}) {
    const form = new FormData()
    form.append(field, new Blob([buffer], { type: mimetype }), filename)
    for (const [k, v] of Object.entries(extra)) form.append(k, v)
    return form
  }

  return {
    async health() {
      try {
        const res = await fetch(`${baseUrl}/internal/health`, { signal: AbortSignal.timeout(statusTimeoutMs) })
        return res.ok
      } catch {
        return false
      }
    },

    async modelStatus(requestId) {
      return call('/internal/models/status', { method: 'GET', timeoutMs: statusTimeoutMs, requestId })
    },

    async chat(input, requestId) {
      const body = await call('/internal/medical/chat', { json: input, timeoutMs: inferenceTimeoutMs, requestId })
      return validated(validateChatResponse, body)
    },

    async analyzeImage({ buffer, mimetype, context }, requestId) {
      const form = fileForm('image', buffer, 'upload', mimetype, { context: JSON.stringify(context) })
      const body = await call('/internal/medical/analyze-image', { form, timeoutMs: inferenceTimeoutMs, requestId })
      return validated(validateImageResponse, body)
    },

    async transcribe({ buffer, mimetype, language }, requestId) {
      const form = fileForm('audio', buffer, 'upload', mimetype, { language })
      const body = await call('/internal/audio/transcribe', { form, timeoutMs: audioTimeoutMs, requestId })
      return validated(validateTranscription, body)
    },

    async analyzeVoice({ buffer, mimetype }, requestId) {
      const form = fileForm('audio', buffer, 'upload', mimetype)
      const body = await call('/internal/audio/analyze', { form, timeoutMs: audioTimeoutMs, requestId })
      return validated(validateVoiceAnalysis, body)
    },
  }
}
