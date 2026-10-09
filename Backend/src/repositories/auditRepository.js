/**
 * Audit events record *what happened*, never message content, transcripts, or files.
 * Failures to write audit events are logged and never break the request.
 */
export function auditRepository(db, log) {
  return {
    async record({ sessionId = null, eventType, outcome = 'success', requestId = null, detail = null }) {
      try {
        await db.execute(
          'INSERT INTO audit_events (session_id, event_type, outcome, request_id, detail) VALUES (?, ?, ?, ?, ?)',
          [sessionId, eventType, outcome, requestId, detail ? JSON.stringify(detail) : null],
        )
      } catch (err) {
        log?.warn({ code: err.code, eventType }, 'failed to write audit event')
      }
    },
  }
}
