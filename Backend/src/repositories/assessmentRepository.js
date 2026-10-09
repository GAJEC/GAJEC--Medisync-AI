export function assessmentRepository(db) {
  return {
    async insert(conn, a) {
      await conn.execute(
        `INSERT INTO assessments (id, session_id, user_message_id, reply_message_id, file_id, kind, final_urgency,
           model_urgency, safety_override, output_valid, needs_more_info, symptom_duration, image_quality,
           uncertainty_note, limitations, model_name, input_tokens, output_tokens, inference_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.id, a.sessionId, a.userMessageId, a.replyMessageId, a.fileId ?? null, a.kind, a.finalUrgency,
          a.modelUrgency, a.safetyOverride ? 1 : 0, a.outputValid ? 1 : 0,
          a.needsMoreInfo === null || a.needsMoreInfo === undefined ? null : a.needsMoreInfo ? 1 : 0,
          a.symptomDuration ?? null, a.imageQuality ?? null, a.uncertaintyNote || null, a.limitations || null,
          a.modelName, a.inputTokens ?? null, a.outputTokens ?? null, a.inferenceMs ?? null],
      )
      if (a.findings.length) {
        const placeholders = a.findings.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
        const params = a.findings.flatMap((f, i) => [a.id, f.category, f.source, f.content.slice(0, 600),
          f.detail ? f.detail.slice(0, 600) : null, f.likelihood ?? null, f.ruleId ?? null, f.position ?? i])
        await conn.execute(
          `INSERT INTO assessment_findings (assessment_id, category, source, content, detail, likelihood, rule_id, position)
           VALUES ${placeholders}`,
          params,
        )
      }
    },

    /** Returns the assessment only if it belongs to `sessionId` (ownership check in SQL). */
    async findForSession(id, sessionId) {
      const [rows] = await db.execute(
        `SELECT id, session_id, user_message_id, reply_message_id, file_id, kind, final_urgency, model_urgency,
                safety_override, output_valid, needs_more_info, symptom_duration, image_quality, uncertainty_note,
                limitations, model_name, created_at
         FROM assessments WHERE id = ? AND session_id = ?`,
        [id, sessionId],
      )
      if (!rows[0]) return null
      const [findings] = await db.execute(
        `SELECT category, source, content, detail, likelihood, rule_id FROM assessment_findings
         WHERE assessment_id = ? ORDER BY category, position`,
        [id],
      )
      return { ...rows[0], findings }
    },
  }
}
