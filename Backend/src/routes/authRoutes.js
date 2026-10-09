import { Login } from '../controllers/authController.js';



export default async function authRoutes(fastify) {
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;

    Login(fastify, email, password);
  });

  fastify.post('/register', async (request, reply) => {
    return reply.code(201).send({ ok: true });
  });
}