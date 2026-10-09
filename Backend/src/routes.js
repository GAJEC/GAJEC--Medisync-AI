import authRoutes from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import staffRoutes from './routes/staffRoutes.js';

export default async function routes(fastify) {
  fastify.register(authRoutes, { prefix: '/auth' });
  fastify.register(patientRoutes, { prefix: '/patient' });
  fastify.register(aiRoutes, { prefix: '/ai' });
  fastify.register(staffRoutes, { prefix: '/staff' });
}
