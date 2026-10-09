import { Login, Register, GetUserById, ChangePassword, UpdateTheme } from '../controllers/authController.js';
import { authenticate } from '../middlewares/middleware.js';
import {
  NewSessionId,
  CreateSession,
  RevokeSession,
  RevokeOtherSessions,
  ListActiveSessions,
} from '../util/session.js';

const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', maxLength: 255 },
      password: { type: 'string', minLength: 1, maxLength: 128 },
    },
  },
};

const registerSchema = {
  body: {
    type: 'object',
    required: ['firstname', 'lastname', 'email', 'password'],
    properties: {
      firstname: { type: 'string', minLength: 1, maxLength: 100 },
      lastname: { type: 'string', minLength: 1, maxLength: 100 },
      email: { type: 'string', format: 'email', maxLength: 255 },
      password: { type: 'string', minLength: 8, maxLength: 128 },
    },
  },
};

const changePasswordSchema = {
  body: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    additionalProperties: false,
    properties: {
      currentPassword: { type: 'string', minLength: 1, maxLength: 128 },
      newPassword: { type: 'string', minLength: 8, maxLength: 128 },
    },
  },
};

const themeSchema = {
  body: {
    type: 'object',
    required: ['theme'],
    additionalProperties: false,
    properties: { theme: { type: 'string', enum: ['light', 'dark'] } },
  },
};

// Stricter limits for auth endpoints to slow down brute-force attempts
const loginRateLimit = { max: 5, timeWindow: '1 minute' };
const registerRateLimit = { max: 5, timeWindow: '1 hour' };
const passwordRateLimit = { max: 5, timeWindow: '15 minutes' };

export default async function authRoutes(fastify) {
  fastify.post('/login', { schema: loginSchema, config: { rateLimit: loginRateLimit } }, async (request, reply) => {
    const { email, password } = request.body;
    try {
      const result = await Login(email, password);
      if (!result.success) {
        return reply.code(401).send({ error: result.message });
      }

      // Every login is a tracked session so it can be listed and signed out later
      const sid = NewSessionId();
      const token = fastify.jwt.sign({ id: result.user.id, email: result.user.email, role: result.user.role, sid });
      await CreateSession(sid, result.user.id, fastify.jwt.decode(token).exp, request);
      return { message: result.message, token, user: result.user };
    } catch (error) {
      request.log.error(error, 'Login failed');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/register', { schema: registerSchema, config: { rateLimit: registerRateLimit } }, async (request, reply) => {
    const { firstname, lastname, email, password } = request.body;
    try {
      const result = await Register(firstname.trim(), lastname.trim(), email, password);
      return reply.code(201).send({ message: result.message });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return reply.code(409).send({ error: 'Email already registered' });
      }
      request.log.error(error, 'Register failed');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = await GetUserById(request.user.id);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      return { user };
    } catch (error) {
      request.log.error(error, 'Fetching current user failed');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Saves the light / dark appearance for the signed-in account (any role).
  fastify.put('/theme', { preHandler: authenticate, schema: themeSchema }, async (request, reply) => {
    try {
      if (!(await UpdateTheme(request.user.id, request.body.theme))) {
        return reply.code(404).send({ error: 'User not found' });
      }
      return { message: 'Appearance saved', theme: request.body.theme };
    } catch (error) {
      request.log.error(error, 'Saving theme failed');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/logout', { preHandler: authenticate }, async (request, reply) => {
    try {
      await RevokeSession(request.user.sid, request.user.id);
      return { message: 'Signed out' };
    } catch (error) {
      request.log.error(error, 'Logout failed');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.put(
    '/password',
    { preHandler: authenticate, schema: changePasswordSchema, config: { rateLimit: passwordRateLimit } },
    async (request, reply) => {
      const { currentPassword, newPassword } = request.body;
      try {
        const result = await ChangePassword(request.user.id, currentPassword, newPassword);
        if (!result.success) {
          return reply.code(result.status).send({ error: result.message });
        }
        // Keep this device signed in, sign every other device out
        await RevokeOtherSessions(request.user.sid, request.user.id);
        return { message: result.message };
      } catch (error) {
        request.log.error(error, 'Changing password failed');
        return reply.code(500).send({ error: 'Internal server error' });
      }
    },
  );

  fastify.get('/sessions', { preHandler: authenticate }, async (request, reply) => {
    try {
      const sessions = await ListActiveSessions(request.user.sid, request.user.id);
      return { sessions };
    } catch (error) {
      request.log.error(error, 'Listing sessions failed');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete('/sessions/others', { preHandler: authenticate }, async (request, reply) => {
    try {
      const revoked = await RevokeOtherSessions(request.user.sid, request.user.id);
      return { message: 'Other sessions signed out', revoked };
    } catch (error) {
      request.log.error(error, 'Revoking sessions failed');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
