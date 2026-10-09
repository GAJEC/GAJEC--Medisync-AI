import { Login, Register } from '../controllers/authController.js';
import { isEmailRegistered } from '../util/checker.js';


export default async function authRoutes(fastify) {
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    try {
      const result = await Login(fastify, email, password);
      if (!result.success) {
        return reply.code(401).send({ error: result.message });
      }
      return reply.send({ message: result.message, user: result.user });
    } catch (error) {
      console.log(error, 'Login failed');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/register', async (request, reply) => {
    const { firstname, lastname, email, password } = request.body;

    if (!firstname || !lastname || !email || !password) {
      return reply.code(400).send({ error: 'All fields are required' });
    }

    if (await isEmailRegistered(email)) {
      return reply.code(400).send({ error: 'Email already registered' });
    }
    
    try {
      const result = await Register(fastify, firstname, lastname, email, password);
      if (!result.success) {
        return reply.code(400).send({ error: result.message });
      }
      return reply.send({ message: result.message });
    } catch (error) {
      console.log(error, 'Register failed');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}