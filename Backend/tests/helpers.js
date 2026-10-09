/**
 * Test helpers: a minimal in-memory fake of the mysql2 pool that understands only the
 * exact statements issued by the repositories, plus a configurable fake AI client.
 */
import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config/index.js'

export function createFakePool() {
  const t = { sessions: [], messages: [], files: [], assessments: [], findings: [], audit: [] }
  let msgId = 0
  const now = () => new Date()

  async function execute(sql, params = []) {
    const s = sql.replace(/\s+/g, ' ').trim()
    if (s.startsWith('INSERT INTO sessions')) {
      const [id, token_hash, reply_language, hours] = params
      t.sessions.push({ id, token_hash, reply_language, status: 'active', created_at: now(),
        expires_at: new Date(Date.now() + hours * 3600e3) })
      return [{ affectedRows: 1 }]
    }
    if (s.startsWith('SELECT id, reply_language, created_at, expires_at FROM sessions WHERE token_hash')) {
      return [t.sessions.filter((x) => x.token_hash === params[0] && x.status === 'active' && x.expires_at > now())]
    }
    if (s.startsWith('SELECT id, reply_language, status, created_at, expires_at FROM sessions WHERE id')) {
      return [t.sessions.filter((x) => x.id === params[0])]
    }
    if (s.startsWith('UPDATE sessions SET last_active_at')) return [{}]
    if (s.startsWith('UPDATE sessions SET reply_language')) {
      t.sessions.find((x) => x.id === params[1]).reply_language = params[0]
      return [{}]
    }
    if (s.startsWith("UPDATE sessions SET status = 'closed'")) {
      t.sessions.find((x) => x.id === params[0]).status = 'closed'
      return [{}]
    }
    if (s.startsWith('INSERT INTO messages')) {
      const [session_id, role, input_mode, content, file_id] = params
      t.messages.push({ id: ++msgId, session_id, role, input_mode, content, file_id, created_at: now() })
      return [{ insertId: msgId }]
    }
    if (s.startsWith('SELECT id, role, input_mode, content, file_id, created_at FROM messages')) {
      const lim = Number(s.match(/LIMIT (\d+)/)[1])
      return [t.messages.filter((m) => m.session_id === params[0]).sort((a, b) => b.id - a.id).slice(0, lim)]
    }
    if (s.startsWith('SELECT m.id, m.role')) {
      const lim = Number(s.match(/LIMIT (\d+)/)[1])
      const rows = t.messages
        .filter((m) => m.session_id === params[0] && (params[1] === undefined || m.id < params[1]))
        .sort((a, b) => b.id - a.id)
        .slice(0, lim)
        .map((m) => ({ ...m, assessment_id: t.assessments.find((a) => a.reply_message_id === m.id)?.id ?? null }))
      return [rows]
    }
    if (s.startsWith('INSERT INTO uploaded_files')) {
      const [id, session_id, kind, mime_type, size_bytes, sha256, storage_key, duration_ms, detected_language] = params
      t.files.push({ id, session_id, kind, mime_type, size_bytes, sha256, storage_key, duration_ms, detected_language })
      return [{}]
    }
    if (s.startsWith('INSERT INTO assessments')) {
      const cols = ['id', 'session_id', 'user_message_id', 'reply_message_id', 'file_id', 'kind', 'final_urgency',
        'model_urgency', 'safety_override', 'output_valid', 'needs_more_info', 'symptom_duration', 'image_quality',
        'uncertainty_note', 'limitations', 'model_name', 'input_tokens', 'output_tokens', 'inference_ms']
      t.assessments.push({ ...Object.fromEntries(cols.map((c, i) => [c, params[i]])), created_at: now() })
      return [{}]
    }
    if (s.startsWith('INSERT INTO assessment_findings')) {
      for (let i = 0; i < params.length; i += 8) {
        const [assessment_id, category, source, content, detail, likelihood, rule_id, position] = params.slice(i, i + 8)
        t.findings.push({ assessment_id, category, source, content, detail, likelihood, rule_id, position })
      }
      return [{}]
    }
    if (s.startsWith('SELECT id, session_id, user_message_id')) {
      return [t.assessments.filter((a) => a.id === params[0] && a.session_id === params[1])]
    }
    if (s.startsWith('SELECT category, source, content')) {
      return [t.findings.filter((f) => f.assessment_id === params[0])]
    }
    if (s.startsWith('INSERT INTO audit_events')) {
      t.audit.push({ session_id: params[0], event_type: params[1], outcome: params[2], detail: params[4] })
      return [{}]
    }
    throw new Error(`Fake pool: unsupported SQL: ${s.slice(0, 80)}`)
  }

  const state = { failQuery: false, txLog: [] }
  const conn = {
    execute,
    query: execute,
    beginTransaction: async () => state.txLog.push('begin'),
    commit: async () => state.txLog.push('commit'),
    rollback: async () => state.txLog.push('rollback'),
    release: () => {},
  }
  return {
    tables: t,
    state,
    execute,
    query: async (sql) => {
      if (state.failQuery) {
        const e = new Error('connect ECONNREFUSED')
        e.code = 'ECONNREFUSED'
        throw e
      }
      if (sql === 'SELECT 1') return [[{ 1: 1 }]]
      return execute(sql)
    },
    getConnection: async () => conn,
    end: async () => {},
  }
}

export const validChat = (over = {}) => ({
  output_valid: true,
  meta: { input_tokens: 100, output_tokens: 50, inference_seconds: 1.5, truncated: false },
  result: {
    reply: 'Thanks for sharing. How long have you had this?',
    symptom_summary: { reported_symptoms: ['sore throat'], duration: '2 days', relevant_history: [] },
    follow_up_questions: ['Do you have a fever?'],
    possible_explanations: [{ condition: 'Viral pharyngitis', likelihood: 'possible', rationale: 'common' }],
    suggested_urgency: 'self_care',
    red_flags_identified: [],
    recommended_specialties: ['General practice'],
    care_advice: ['Rest and fluids'],
    needs_more_information: true,
    uncertainty_note: 'Cannot examine the throat.',
    ...over,
  },
})

export function createFakeAi(over = {}) {
  const calls = []
  return {
    calls,
    health: async () => true,
    modelStatus: async () => ({
      models: { medgemma: { enabled: true, state: 'ready' }, whisper: { enabled: true, state: 'ready' },
        meralion: { enabled: false, state: 'disabled' } },
    }),
    chat: async (input) => {
      calls.push(['chat', input])
      return validChat()
    },
    analyzeImage: async (input) => {
      calls.push(['image', input])
      return {
        output_valid: true,
        meta: { input_tokens: 400, output_tokens: 80, inference_seconds: 3, truncated: false },
        result: {
          ...validChat().result,
          image_quality: 'adequate',
          visual_observations: ['Round red patch about 3 cm'],
          limitations: 'Single photo.',
        },
      }
    },
    transcribe: async (input) => {
      calls.push(['transcribe', input])
      return { text: 'masakit ang lalamunan ko', language: 'fil', language_probability: 0.8, duration_seconds: 2.1,
        warnings: ['review'] }
    },
    analyzeVoice: async () => ({
      top_label: 'neutral', top_score: 0.6, low_confidence: false,
      scores: [{ label: 'neutral', score: 0.6 }], dimensions: { valence: 0.5, arousal: 0.4, dominance: 0.5 },
      analyzed_seconds: 2, warnings: [],
    }),
    ...over,
  }
}

export function createFakeStorage() {
  const saved = new Map()
  return {
    saved,
    sha256: () => 'a'.repeat(64),
    save: async (buf, ext) => {
      const key = `${crypto.randomUUID()}.${ext}`
      saved.set(key, buf)
      return key
    },
    remove: async (key) => saved.delete(key),
  }
}

export async function makeApp({ ai, pool, configOverrides = {} } = {}) {
  const base = loadConfig()
  const config = {
    ...base,
    corsOrigins: ['http://localhost:5173'],
    ...configOverrides,
    rateLimit: { globalPerMinute: 1000, inferencePerMinute: 1000, sessionsPerHour: 1000, ...configOverrides.rateLimit },
    features: { voiceAnalysis: false, ...configOverrides.features },
    uploads: { ...base.uploads, retainImages: true, retainAudio: false, ...configOverrides.uploads },
  }
  const fakePool = pool ?? createFakePool()
  const fakeAi = ai ?? createFakeAi()
  const storage = createFakeStorage()
  const app = await buildApp(config, { pool: fakePool, ai: fakeAi, fileStorage: storage, logger: false })
  await app.ready()
  return { app, pool: fakePool, ai: fakeAi, storage }
}

export async function newSession(app, body = {}) {
  const res = await app.inject({ method: 'POST', url: '/api/sessions', payload: body })
  const json = res.json()
  return { id: json.session_id, token: json.token, auth: { authorization: `Bearer ${json.token}` } }
}

/** Build a multipart body by hand (no extra dependency). */
export function multipart(fields, file) {
  const boundary = '----medisynctest' + Math.random().toString(16).slice(2)
  const chunks = []
  for (const [k, v] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`))
  }
  if (file) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${file.field}"; filename="${file.filename}"\r\n` +
      `Content-Type: ${file.contentType}\r\n\r\n`))
    chunks.push(file.data)
    chunks.push(Buffer.from('\r\n'))
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`))
  return { payload: Buffer.concat(chunks), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
}

export const PNG_1PX = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010806000000' + '1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082',
  'hex',
)
export const WAV_HEADER = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEfmt '), Buffer.alloc(64)])
