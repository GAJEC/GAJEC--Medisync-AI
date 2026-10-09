import { randomUUID } from 'node:crypto'
import { DISCLAIMER, URGENCY_GUIDANCE, applySafety } from './safetyService.js'

/**
 * Orchestrates: load history -> call AI -> validate -> apply safety rules -> persist (transaction)
 * -> build the stable client response.
 */
export function createAssessmentService({ ai, repos, withTransaction, config }) {
  const HISTORY_LIMIT = 12

  async function historyFor(sessionId) {
    const rows = await repos.messages.recentForSession(sessionId, HISTORY_LIMIT)
    return rows.map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
  }

  function findingsFrom({ result, safety, kind }) {
    const out = []
    const push = (category, source, items, map = (x) => ({ content: x })) =>
      items.forEach((x, i) => out.push({ category, source, position: i, ...map(x) }))

    if (kind === 'chat') {
      // Reported symptoms are model-extracted summaries of what the patient said.
      push('reported_symptom', 'model', result.symptom_summary.reported_symptoms)
      push('relevant_history', 'model', result.symptom_summary.relevant_history)
    } else {
      push('visual_observation', 'model', result.visual_observations)
    }
    push('possible_explanation', 'model', safety.possibleExplanations, (e) => ({
      content: e.condition,
      detail: e.rationale,
      likelihood: e.likelihood,
    }))
    push('red_flag', 'safety_rule', safety.ruleRedFlags, (f) => ({ content: f.label, ruleId: f.rule_id }))
    push('red_flag', 'model', safety.modelRedFlags)
    push('specialty', 'model', result.recommended_specialties)
    push('care_advice', 'model', result.care_advice)
    push('follow_up_question', 'model', safety.followUpQuestions)
    return out
  }

  function responseBody({ assessmentId, replyMessageId, kind, result, outputValid, safety, meta }) {
    return {
      assessment_id: assessmentId,
      message_id: replyMessageId,
      kind,
      reply: safety.reply,
      triage: {
        level: safety.finalUrgency,
        guidance: safety.guidance,
        source: safety.urgencySource,
        model_suggested_level: safety.modelUrgency,
        safety_override: safety.safetyOverride,
        clinically_validated: false,
      },
      red_flags: {
        rule_detected: safety.ruleRedFlags,
        model_reported: safety.modelRedFlags,
      },
      reported_symptoms: kind === 'chat' ? result.symptom_summary : null,
      visual_observations: kind === 'image' ? result.visual_observations : null,
      image_quality: kind === 'image' ? result.image_quality : null,
      possible_explanations: safety.possibleExplanations,
      follow_up_questions: safety.followUpQuestions,
      recommended_specialties: outputValid ? result.recommended_specialties : [],
      care_advice: outputValid ? result.care_advice : [],
      uncertainty: {
        note: result.uncertainty_note,
        limitations: kind === 'image' ? result.limitations : null,
        output_validated: outputValid,
        truncated: meta.truncated === true,
      },
      disclaimer: DISCLAIMER,
    }
  }

  async function persist({ sessionId, kind, userContent, inputMode, fileRecord, result, outputValid, safety, meta }) {
    const assessmentId = randomUUID()
    const ids = await withTransaction(async (conn) => {
      if (fileRecord) await repos.files.insert(conn, fileRecord)
      const userMessageId = await repos.messages.insert(conn, {
        sessionId, role: 'user', inputMode, content: userContent, fileId: fileRecord?.id ?? null,
      })
      const replyMessageId = await repos.messages.insert(conn, { sessionId, role: 'assistant', content: safety.reply })
      await repos.assessments.insert(conn, {
        id: assessmentId,
        sessionId,
        userMessageId,
        replyMessageId,
        fileId: fileRecord?.id ?? null,
        kind,
        finalUrgency: safety.finalUrgency,
        modelUrgency: safety.modelUrgency,
        safetyOverride: safety.safetyOverride,
        outputValid,
        needsMoreInfo: kind === 'chat' ? result.needs_more_information : null,
        symptomDuration: kind === 'chat' ? result.symptom_summary.duration : null,
        imageQuality: kind === 'image' ? result.image_quality : null,
        uncertaintyNote: result.uncertainty_note,
        limitations: kind === 'image' ? result.limitations : null,
        modelName: 'medgemma-4b-it',
        inputTokens: meta.input_tokens,
        outputTokens: meta.output_tokens,
        inferenceMs: meta.inference_seconds === null ? null : Math.round(meta.inference_seconds * 1000),
        findings: findingsFrom({ result, safety, kind }),
      })
      return { userMessageId, replyMessageId }
    })
    return { assessmentId, ...ids }
  }

  return {
    async chat({ session, message, inputMode, patientContext, requestId }) {
      const history = await historyFor(session.id)
      const language = session.reply_language
      const out = await ai.chat(
        { message, history, patient_context: patientContext ?? null, reply_language: language },
        requestId,
      )
      const safety = applySafety({
        modelResult: out.result, outputValid: out.output_valid, patientText: message, language,
      })
      const ids = await persist({
        sessionId: session.id, kind: 'chat', userContent: message, inputMode, result: out.result,
        outputValid: out.output_valid, safety, meta: out.meta,
      })
      return responseBody({
        assessmentId: ids.assessmentId, replyMessageId: ids.replyMessageId, kind: 'chat', result: out.result,
        outputValid: out.output_valid, safety, meta: out.meta,
      })
    },

    async image({ session, buffer, mime, description, bodyLocation, patientContext, fileRecord, requestId }) {
      const history = await historyFor(session.id)
      const language = session.reply_language
      const out = await ai.analyzeImage(
        {
          buffer, mimetype: mime,
          context: {
            description, body_location: bodyLocation, history, patient_context: patientContext ?? null,
            reply_language: language,
          },
        },
        requestId,
      )
      const safety = applySafety({
        modelResult: out.result, outputValid: out.output_valid,
        patientText: `${bodyLocation}. ${description}`, language,
      })
      const userContent = `[Image uploaded${bodyLocation ? ` - ${bodyLocation}` : ''}] ${description}`.trim()
      const ids = await persist({
        sessionId: session.id, kind: 'image', userContent, inputMode: 'image', fileRecord, result: out.result,
        outputValid: out.output_valid, safety, meta: out.meta,
      })
      return responseBody({
        assessmentId: ids.assessmentId, replyMessageId: ids.replyMessageId, kind: 'image', result: out.result,
        outputValid: out.output_valid, safety, meta: out.meta,
      })
    },

    async get(id, sessionId) {
      const a = await repos.assessments.findForSession(id, sessionId)
      if (!a) return null
      const by = (cat) => a.findings.filter((f) => f.category === cat)
      return {
        assessment_id: a.id,
        kind: a.kind,
        created_at: a.created_at,
        triage: {
          level: a.final_urgency,
          guidance: URGENCY_GUIDANCE[a.final_urgency],
          source: a.safety_override ? 'safety_rule' : a.output_valid ? 'model' : 'none',
          model_suggested_level: a.model_urgency,
          safety_override: Boolean(a.safety_override),
          clinically_validated: false,
        },
        reported_symptoms: by('reported_symptom').map((f) => f.content),
        relevant_history: by('relevant_history').map((f) => f.content),
        symptom_duration: a.symptom_duration,
        visual_observations: by('visual_observation').map((f) => f.content),
        image_quality: a.image_quality,
        possible_explanations: by('possible_explanation').map((f) => ({
          condition: f.content, likelihood: f.likelihood, rationale: f.detail ?? '',
        })),
        red_flags: by('red_flag').map((f) => ({ label: f.content, source: f.source, rule_id: f.rule_id })),
        recommended_specialties: by('specialty').map((f) => f.content),
        care_advice: by('care_advice').map((f) => f.content),
        follow_up_questions: by('follow_up_question').map((f) => f.content),
        uncertainty: {
          note: a.uncertainty_note ?? '',
          limitations: a.limitations,
          output_validated: Boolean(a.output_valid),
        },
        disclaimer: DISCLAIMER,
      }
    },
  }
}
