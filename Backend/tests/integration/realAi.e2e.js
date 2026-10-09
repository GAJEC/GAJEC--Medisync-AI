/**
 * Integration smoke test: Fastify routes -> real aiClient -> running Python AI service -> real models.
 * Uses the in-memory fake DB so it can run without MySQL. NOT part of `npm test`.
 *
 * Prereq: AI service running (AI/.venv/Scripts/python -m app.main) with models loaded.
 * Usage:  node tests/integration/realAi.e2e.js [path/to/speech.wav] [path/to/image.jpg]
 */
import { readFile } from 'node:fs/promises'
import { buildApp } from '../../src/app.js'
import { loadConfig } from '../../src/config/index.js'
import { createAiClient } from '../../src/services/aiClient.js'
import { createFakePool, createFakeStorage, multipart } from '../helpers.js'

const [audioPath, imagePath] = process.argv.slice(2)
const base = loadConfig()
const config = { ...base, features: { voiceAnalysis: true }, rateLimit: { ...base.rateLimit, inferencePerMinute: 100 } }
const pool = createFakePool()
const app = await buildApp(config, {
  pool, ai: createAiClient(config.ai, null), fileStorage: createFakeStorage(), logger: false,
})
await app.ready()

const t0 = () => performance.now()
const secs = (t) => ((performance.now() - t) / 1000).toFixed(1) + 's'
let failures = 0
const check = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`)
  if (!cond) failures++
}

const health = (await app.inject('/api/health')).json()
console.log('health:', JSON.stringify(health))
check(health.ai_service === 'up' && health.features.chat, 'AI service up and MedGemma ready')

const s = (await app.inject({ method: 'POST', url: '/api/sessions', payload: {} })).json()
const auth = { authorization: `Bearer ${s.token}` }

let t = t0()
let r = await app.inject({
  method: 'POST', url: '/api/chat', headers: auth,
  payload: { session_id: s.session_id, message: 'I have had a runny nose and sneezing for 3 days. No fever.' },
})
let b = r.json()
console.log(`chat (${secs(t)}):`, r.statusCode, b.triage?.level, '|', b.reply?.slice(0, 120))
check(r.statusCode === 200 && b.uncertainty.output_validated, 'text chat through real MedGemma returns validated output')

t = t0()
r = await app.inject({
  method: 'POST', url: '/api/chat', headers: auth,
  payload: { session_id: s.session_id, message: 'Now I suddenly have crushing chest pain and I cannot breathe' },
})
b = r.json()
console.log(`emergency chat (${secs(t)}):`, r.statusCode, b.triage?.level, b.triage?.source, b.red_flags?.rule_detected?.map((f) => f.rule_id))
check(b.triage?.level === 'emergency' && b.follow_up_questions.length === 0, 'emergency red flag -> emergency, no follow-ups')

if (audioPath) {
  const audio = await readFile(audioPath)
  const mp = multipart({ session_id: s.session_id, language: 'auto' }, { field: 'audio', filename: 'a.wav', contentType: 'audio/wav', data: audio })
  t = t0()
  r = await app.inject({ method: 'POST', url: '/api/audio/transcribe', headers: { ...auth, ...mp.headers }, payload: mp.payload })
  b = r.json()
  console.log(`transcribe (${secs(t)}):`, r.statusCode, JSON.stringify(b))
  check(r.statusCode === 200 && b.transcript.length > 0, 'audio through real Whisper returns transcript')

  const mp2 = multipart({ session_id: s.session_id }, { field: 'audio', filename: 'a.wav', contentType: 'audio/wav', data: audio })
  t = t0()
  r = await app.inject({ method: 'POST', url: '/api/audio/analyze', headers: { ...auth, ...mp2.headers }, payload: mp2.payload })
  b = r.json()
  console.log(`voice analyze (${secs(t)}):`, r.statusCode, b.top_label, b.top_score, 'used_for_triage=', b.used_for_triage)
  check(r.statusCode === 200 && b.used_for_triage === false, 'MERaLiON (if enabled) returns experimental, non-triage result')
}

if (imagePath) {
  const img = await readFile(imagePath)
  const mp = multipart({ session_id: s.session_id, description: 'Itchy red patch, 3 days', body_location: 'forearm' },
    { field: 'image', filename: 'x.png', contentType: imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg', data: img })
  t = t0()
  r = await app.inject({ method: 'POST', url: '/api/images/analyze', headers: { ...auth, ...mp.headers }, payload: mp.payload })
  b = r.json()
  console.log(`image (${secs(t)}):`, r.statusCode, b.triage?.level, b.image_quality, JSON.stringify(b.visual_observations))
  check(r.statusCode === 200 && Array.isArray(b.visual_observations), 'image through real MedGemma returns observations')
}

// Corrupt image passes Fastify magic-byte check but must be rejected by the AI service decode.
const bad = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)])
const mpBad = multipart({ session_id: s.session_id }, { field: 'image', filename: 'x.jpg', contentType: 'image/jpeg', data: bad })
r = await app.inject({ method: 'POST', url: '/api/images/analyze', headers: { ...auth, ...mpBad.headers }, payload: mpBad.payload })
console.log('corrupt image:', r.statusCode, r.json().error?.code)
check(r.statusCode === 422 && r.json().error.code === 'CORRUPT_IMAGE', 'corrupt JPEG rejected by real decoder')

const hist = (await app.inject({ method: 'GET', url: `/api/sessions/${s.session_id}/messages`, headers: auth })).json()
check(hist.messages.length >= 4, `history persisted (${hist.messages.length} messages)`)

await app.close()
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
