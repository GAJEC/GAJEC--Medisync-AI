import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, before, describe, it } from 'node:test'
import { createAiClient } from '../src/services/aiClient.js'
import { validChat } from './helpers.js'

/** A real HTTP server standing in for the Python service, to test the actual fetch path. */
let server
let base
let behaviour = () => ({ status: 200, body: validChat() })
const seen = []

before(async () => {
  server = createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', async () => {
      seen.push({ url: req.url, headers: req.headers })
      const b = await behaviour(req)
      if (b.hang) return
      res.writeHead(b.status, { 'content-type': 'application/json' })
      res.end(typeof b.body === 'string' ? b.body : JSON.stringify(b.body))
    })
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => { server.closeAllConnections(); server.close() })

const client = (over = {}) =>
  createAiClient({ baseUrl: base, token: 'secret', inferenceTimeoutMs: 500, audioTimeoutMs: 500, statusTimeoutMs: 300, ...over })

describe('aiClient', () => {
  it('sends the internal token and request id, validates and returns the result', async () => {
    behaviour = () => ({ status: 200, body: validChat() })
    const r = await client().chat({ message: 'hi' }, 'req-123')
    assert.equal(r.result.suggested_urgency, 'self_care')
    const last = seen.at(-1)
    assert.equal(last.headers['x-internal-token'], 'secret')
    assert.equal(last.headers['x-request-id'], 'req-123')
  })

  it('rejects malformed envelopes', async () => {
    behaviour = () => ({ status: 200, body: { result: 'not an object' } })
    await assert.rejects(client().chat({ message: 'hi' }), { code: 'AI_BAD_RESPONSE', statusCode: 502 })
  })

  it('rejects invalid enum values from the model', async () => {
    behaviour = () => ({ status: 200, body: validChat({ suggested_urgency: 'whenever' }) })
    await assert.rejects(client().chat({ message: 'hi' }), { code: 'AI_BAD_RESPONSE' })
  })

  it('rejects non-JSON bodies', async () => {
    behaviour = () => ({ status: 200, body: 'Traceback (most recent call last): ...' })
    await assert.rejects(client().chat({ message: 'hi' }), { code: 'AI_BAD_RESPONSE' })
  })

  it('times out', async () => {
    behaviour = () => ({ hang: true })
    await assert.rejects(client({ inferenceTimeoutMs: 150 }).chat({ message: 'hi' }), { code: 'AI_TIMEOUT', statusCode: 504 })
  })

  it('maps service unavailability', async () => {
    await assert.rejects(client({ baseUrl: 'http://127.0.0.1:1' }).chat({ message: 'hi' }), { code: 'AI_UNAVAILABLE', statusCode: 503 })
  })

  it('maps GPU OOM and model-not-ready to retryable 503s', async () => {
    behaviour = () => ({ status: 503, body: { error: { code: 'GPU_OUT_OF_MEMORY', message: 'x' } } })
    await assert.rejects(client().chat({ message: 'hi' }), { code: 'AI_RESOURCE_EXHAUSTED', retryable: true })
    behaviour = () => ({ status: 503, body: { error: { code: 'MODEL_NOT_READY', message: 'x' } } })
    await assert.rejects(client().chat({ message: 'hi' }), { code: 'MODEL_NOT_READY' })
  })

  it('passes through safe 422 input errors but hides unknown ones', async () => {
    behaviour = () => ({ status: 422, body: { error: { code: 'CORRUPT_AUDIO', message: 'The audio could not be decoded.' } } })
    await assert.rejects(client().transcribe({ buffer: Buffer.from('x'), mimetype: 'audio/wav', language: 'auto' }), {
      code: 'CORRUPT_AUDIO', statusCode: 422,
    })
    behaviour = () => ({ status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'C:\\secret\\path failed' } } })
    await assert.rejects(client().chat({ message: 'hi' }), (e) => e.code === 'AI_ERROR' && !e.message.includes('secret'))
  })

  it('health returns false when unreachable', async () => {
    assert.equal(await client({ baseUrl: 'http://127.0.0.1:1' }).health(), false)
  })
})
