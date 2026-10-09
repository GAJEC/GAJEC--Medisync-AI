import {
  GetDashboard,
  GetPatient,
  ListAppointments,
  ListDoctors,
  ListPatients,
  UpdateAppointment,
} from '../controllers/staffController.js';
import { authorize } from '../middlewares/middleware.js';

const idParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer', minimum: 1 } },
};

const pagination = {
  page: { type: 'integer', minimum: 1, default: 1 },
  pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
  search: { type: 'string', maxLength: 100 },
};

const patientListSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: pagination,
  },
};

const appointmentListSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      ...pagination,
      status: { type: 'string', enum: ['Scheduled', 'Completed', 'Cancelled'] },
      from: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      to: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      doctorId: { type: 'integer', minimum: 1 },
      order: { type: 'string', enum: ['soonest', 'latest'], default: 'soonest' },
    },
  },
};

const updateAppointmentSchema = {
  params: idParams,
  body: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
      doctorId: { anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }] },
      scheduledAt: { type: 'string', format: 'date-time' },
      mode: { type: 'string', enum: ['In-person', 'Online'] },
      status: { type: 'string', enum: ['Completed', 'Cancelled'] },
    },
  },
};

const handle = (label, fn) => async (request, reply) => {
  try {
    return await fn(request, reply);
  } catch (error) {
    request.log.error(error, `${label} failed`);
    return reply.code(500).send({ error: 'Internal server error' });
  }
};

export default async function staffRoutes(fastify) {
  fastify.addHook('preHandler', authorize('staff'));

  fastify.get('/dashboard', handle('Loading staff dashboard', async () => ({
    summary: await GetDashboard(),
  })));

  fastify.get('/patients', { schema: patientListSchema }, handle('Listing staff patients', async (request) => ({
    ...await ListPatients(request.query),
  })));

  fastify.get('/patients/:id', { schema: { params: idParams } }, handle('Fetching staff patient', async (request, reply) => {
    const patient = await GetPatient(request.params.id);
    if (!patient) return reply.code(404).send({ error: 'Patient not found' });
    return { patient };
  }));

  fastify.get('/appointments', { schema: appointmentListSchema }, handle('Listing staff appointments', async (request) => ({
    ...await ListAppointments(request.query),
  })));

  fastify.patch(
    '/appointments/:id',
    { schema: updateAppointmentSchema },
    handle('Updating staff appointment', async (request, reply) => {
      const result = await UpdateAppointment(request.params.id, request.body);
      if (!result.success) return reply.code(result.status).send({ error: result.message });
      return { message: 'Appointment updated', appointment: result.appointment };
    }),
  );

  fastify.get('/doctors', handle('Listing staff doctors', async () => ({
    doctors: await ListDoctors(),
  })));
}
