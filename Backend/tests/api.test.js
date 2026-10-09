import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { AppError } from '../src/utils/errors.js'
import { validateChatResponse } from '../src/utils/validate.js'
import { PNG_1PX, WAV_HEADER, createFakeAi, createFakePool, makeApp, multipart, newSession, validChat } from './helpers.js'

const apps = []
async function setup(opts) {
  const ctx = await makeApp(opts)
  apps.push(ctx.app)
  return ctx
}
after(async () => Promise.all(apps.map((a) => a.close())))

describe('health', () => {
  it('reports db, ai and per-model state', async () => {
    const { app } = await setup()
    const res = await app.inject('/api/health')
    assert.equal(res.statusCode, 200)
    const b = res.json()
    assert.equal(b.status, 'ok')
    assert.equal(b.database, 'up')
    assert.equal(b.ai_service, 'up')
    assert.equal(b.models.medgemma.state, 'ready')
    assert.equal(b.features.voice_analysis, false)
    assert.ok(res.headers['x-request-id'])
  })

  it('is degraded when AI and DB are down', async () => {
    const pool = createFakePool()
    pool.state.failQuery = true
    const { app } = await setup({ pool, ai: createFakeAi({ health: async () => false }) })
    const b = (await app.inject('/api/health')).json()
    assert.equal(b.status, 'degraded')
    assert.equal(b.database, 'down')
    assert.equal(b.ai_service, 'down')
    assert.equal(b.features.chat, false)
  })
})

describe('sessions and authorization', () => {
  it('creates a session; stores only the token hash', async () => {
    const { app, pool } = await setup()
    const res = await app.inject({ method: 'POST', url: '/api/sessions', payload: { reply_language: 'fil' } })
    assert.equal(res.statusCode, 201)
    const { token, session_id } = res.json()
    assert.match(token, /^[A-Za-z0-9_-]{43}$/)
    const row = pool.tables.sessions.find((s) => s.id === session_id)
    assert.notEqual(row.token_hash, token)
    assert.equal(row.token_hash.length, 64)
    assert.equal(row.reply_language, 'fil')
  })

  it('rejects missing and invalid tokens', async () => {
    const { app } = await setup()
    const s = await newSession(app)
    let res = await app.inject({ method: 'GET', url: `/api/sessions/${s.id}/messages` })
    assert.equal(res.statusCode, 401) // auth runs before schema validation
    assert.equal(res.json().error.code, 'UNAUTHORIZED')
    res = await app.inject({ method: 'GET', url: `/api/sessions/${s.id}/messages`, headers: { authorization: 'Bearer nope' } })
    assert.equal(res.statusCode, 401)
    res = await app.inject({
      method: 'GET', url: `/api/sessions/${s.id}/messages`, headers: { authorization: `Bearer ${'x'.repeat(43)}` },
    })
    assert.equal(res.statusCode, 401)
    assert.equal(res.json().error.code, 'SESSION_EXPIRED')
  })

  it("cannot read another session's messages or assessments", async () => {
    const { app } = await setup()
    const a = await newSession(app)
    const b = await newSession(app)
    const chat = await app.inject({
      method: 'POST', url: '/api/chat', headers: a.auth, payload: { session_id: a.id, message: 'sore throat' },
    })
    const assessmentId = chat.json().assessment_id
    let res = await app.inject({ method: 'GET', url: `/api/sessions/${a.id}/messages`, headers: b.auth })
    assert.equal(res.statusCode, 404)
    res = await app.inject({ method: 'GET', url: `/api/assessments/${assessmentId}`, headers: b.auth })
    assert.equal(res.statusCode, 404)
    res = await app.inject({ method: 'POST', url: '/api/chat', headers: b.auth, payload: { session_id: a.id, message: 'x' } })
    assert.equal(res.statusCode, 404)
  })

  it('closed sessions can no longer be used', async () => {
    const { app } = await setup()
    const s = await newSession(app)
    assert.equal((await app.inject({ method: 'DELETE', url: `/api/sessions/${s.id}`, headers: s.auth })).statusCode, 204)
    const res = await app.inject({ method: 'GET', url: `/api/sessions/${s.id}/messages`, headers: s.auth })
    assert.equal(res.statusCode, 401)
  })
})

describe('POST /api/chat', () => {
  it('returns validated guidance, persists messages/assessment/findings in a transaction', async () => {
    const { app, pool, ai } = await setup()
    const s = await newSession(app)
    const res = await app.inject({
      method: 'POST', url: '/api/chat', headers: s.auth,
      payload: { session_id: s.id, message: 'I have a sore throat for 2 days', patient_context: { age_years: 30 } },
    })
    assert.equal(res.statusCode, 200, res.body)
    const b = res.json()
    assert.equal(b.triage.level, 'self_care')
    assert.equal(b.triage.clinically_validated, false)
    assert.deepEqual(b.follow_up_questions, ['Do you have a fever?'])
    assert.equal(b.possible_explanations[0].condition, 'Viral pharyngitis')
    assert.match(b.disclaimer, /not a diagnosis/)
    assert.equal(pool.tables.messages.length, 2)
    assert.equal(pool.tables.assessments.length, 1)
    assert.ok(pool.tables.findings.some((f) => f.category === 'possible_explanation'))
    assert.deepEqual(pool.state.txLog, ['begin', 'commit'])
    assert.equal(ai.calls[0][1].patient_context.age_years, 30)

    // History is sent on the next turn
    await app.inject({ method: 'POST', url: '/api/chat', headers: s.auth, payload: { session_id: s.id, message: 'no fever' } })
    assert.equal(ai.calls[1][1].history.length, 2)

    // History and assessment retrieval
    const hist = (await app.inject({ method: 'GET', url: `/api/sessions/${s.id}/messages`, headers: s.auth })).json()
    assert.equal(hist.messages.length, 4)
    assert.equal(hist.messages[1].assessment_id, b.assessment_id)
    const a = (await app.inject({ method: 'GET', url: `/api/assessments/${b.assessment_id}`, headers: s.auth })).json()
    assert.equal(a.triage.level, 'self_care')
    assert.deepEqual(a.reported_symptoms, ['sore throat'])
  })

  it('applies the safety override for red flags even if the model says self_care', async () => {
    const { app, pool } = await setup()
    const s = await newSession(app)
    const b = (await app.inject({
      method: 'POST', url: '/api/chat', headers: s.auth,
      payload: { session_id: s.id, message: 'Sudden chest pain and I cannot breathe' },
    })).json()
    assert.equal(b.triage.level, 'emergency')
    assert.equal(b.triage.source, 'safety_rule')
    assert.equal(b.triage.safety_override, true)
    assert.deepEqual(b.follow_up_questions, [])
    assert.ok(b.red_flags.rule_detected.some((f) => f.rule_id === 'chest_pain'))
    assert.ok(pool.tables.findings.some((f) => f.source === 'safety_rule' && f.rule_id === 'chest_pain'))
  })

  it('rejects malformed AI responses with 502 and persists nothing', async () => {
    // Run the real response validator, as the production aiClient does.
    const malformed = { result: { reply: 'x', suggested_urgency: 'whenever' }, output_valid: true }
    const { app, pool } = await setup({
      ai: createFakeAi({
        chat: async () => {
          try {
            return validateChatResponse(malformed)
          } catch {
            throw new AppError(502, 'AI_BAD_RESPONSE', 'The AI service returned an invalid response.', { retryable: true })
          }
        },
      }),
    })
    const s = await newSession(app)
    const res = await app.inject({ method: 'POST', url: '/api/chat', headers: s.auth, payload: { session_id: s.id, message: 'hi' } })
    assert.equal(res.statusCode, 502)
    assert.equal(res.json().error.code, 'AI_BAD_RESPONSE')
    assert.equal(pool.tables.messages.length, 0)
    assert.equal(pool.tables.assessments.length, 0)
  })

  it('propagates AI timeout as 504 with retryable flag', async () => {
    const { app } = await setup({
      ai: createFakeAi({ chat: async () => { throw new AppError(504, 'AI_TIMEOUT', 'too slow', { retryable: true }) } }),
    })
    const s = await newSession(app)
    const res = await app.inject({ method: 'POST', url: '/api/chat', headers: s.auth, payload: { session_id: s.id, message: 'hi' } })
    assert.equal(res.statusCode, 504)
    assert.deepEqual(Object.keys(res.json().error).sort(), ['code', 'message', 'request_id', 'retryable'])
    assert.equal(res.json().error.retryable, true)
  })

  it('validates the request body', async () => {
    const { app } = await setup()
    const s = await newSession(app)
    for (const payload of [{ session_id: s.id }, { session_id: s.id, message: '' }, { session_id: s.id, message: 'x'.repeat(4001) },
      { session_id: s.id, message: 'x', extra: 1 }, { session_id: s.id, message: 'x', patient_context: { age_years: 500 } }]) {
      const res = await app.inject({ method: 'POST', url: '/api/chat', headers: s.auth, payload })
      assert.equal(res.statusCode, 400, JSON.stringify(payload))
      assert.equal(res.json().error.code, 'INVALID_REQUEST')
    }
  })

  it('invalid model output: no explanations shown, urgency undetermined', async () => {
    const { app } = await setup({
      ai: createFakeAi({ chat: async () => ({ ...validChat(), output_valid: false }) }),
    })
    const s = await newSession(app)
    const b = (await app.inject({ method: 'POST', url: '/api/chat', headers: s.auth, payload: { session_id: s.id, message: 'hi' } })).json()
    assert.equal(b.triage.level, 'undetermined')
    assert.deepEqual(b.possible_explanations, [])
    assert.equal(b.uncertainty.output_validated, false)
  })
})

describe('POST /api/images/analyze', () => {
  it('accepts a PNG and returns observations', async () => {
    const { app, pool, storage, ai } = await setup()
    const s = await newSession(app)
    const mp = multipart({ session_id: s.id, description: 'itchy rash', body_location: 'forearm' },
      { field: 'image', filename: '../../etc/passwd.png', contentType: 'image/png', data: PNG_1PX })
    const res = await app.inject({ method: 'POST', url: '/api/images/analyze', headers: { ...s.auth, ...mp.headers }, payload: mp.payload })
    assert.equal(res.statusCode, 200, res.body)
    const b = res.json()
    assert.equal(b.kind, 'image')
    assert.deepEqual(b.visual_observations, ['Round red patch about 3 cm'])
    assert.equal(pool.tables.files.length, 1)
    assert.match(pool.tables.files[0].storage_key, /^[0-9a-f-]{36}\.png$/) // client filename never used
    assert.equal(storage.saved.size, 1)
    assert.equal(ai.calls[0][1].context.body_location, 'forearm')
  })

  it('rejects non-image content declared as image', async () => {
    const { app } = await setup()
    const s = await newSession(app)
    const mp = multipart({ session_id: s.id }, { field: 'image', filename: 'x.png', contentType: 'image/png', data: Buffer.from('<?php echo 1; ?>') })
    const res = await app.inject({ method: 'POST', url: '/api/images/analyze', headers: { ...s.auth, ...mp.headers }, payload: mp.payload })
    assert.equal(res.statusCode, 415)
    assert.equal(res.json().error.code, 'UNSUPPORTED_IMAGE')
  })

  it('rejects oversized images and missing files', async () => {
    const { app } = await setup({ configOverrides: { uploads: { maxImageBytes: 100 } } })
    const s = await newSession(app)
    let mp = multipart({ session_id: s.id }, { field: 'image', filename: 'x.png', contentType: 'image/png', data: Buffer.concat([PNG_1PX, Buffer.alloc(500)]) })
    let res = await app.inject({ method: 'POST', url: '/api/images/analyze', headers: { ...s.auth, ...mp.headers }, payload: mp.payload })
    assert.equal(res.statusCode, 413)
    mp = multipart({ session_id: s.id })
    res = await app.inject({ method: 'POST', url: '/api/images/analyze', headers: { ...s.auth, ...mp.headers }, payload: mp.payload })
    assert.equal(res.json().error.code, 'FILE_REQUIRED')
  })

  it('deletes the stored file when analysis fails', async () => {
    const { app, storage, pool } = await setup({
      ai: createFakeAi({ analyzeImage: async () => { throw new AppError(422, 'CORRUPT_IMAGE', 'bad') } }),
    })
    const s = await newSession(app)
    const mp = multipart({ session_id: s.id }, { field: 'image', filename: 'x.png', contentType: 'image/png', data: PNG_1PX })
    const res = await app.inject({ method: 'POST', url: '/api/images/analyze', headers: { ...s.auth, ...mp.headers }, payload: mp.payload })
    assert.equal(res.statusCode, 422)
    assert.equal(storage.saved.size, 0)
    assert.equal(pool.tables.files.length, 0)
  })
})

describe('audio', () => {
  it('transcribes and stores metadata only (no audio retained, no message created)', async () => {
    const { app, pool, storage, ai } = await setup()
    const s = await newSession(app)
    const mp = multipart({ session_id: s.id, language: 'fil' }, { field: 'audio', filename: 'a.wav', contentType: 'audio/wav', data: WAV_HEADER })
    const res = await app.inject({ method: 'POST', url: '/api/audio/transcribe', headers: { ...s.auth, ...mp.headers }, payload: mp.payload })
    assert.equal(res.statusCode, 200, res.body)
    const b = res.json()
    assert.equal(b.transcript, 'masakit ang lalamunan ko')
    assert.equal(b.requires_review, true)
    assert.equal(ai.calls[0][1].language, 'fil')
    assert.equal(pool.tables.files[0].storage_key, null)
    assert.equal(storage.saved.size, 0)
    assert.equal(pool.tables.messages.length, 0)
  })

  it('rejects unknown audio formats and invalid language', async () => {
    const { app } = await setup()
    const s = await newSession(app)
    let mp = multipart({ session_id: s.id }, { field: 'audio', filename: 'a.txt', contentType: 'audio/wav', data: Buffer.from('hello world, not audio') })
    let res = await app.inject({ method: 'POST', url: '/api/audio/transcribe', headers: { ...s.auth, ...mp.headers }, payload: mp.payload })
    assert.equal(res.statusCode, 415)
    mp = multipart({ session_id: s.id, language: 'de' }, { field: 'audio', filename: 'a.wav', contentType: 'audio/wav', data: WAV_HEADER })
    res = await app.inject({ method: 'POST', url: '/api/audio/transcribe', headers: { ...s.auth, ...mp.headers }, payload: mp.payload })
    assert.equal(res.json().error.code, 'INVALID_LANGUAGE')
  })

  it('voice analysis is disabled by default and core flow still works', async () => {
    const { app } = await setup()
    const s = await newSession(app)
    const mp = multipart({ session_id: s.id }, { field: 'audio', filename: 'a.wav', contentType: 'audio/wav', data: WAV_HEADER })
    const res = await app.inject({ method: 'POST', url: '/api/audio/analyze', headers: { ...s.auth, ...mp.headers }, payload: mp.payload })
    assert.equal(res.statusCode, 503)
    assert.equal(res.json().error.code, 'FEATURE_DISABLED')
    const chat = await app.inject({ method: 'POST', url: '/api/chat', headers: s.auth, payload: { session_id: s.id, message: 'cough' } })
    assert.equal(chat.statusCode, 200)
  })

  it('voice analysis when enabled is marked experimental and not used for triage', async () => {
    const { app, pool } = await setup({ configOverrides: { features: { voiceAnalysis: true } } })
    const s = await newSession(app)
    const mp = multipart({ session_id: s.id }, { field: 'audio', filename: 'a.wav', contentType: 'audio/wav', data: WAV_HEADER })
    const b = (await app.inject({ method: 'POST', url: '/api/audio/analyze', headers: { ...s.auth, ...mp.headers }, payload: mp.payload })).json()
    assert.equal(b.experimental, true)
    assert.equal(b.used_for_triage, false)
    assert.equal(pool.tables.assessments.length, 0)
  })
})

describe('errors', () => {
  it('unknown routes return the standard error format', async () => {
    const { app } = await setup()
    const res = await app.inject('/api/nope')
    assert.equal(res.statusCode, 404)
    assert.equal(res.json().error.code, 'NOT_FOUND')
  })

  it('database outage returns 503 without leaking details', async () => {
    const pool = createFakePool()
    const { app } = await setup({ pool })
    const original = pool.execute
    pool.execute = async () => { const e = new Error('connect ECONNREFUSED 127.0.0.1:3306 secret'); e.code = 'ECONNREFUSED'; throw e }
    void original
    const res = await app.inject({ method: 'POST', url: '/api/sessions', payload: {} })
    assert.equal(res.statusCode, 503)
    assert.equal(res.json().error.code, 'DATABASE_UNAVAILABLE')
    assert.doesNotMatch(res.body, /3306|secret/)
  })

  it('CORS allows only the configured origin', async () => {
    const { app } = await setup()
    let res = await app.inject({ method: 'OPTIONS', url: '/api/sessions', headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'POST' } })
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173')
    res = await app.inject({ method: 'OPTIONS', url: '/api/sessions', headers: { origin: 'http://evil.example', 'access-control-request-method': 'POST' } })
    assert.notEqual(res.headers['access-control-allow-origin'], 'http://evil.example')
  })

  it('rate-limits expensive endpoints', async () => {
    const { app } = await setup({ configOverrides: { rateLimit: { inferencePerMinute: 2 } } })
    const s = await newSession(app)
    const send = () => app.inject({ method: 'POST', url: '/api/chat', headers: s.auth, payload: { session_id: s.id, message: 'x' } })
    await send(); await send()
    const res = await send()
    assert.equal(res.statusCode, 429)
    assert.equal(res.json().error.code, 'RATE_LIMITED')
  })
})
