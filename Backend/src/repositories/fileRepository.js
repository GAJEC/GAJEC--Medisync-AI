export function fileRepository(db) {
  return {
    async insert(conn, f) {
      await (conn ?? db).execute(
        `INSERT INTO uploaded_files (id, session_id, kind, mime_type, size_bytes, sha256, storage_key, duration_ms, detected_language)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [f.id, f.sessionId, f.kind, f.mimeType, f.sizeBytes, f.sha256, f.storageKey ?? null, f.durationMs ?? null,
          f.detectedLanguage ?? null],
      )
    },
  }
}
