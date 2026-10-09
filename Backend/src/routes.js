import authRoutes from './routes/authRoutes.js';

export default async function routes(fastify) {
  fastify.register(authRoutes, { prefix: '/auth' });
}