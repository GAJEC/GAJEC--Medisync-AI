/** Shared JSON schemas for Fastify route validation and response serialization. */

export const errorSchema = {
  $id: 'Error',
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        retryable: { type: 'boolean' },
        request_id: { type: 'string' },
      },
    },
  },
}

const urgency = { type: 'string', enum: ['emergency', 'urgent', 'soon', 'routine', 'self_care', 'undetermined'] }
const strArr = { type: 'array', items: { type: 'string' } }

export const patientContextSchema = {
  $id: 'PatientContext',
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    age_years: { type: ['integer', 'null'], minimum: 0, maximum: 120 },
    sex: { type: ['string', 'null'], enum: ['female', 'male', 'other', 'unspecified', null] },
    known_conditions: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 100 } },
  },
}

export const assessmentResponseSchema = {
  $id: 'AssessmentResponse',
  type: 'object',
  required: ['assessment_id', 'kind', 'reply', 'triage', 'disclaimer'],
  properties: {
    assessment_id: { type: 'string' },
    message_id: { type: 'integer' },
    kind: { type: 'string', enum: ['chat', 'image'] },
    reply: { type: 'string' },
    triage: {
      type: 'object',
      properties: {
        level: urgency,
        guidance: { type: 'string' },
        source: { type: 'string', enum: ['safety_rule', 'model', 'none'] },
        model_suggested_level: urgency,
        safety_override: { type: 'boolean' },
        clinically_validated: { type: 'boolean' },
      },
    },
    red_flags: {
      type: 'object',
      properties: {
        rule_detected: {
          type: 'array',
          items: {
            type: 'object',
            properties: { rule_id: { type: 'string' }, label: { type: 'string' }, urgency: { type: 'string' } },
          },
        },
        model_reported: strArr,
      },
    },
    reported_symptoms: {
      type: ['object', 'null'],
      properties: {
        reported_symptoms: strArr,
        duration: { type: ['string', 'null'] },
        relevant_history: strArr,
      },
    },
    visual_observations: { type: ['array', 'null'], items: { type: 'string' } },
    image_quality: { type: ['string', 'null'] },
    possible_explanations: {
      type: 'array',
      items: {
        type: 'object',
        properties: { condition: { type: 'string' }, likelihood: { type: 'string' }, rationale: { type: 'string' } },
      },
    },
    follow_up_questions: strArr,
    recommended_specialties: strArr,
    care_advice: strArr,
    uncertainty: {
      type: 'object',
      properties: {
        note: { type: 'string' },
        limitations: { type: ['string', 'null'] },
        output_validated: { type: 'boolean' },
        truncated: { type: 'boolean' },
      },
    },
    disclaimer: { type: 'string' },
  },
}

export const errorResponses = {
  400: { $ref: 'Error#' },
  401: { $ref: 'Error#' },
  404: { $ref: 'Error#' },
  413: { $ref: 'Error#' },
  415: { $ref: 'Error#' },
  422: { $ref: 'Error#' },
  429: { $ref: 'Error#' },
  500: { $ref: 'Error#' },
  502: { $ref: 'Error#' },
  503: { $ref: 'Error#' },
  504: { $ref: 'Error#' },
}

export const authHeader = {
  type: 'object',
  required: ['authorization'],
  properties: { authorization: { type: 'string', maxLength: 200 } },
}
