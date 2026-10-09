import { randomUUID } from 'node:crypto'
import { authHeader, errorResponses } from '../schemas/common.js'
import { sniffImage } from '../services/fileStorage.js'
import { AppError, notFound } from '../utils/errors.js'
import { parsePatientContext, readSingleFile } from '../utils/multipart.js'

const ALLOWED_DECLARED = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * POST /api/images/analyze (multipart): image, session_id, description?, body_location?, patient_context? (JSON)
 * Validation: declared MIME, magic bytes, size here; full decode + dimension checks in the AI service.
 */
export default async function imageRoutes(fastify) {
  const { maxImageBytes, retainImages } = fastify.config.uploads

  fastify.post(
    '/api/images/analyze',
    {
      onRequest: fastify.authenticate,
      config: { rateLimit: { max: fastify.config.rateLimit.inferencePerMinute, timeWindow: '1 minute' } },
      schema: { headers: authHeader, response: { 200: { $ref: 'AssessmentResponse#' }, ...errorResponses } },
    },
    async (request) => {
      const { file, fields } = await readSingleFile(request, {
        fileField: 'image',
        maxBytes: maxImageBytes,
        allowedFields: ['session_id', 'description', 'body_location', 'patient_context'],
      })
      if (fields.session_id !== request.session.id) throw notFound('Session')

      const sniffed = sniffImage(file.buffer)
      if (!ALLOWED_DECLARED.has(file.declaredMime) || !sniffed) {
        throw new AppError(415, 'UNSUPPORTED_IMAGE', 'Only JPEG, PNG and WebP images are supported.')
      }
      const description = (fields.description ?? '').trim().slice(0, 2000)
      const bodyLocation = (fields.body_location ?? '').trim().slice(0, 100)
      const patientContext = parsePatientContext(fields.patient_context)

      const storage = fastify.fileStorage
      let storageKey = null
      if (retainImages) storageKey = await storage.save(file.buffer, sniffed.ext)
      const fileRecord = {
        id: randomUUID(),
        sessionId: request.session.id,
        kind: 'image',
        mimeType: sniffed.mime,
        sizeBytes: file.buffer.length,
        sha256: storage.sha256(file.buffer),
        storageKey,
      }
      try {
        const result = await fastify.assessments.image({
          session: request.session, buffer: file.buffer, mime: sniffed.mime, description, bodyLocation,
          patientContext, fileRecord, requestId: request.id,
        })
        await fastify.repos.audit.record({
          sessionId: request.session.id, eventType: 'image.assessed', requestId: request.id,
          detail: { triage: result.triage.level, quality: result.image_quality, bytes: file.buffer.length },
        })
        await fastify.repos.sessions.touch(request.session.id)
        return result
      } catch (err) {
        await storage.remove(storageKey) // do not keep files for failed analyses
        await fastify.repos.audit.record({
          sessionId: request.session.id, eventType: 'image.assessed', outcome: 'failure', requestId: request.id,
          detail: { code: err.code ?? 'INTERNAL' },
        })
        throw err
      }
    },
  )
}
