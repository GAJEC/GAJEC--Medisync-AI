import { createHash, randomBytes } from 'node:crypto'
import fp from 'fastify-plugin'
import { AppError } from '../utils/errors.js'

/**
 * Demo-mode session authentication.
 *
 * POST /api/sessions issues a random 256-bit bearer token. Only its SHA-256 hash is stored.
 * Every protected route resolves `request.session` from `Authorization: Bearer <token>`,
 * and all data access is scoped to that session ID.
 *
 * LIMITATIONS: this is anonymous, device-held access control for a prototype. It does not
 * verify patient identity, has no account recovery, and is not suitable for real patient data.
 */
export const hashToken = (token) => createHash('sha256').update(token, 'utf8').digest('hex')
export const newToken = () => randomBytes(32).toString('base64url')

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

export default fp(
  async function authentication(fastify) {
    fastify.decorateRequest('session', null)

    fastify.decorate('authenticate', async (request) => {
      const header = request.headers.authorization ?? ''
      const [scheme, token] = header.split(' ')
      if (scheme !== 'Bearer' || !token || !TOKEN_RE.test(token)) {
        throw new AppError(401, 'UNAUTHORIZED', 'A valid session token is required.')
      }
      const session = await fastify.repos.sessions.findActiveByTokenHash(hashToken(token))
      if (!session) {
        throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Please start a new session.')
      }
      request.session = session
    })
  },
  { name: 'authentication', dependencies: ['database'] },
)
