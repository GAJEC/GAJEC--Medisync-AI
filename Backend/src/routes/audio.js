import { randomUUID } from 'node:crypto'
import { authHeader, errorResponses } from '../schemas/common.js'
import { sniffAudio } from '../services/fileStorage.js'
import { AppError, notFound } from '../utils/errors.js'
import { readSingleFile } from '../utils/multipart.js'

/**
 * POST /api/audio/transcribe - Whisper speech-to-text. The transcript is returned for the user
 * to review/edit; it is NOT sent to MedGemma until the user submits it via POST /api/chat.
 * Raw audio is not retained unless RETAIN_AUDIO=true; only metadata is stored.
 *
 * POST /api/audio/analyze - optional experimental voice-affect analysis (MERaLiON-SER-v1).
 * Its result is returned separately and is never used for triage or persisted as a finding.
 */
export default async function audioRoutes(fastify) {
  const { maxAudioBytes, retainAudio } = fastify.config.uploads
  const limit = { max: fastify.config.rateLimit.inferencePerMinute, timeWindow: '1 minute' }

  async function readAudio(request, extraFields = []) {
    const { file, fields } = await readSingleFile(request, {
      fileField: 'audio', maxBytes: maxAudioBytes, allowedFields: ['session_id', ...extraFields],
    })
    if (fields.session_id !== request.session.id) throw notFound('Session')
    const mime = sniffAudio(file.buffer)
    if (!mime) {
      throw new AppError(415, 'UNSUPPORTED_AUDIO', 'Supported audio formats: WAV, WebM, Ogg, MP3, M4A, FLAC.')
    }
    return { buffer: file.buffer, mime, fields }
  }

  fastify.post(
    '/api/audio/transcribe',
    {
      onRequest: fastify.authenticate,
      config: { rateLimit: limit },
      schema: {
        headers: authHeader,
        response: {
          200: {
            type: 'object',
            properties: {
              transcript: { type: 'string' },
              language: { type: ['string', 'null'] },
              language_probability: { type: ['number', 'null'] },
              duration_seconds: { type: 'number' },
              warnings: { type: 'array', items: { type: 'string' } },
              requires_review: { type: 'boolean' },
            },
          },
          ...errorResponses,
        },
      },
    },
    async (request) => {
      const { buffer, mime, fields } = await readAudio(request, ['language'])
      const language = fields.language || 'auto'
      if (!['auto', 'en', 'fil'].includes(language)) {
        throw new AppError(400, 'INVALID_LANGUAGE', 'language must be one of auto, en, fil.')
      }
      const storage = fastify.fileStorage
      let result
      try {
        result = await fastify.ai.transcribe({ buffer, mimetype: mime, language }, request.id)
      } catch (err) {
        await fastify.repos.audit.record({
          sessionId: request.session.id, eventType: 'audio.transcribed', outcome: 'failure', requestId: request.id,
          detail: { code: err.code ?? 'INTERNAL' },
        })
        throw err
      }
      const storageKey = retainAudio ? await storage.save(buffer, 'bin') : null
      await fastify.repos.files.insert(null, {
        id: randomUUID(), sessionId: request.session.id, kind: 'audio', mimeType: mime, sizeBytes: buffer.length,
        sha256: storage.sha256(buffer), storageKey, durationMs: Math.round(result.duration_seconds * 1000),
        detectedLanguage: result.language,
      })
      await fastify.repos.audit.record({
        sessionId: request.session.id, eventType: 'audio.transcribed', requestId: request.id,
        detail: { seconds: result.duration_seconds, language: result.language },
      })
      return {
        transcript: result.text,
        language: result.language,
        language_probability: result.language_probability,
        duration_seconds: result.duration_seconds,
        warnings: result.warnings,
        requires_review: true,
      }
    },
  )

  fastify.post(
    '/api/audio/analyze',
    {
      onRequest: fastify.authenticate,
      config: { rateLimit: limit },
      schema: {
        headers: authHeader,
        response: {
          200: {
            type: 'object',
            properties: {
              experimental: { type: 'boolean' },
              used_for_triage: { type: 'boolean' },
              top_label: { type: 'string' },
              top_score: { type: 'number' },
              low_confidence: { type: 'boolean' },
              scores: {
                type: 'array',
                items: { type: 'object', properties: { label: { type: 'string' }, score: { type: 'number' } } },
              },
              dimensions: {
                type: 'object',
                properties: { valence: { type: 'number' }, arousal: { type: 'number' }, dominance: { type: 'number' } },
              },
              warnings: { type: 'array', items: { type: 'string' } },
              notice: { type: 'string' },
            },
          },
          ...errorResponses,
        },
      },
    },
    async (request) => {
      if (!fastify.config.features.voiceAnalysis) {
        throw new AppError(503, 'FEATURE_DISABLED', 'Voice analysis is disabled on this server.')
      }
      const { buffer, mime } = await readAudio(request)
      const r = await fastify.ai.analyzeVoice({ buffer, mimetype: mime }, request.id)
      await fastify.repos.audit.record({
        sessionId: request.session.id, eventType: 'audio.voice_analyzed', requestId: request.id,
        detail: { low_confidence: r.low_confidence },
      })
      return {
        experimental: true,
        used_for_triage: false,
        ...r,
        notice:
          'Experimental vocal-affect estimate. It does not measure pain, distress, severity, or emergency status and ' +
          'is not used in your assessment.',
      }
    },
  )
}
