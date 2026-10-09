import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
dotenv.config({ path: path.join(backendRoot, '.env'), quiet: true })

function int(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) throw new Error(`Environment variable ${name} must be an integer`)
  return n
}

function bool(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase())
}

/** Build configuration from environment variables. Overrides are used by tests. */
export function loadConfig(overrides = {}) {
  const config = {
    env: process.env.NODE_ENV ?? 'development',
    host: process.env.HOST ?? '127.0.0.1',
    port: int('PORT', 3000),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    db: {
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: int('DB_PORT', 3306),
      user: process.env.DB_USER ?? 'medisync_app',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'medisync',
      connectionLimit: int('DB_POOL_SIZE', 10),
    },
    ai: {
      baseUrl: (process.env.AI_BASE_URL ?? 'http://127.0.0.1:8001').replace(/\/+$/, ''),
      token: process.env.AI_INTERNAL_TOKEN ?? '',
      // MedGemma on a 6 GB GPU with fp32 compute can take well over a minute.
      inferenceTimeoutMs: int('AI_INFERENCE_TIMEOUT_MS', 240_000),
      audioTimeoutMs: int('AI_AUDIO_TIMEOUT_MS', 120_000),
      statusTimeoutMs: int('AI_STATUS_TIMEOUT_MS', 3_000),
    },
    features: {
      voiceAnalysis: bool('FEATURE_VOICE_ANALYSIS', false),
    },
    uploads: {
      dir: path.resolve(backendRoot, process.env.UPLOAD_DIR ?? 'storage/uploads'),
      maxImageBytes: int('MAX_IMAGE_BYTES', 10 * 1024 * 1024),
      maxAudioBytes: int('MAX_AUDIO_BYTES', 15 * 1024 * 1024),
      // Raw audio is not retained by default; only metadata.
      retainAudio: bool('RETAIN_AUDIO', false),
      retainImages: bool('RETAIN_IMAGES', true),
    },
    session: {
      ttlHours: int('SESSION_TTL_HOURS', 24),
    },
    rateLimit: {
      globalPerMinute: int('RATE_LIMIT_GLOBAL_PER_MIN', 120),
      inferencePerMinute: int('RATE_LIMIT_INFERENCE_PER_MIN', 8),
      sessionsPerHour: int('RATE_LIMIT_SESSIONS_PER_HOUR', 20),
    },
    ...overrides,
  }
  if (config.env === 'production' && config.corsOrigins.includes('*')) {
    throw new Error('CORS_ORIGINS must not be "*" in production')
  }
  return config
}
