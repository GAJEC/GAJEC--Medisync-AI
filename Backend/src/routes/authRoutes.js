export default async function authRoutes(fastify) {
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;
    return { ok: true };
  });

  fastify.post('/register', async (request, reply) => {
    return reply.code(201).send({ ok: true });
  });
}