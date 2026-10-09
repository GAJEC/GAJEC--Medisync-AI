/**
 * Small, dependency-free structural validators for AI-service responses.
 * Fastify route schemas validate client input; these validate *untrusted* AI output.
 */

export const URGENCIES = ['emergency', 'urgent', 'soon', 'routine', 'self_care', 'undetermined']
const LIKELIHOODS = ['more_likely', 'possible', 'less_likely']

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

function str(v, max, field) {
  if (typeof v !== 'string') throw new Error(`${field} must be a string`)
  return v.slice(0, max)
}

function optStr(v, max, field) {
  return v === null || v === undefined ? null : str(v, max, field)
}

function strList(v, maxItems, maxLen, field) {
  if (v === undefined || v === null) return []
  if (!Array.isArray(v)) throw new Error(`${field} must be an array`)
  return v.filter((x) => typeof x === 'string' && x.trim()).slice(0, maxItems).map((x) => x.slice(0, maxLen))
}

function oneOf(v, allowed, field) {
  if (!allowed.includes(v)) throw new Error(`${field} has an invalid value`)
  return v
}

function explanations(v) {
  if (v === undefined || v === null) return []
  if (!Array.isArray(v)) throw new Error('possible_explanations must be an array')
  return v.slice(0, 5).map((e, i) => {
    if (!isObj(e)) throw new Error(`possible_explanations[${i}] must be an object`)
    return {
      condition: str(e.condition, 300, 'condition'),
      likelihood: oneOf(e.likelihood ?? 'possible', LIKELIHOODS, 'likelihood'),
      rationale: optStr(e.rationale, 600, 'rationale') ?? '',
    }
  })
}

function common(r) {
  return {
    reply: str(r.reply ?? '', 2000, 'reply'),
    follow_up_questions: strList(r.follow_up_questions, 3, 300, 'follow_up_questions'),
    possible_explanations: explanations(r.possible_explanations),
    suggested_urgency: oneOf(r.suggested_urgency ?? 'undetermined', URGENCIES, 'suggested_urgency'),
    red_flags_identified: strList(r.red_flags_identified, 6, 300, 'red_flags_identified'),
    recommended_specialties: strList(r.recommended_specialties, 6, 120, 'recommended_specialties'),
    care_advice: strList(r.care_advice, 6, 300, 'care_advice'),
    uncertainty_note: str(r.uncertainty_note ?? '', 600, 'uncertainty_note'),
  }
}

function meta(m) {
  if (!isObj(m)) return {}
  const n = (x) => (Number.isFinite(x) && x >= 0 ? x : null)
  return {
    input_tokens: n(m.input_tokens),
    output_tokens: n(m.output_tokens),
    inference_seconds: n(m.inference_seconds),
    truncated: m.truncated === true,
  }
}

function envelope(body) {
  if (!isObj(body) || !isObj(body.result) || typeof body.output_valid !== 'boolean') {
    throw new Error('response envelope is malformed')
  }
  return body
}

export function validateChatResponse(body) {
  const { result: r, output_valid, meta: m } = envelope(body)
  const s = isObj(r.symptom_summary) ? r.symptom_summary : {}
  return {
    output_valid,
    meta: meta(m),
    result: {
      ...common(r),
      symptom_summary: {
        reported_symptoms: strList(s.reported_symptoms, 12, 200, 'reported_symptoms'),
        duration: optStr(s.duration, 120, 'duration'),
        relevant_history: strList(s.relevant_history, 12, 200, 'relevant_history'),
      },
      needs_more_information: r.needs_more_information !== false,
    },
  }
}

export function validateImageResponse(body) {
  const { result: r, output_valid, meta: m } = envelope(body)
  return {
    output_valid,
    meta: meta(m),
    result: {
      ...common(r),
      image_quality: oneOf(r.image_quality ?? 'limited', ['adequate', 'limited', 'unusable'], 'image_quality'),
      visual_observations: strList(r.visual_observations, 8, 300, 'visual_observations'),
      limitations: str(r.limitations ?? '', 600, 'limitations'),
    },
  }
}

export function validateTranscription(b) {
  if (!isObj(b)) throw new Error('transcription is malformed')
  const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null)
  return {
    text: str(b.text ?? '', 8000, 'text'),
    language: b.language === 'en' || b.language === 'fil' ? b.language : null,
    language_probability: num(b.language_probability),
    duration_seconds: num(b.duration_seconds) ?? 0,
    warnings: strList(b.warnings, 6, 300, 'warnings'),
  }
}

export function validateVoiceAnalysis(b) {
  if (!isObj(b) || !Array.isArray(b.scores) || !isObj(b.dimensions)) throw new Error('voice analysis is malformed')
  const p = (x, f) => {
    if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 1) throw new Error(`${f} out of range`)
    return x
  }
  return {
    top_label: str(b.top_label, 40, 'top_label'),
    top_score: p(b.top_score, 'top_score'),
    low_confidence: b.low_confidence === true,
    scores: b.scores.slice(0, 10).map((s) => ({ label: str(s?.label, 40, 'label'), score: p(s?.score, 'score') })),
    dimensions: {
      valence: p(b.dimensions.valence, 'valence'),
      arousal: p(b.dimensions.arousal, 'arousal'),
      dominance: p(b.dimensions.dominance, 'dominance'),
    },
    analyzed_seconds: Number(b.analyzed_seconds) || 0,
    warnings: strList(b.warnings, 6, 300, 'warnings'),
  }
}
