import { Login, Register, GetUserById } from '../controllers/authController.js';
import { authenticate } from '../middlewares/middleware.js';

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

// Stricter limits for auth endpoints to slow down brute-force attempts
const loginRateLimit = { max: 5, timeWindow: '1 minute' };
const registerRateLimit = { max: 5, timeWindow: '1 hour' };

export default async function authRoutes(fastify) {
  fastify.post('/login', { schema: loginSchema, config: { rateLimit: loginRateLimit } }, async (request, reply) => {
    const { email, password } = request.body;
    try {
      const result = await Login(email, password);
      if (!result.success) {
        return reply.code(401).send({ error: result.message });
      }

      const token = fastify.jwt.sign({ id: result.user.id, email: result.user.email });
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
}
