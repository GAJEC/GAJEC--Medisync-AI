import { buildApp } from './app.js'
import { loadConfig } from './config/index.js'

const config = loadConfig()

if (!config.ai.token) {
  console.error('AI_INTERNAL_TOKEN is not set in Backend/.env; the AI service will reject all requests.')
}
if (!config.db.password) {
  console.error('DB_PASSWORD is not set in Backend/.env; database access will fail.')
}

const app = await buildApp(config)

let closing = false
async function shutdown(signal) {
  if (closing) return
  closing = true
  app.log.info({ signal }, 'shutting down')
  const timer = setTimeout(() => process.exit(1), 10_000).unref()
  try {
    await app.close() // stops accepting connections, waits for in-flight requests, closes DB pool
    clearTimeout(timer)
    process.exit(0)
  } catch {
    process.exit(1)
  }
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

try {
  await app.listen({ host: config.host, port: config.port })
} catch (err) {
  app.log.error({ code: err.code }, 'failed to start')
  process.exit(1)
}
