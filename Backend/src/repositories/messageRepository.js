export function messageRepository(db) {
  return {
    /** Insert a message; `conn` may be a transaction connection. */
    async insert(conn, { sessionId, role, inputMode = null, content, fileId = null }) {
      const [res] = await (conn ?? db).execute(
        'INSERT INTO messages (session_id, role, input_mode, content, file_id) VALUES (?, ?, ?, ?, ?)',
        [sessionId, role, inputMode, content, fileId],
      )
      return res.insertId
    },

    /** Most recent `limit` messages, returned oldest-first. */
    async recentForSession(sessionId, limit) {
      const lim = Math.max(1, Math.min(200, Number(limit) | 0))
      const [rows] = await db.execute(
        `SELECT id, role, input_mode, content, file_id, created_at FROM messages
         WHERE session_id = ? ORDER BY id DESC LIMIT ${lim}`,
        [sessionId],
      )
      return rows.reverse()
    },

    async listForSession(sessionId, { beforeId = null, limit = 50 } = {}) {
      const lim = Math.max(1, Math.min(200, Number(limit) | 0))
      const params = [sessionId]
      let where = 'm.session_id = ?'
      if (beforeId) {
        where += ' AND m.id < ?'
        params.push(beforeId)
      }
      const [rows] = await db.execute(
        `SELECT m.id, m.role, m.input_mode, m.content, m.file_id, m.created_at, a.id AS assessment_id
         FROM messages m LEFT JOIN assessments a ON a.reply_message_id = m.id
         WHERE ${where} ORDER BY m.id DESC LIMIT ${lim}`,
        params,
      )
      return rows.reverse()
    },
  }
}
