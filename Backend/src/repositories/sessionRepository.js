export function sessionRepository(db) {
  return {
    async create({ id, tokenHash, replyLanguage, ttlHours }) {
      await db.execute(
        `INSERT INTO sessions (id, token_hash, reply_language, expires_at)
         VALUES (?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ? HOUR))`,
        [id, tokenHash, replyLanguage, ttlHours],
      )
      return this.findById(id)
    },

    async findActiveByTokenHash(tokenHash) {
      const [rows] = await db.execute(
        `SELECT id, reply_language, created_at, expires_at FROM sessions
         WHERE token_hash = ? AND status = 'active' AND expires_at > CURRENT_TIMESTAMP(3)`,
        [tokenHash],
      )
      return rows[0] ?? null
    },

    async findById(id) {
      const [rows] = await db.execute(
        'SELECT id, reply_language, status, created_at, expires_at FROM sessions WHERE id = ?',
        [id],
      )
      return rows[0] ?? null
    },

    async touch(id) {
      await db.execute('UPDATE sessions SET last_active_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [id])
    },

    async setLanguage(id, lang) {
      await db.execute('UPDATE sessions SET reply_language = ? WHERE id = ?', [lang, id])
    },

    async close(id) {
      await db.execute("UPDATE sessions SET status = 'closed' WHERE id = ?", [id])
    },
  }
}
