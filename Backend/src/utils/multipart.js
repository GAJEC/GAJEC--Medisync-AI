import { AppError } from './errors.js'

/**
 * Read a multipart request containing exactly one file plus simple text fields.
 * Enforces the byte limit while streaming; never touches the filesystem.
 */
export async function readSingleFile(request, { fileField, maxBytes, allowedFields = [] }) {
  if (!request.isMultipart()) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Expected a multipart/form-data upload.')
  }
  const fields = {}
  let file = null
  try {
    for await (const part of request.parts({ limits: { fileSize: maxBytes, files: 1, fields: 10, fieldSize: 8192 } })) {
      if (part.type === 'file') {
        if (part.fieldname !== fileField) {
          part.file.resume()
          throw new AppError(400, 'UNEXPECTED_FILE', `Upload the file in the "${fileField}" field.`)
        }
        const buffer = await part.toBuffer()
        if (part.file.truncated) throw tooLarge()
        file = { buffer, declaredMime: part.mimetype }
      } else if (allowedFields.includes(part.fieldname)) {
        fields[part.fieldname] = String(part.value ?? '')
      }
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    if (err.code === 'FST_REQ_FILE_TOO_LARGE') throw tooLarge()
    if (err.code === 'FST_FILES_LIMIT') throw new AppError(400, 'TOO_MANY_FILES', 'Upload one file at a time.')
    throw new AppError(400, 'INVALID_UPLOAD', 'The upload could not be read.')
  }
  if (!file) throw new AppError(400, 'FILE_REQUIRED', `A file is required in the "${fileField}" field.`)
  if (file.buffer.length === 0) throw new AppError(422, 'EMPTY_FILE', 'The uploaded file is empty.')
  return { file, fields }
}

function tooLarge() {
  return new AppError(413, 'FILE_TOO_LARGE', 'The uploaded file is too large.')
}

export function parsePatientContext(raw) {
  if (!raw) return null
  let v
  try {
    v = JSON.parse(raw)
  } catch {
    throw new AppError(400, 'INVALID_PATIENT_CONTEXT', 'patient_context must be valid JSON.')
  }
  if (v === null) return null
  if (typeof v !== 'object' || Array.isArray(v)) throw new AppError(400, 'INVALID_PATIENT_CONTEXT', 'patient_context must be an object.')
  const out = {}
  if (v.age_years !== undefined && v.age_years !== null) {
    if (!Number.isInteger(v.age_years) || v.age_years < 0 || v.age_years > 120)
      throw new AppError(400, 'INVALID_PATIENT_CONTEXT', 'age_years must be 0-120.')
    out.age_years = v.age_years
  }
  if (v.sex !== undefined && v.sex !== null) {
    if (!['female', 'male', 'other', 'unspecified'].includes(v.sex))
      throw new AppError(400, 'INVALID_PATIENT_CONTEXT', 'sex is invalid.')
    out.sex = v.sex
  }
  if (Array.isArray(v.known_conditions)) {
    out.known_conditions = v.known_conditions.filter((c) => typeof c === 'string').slice(0, 20).map((c) => c.slice(0, 100))
  }
  return out
}
