import {
  GetProfile,
  UpdateProfile,
  ListAppointments,
  GetAppointment,
  CreateAppointment,
  CancelAppointment,
  ListDoctors,
  ListNotifications,
  MarkNotificationRead,
  MarkAllNotificationsRead,
  ListConversations,
  GetConversation,
  CreateConversation,
  AddConversationMessage,
  RenameConversation,
  DeleteConversation,
  GetConsents,
  UpdateConsents,
  CreateDataRequest,
  ListDataRequests,
} from '../controllers/patientController.js';
import { authorize } from '../middlewares/middleware.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const idParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer', minimum: 1 } },
};

const isoDate = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };
const phone = { type: 'string', maxLength: 30, pattern: '^[0-9+()\\-\\s]*$' };

const updateProfileSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
      firstname: { type: 'string', minLength: 1, maxLength: 100, pattern: '\\S' },
      lastname: { type: 'string', minLength: 1, maxLength: 100, pattern: '\\S' },
      email: { type: 'string', format: 'email', maxLength: 255 },
      dob: { anyOf: [isoDate, { type: 'string', maxLength: 0 }] },
      sex: { type: 'string', enum: ['Female', 'Male', 'Prefer not to say', ''] },
      mobile: phone,
      address: { type: 'string', maxLength: 255 },
      allergies: { type: 'string', maxLength: 2000 },
      medications: { type: 'string', maxLength: 2000 },
      history: { type: 'string', maxLength: 4000 },
      emergencyName: { type: 'string', maxLength: 150 },
      emergencyPhone: phone,
      consultType: { type: 'string', enum: ['In-person', 'Online'] },
      language: { type: 'string', enum: ['English', 'Filipino'] },
    },
  },
};

const listAppointmentsSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      status: { type: 'string', enum: ['Scheduled', 'Completed', 'Cancelled'] },
      from: isoDate,
      to: isoDate,
      search: { type: 'string', maxLength: 100 },
      order: { type: 'string', enum: ['newest', 'oldest'], default: 'newest' },
    },
  },
};

const createAppointmentSchema = {
  body: {
    type: 'object',
    required: ['reason', 'scheduledAt'],
    additionalProperties: false,
    properties: {
      doctorId: { type: 'integer', minimum: 1 },
      reason: { type: 'string', minLength: 1, maxLength: 255, pattern: '\\S' },
      type: { type: 'string', enum: ['consult', 'follow-up', 'checkup'] },
      mode: { type: 'string', enum: ['In-person', 'Online'] },
      scheduledAt: { type: 'string', format: 'date-time' },
    },
  },
};

const messageBody = { type: 'string', minLength: 1, maxLength: 4000, pattern: '\\S' };

const createConversationSchema = {
  body: {
    type: 'object',
    required: ['message'],
    additionalProperties: false,
    properties: { message: messageBody },
  },
};

const addMessageSchema = {
  params: idParams,
  body: createConversationSchema.body,
};

const renameConversationSchema = {
  params: idParams,
  body: {
    type: 'object',
    required: ['title'],
    additionalProperties: false,
    properties: { title: { type: 'string', minLength: 1, maxLength: 120, pattern: '\\S' } },
  },
};

const updateConsentsSchema = {
  body: {
    type: 'object',
    required: ['staff', 'history', 'reminders'],
    additionalProperties: false,
    properties: {
      routing: { type: 'boolean', const: true },
      staff: { type: 'boolean' },
      history: { type: 'boolean' },
      reminders: { type: 'boolean' },
    },
  },
};

const dataRequestSchema = {
  body: {
    type: 'object',
    required: ['type'],
    additionalProperties: false,
    properties: {
      type: { type: 'string', enum: ['access', 'delete'] },
      note: { type: 'string', maxLength: 2000 },
    },
  },
};

const dataRequestRateLimit = { max: 5, timeWindow: '1 hour' };

// Wraps a handler so unexpected errors are logged and returned as a generic 500.
const handle = (label, fn) => async (request, reply) => {
  try {
    return await fn(request, reply);
  } catch (error) {
    request.log.error(error, `${label} failed`);
    return reply.code(500).send({ error: 'Internal server error' });
  }
};

// ---------------------------------------------------------------------------
// Routes (all under /api/patient, patient role only, scoped to request.user.id)
// ---------------------------------------------------------------------------

export default async function patientRoutes(fastify) {
  fastify.addHook('preHandler', authorize('patient'));

  // Profile
  fastify.get('/profile', handle('Fetching profile', async (request, reply) => {
    const profile = await GetProfile(request.user.id);
    if (!profile) return reply.code(404).send({ error: 'User not found' });
    return { profile };
  }));

  fastify.put('/profile', { schema: updateProfileSchema }, async (request, reply) => {
    try {
      const profile = await UpdateProfile(request.user.id, request.body);
      return { message: 'Changes saved', profile };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return reply.code(409).send({ error: 'That email is already used by another account.' });
      }
      request.log.error(error, 'Updating profile failed');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Doctors (for booking)
  fastify.get('/doctors', handle('Listing doctors', async () => ({ doctors: await ListDoctors() })));

  // Appointments
  fastify.get('/appointments', { schema: listAppointmentsSchema }, handle('Listing appointments', async (request) => {
    return { appointments: await ListAppointments(request.user.id, request.query) };
  }));

  fastify.get('/appointments/:id', { schema: { params: idParams } }, handle('Fetching appointment', async (request, reply) => {
    const appointment = await GetAppointment(request.user.id, request.params.id);
    if (!appointment) return reply.code(404).send({ error: 'Appointment not found' });
    return { appointment };
  }));

  fastify.post('/appointments', { schema: createAppointmentSchema }, handle('Creating appointment', async (request, reply) => {
    const result = await CreateAppointment(request.user.id, request.body);
    if (!result.success) return reply.code(result.status).send({ error: result.message });
    return reply.code(201).send({ message: 'Appointment booked', appointment: result.appointment });
  }));

  fastify.post('/appointments/:id/cancel', { schema: { params: idParams } }, handle('Cancelling appointment', async (request, reply) => {
    const result = await CancelAppointment(request.user.id, request.params.id);
    if (!result.success) return reply.code(result.status).send({ error: result.message });
    return { message: 'Appointment cancelled', appointment: result.appointment };
  }));

  // Notifications
  fastify.get('/notifications', handle('Listing notifications', async (request) => {
    return { notifications: await ListNotifications(request.user.id) };
  }));

  fastify.post('/notifications/read-all', handle('Marking notifications read', async (request) => {
    const updated = await MarkAllNotificationsRead(request.user.id);
    return { message: 'All notifications marked as read', updated };
  }));

  fastify.post('/notifications/:id/read', { schema: { params: idParams } }, handle('Marking notification read', async (request, reply) => {
    if (!(await MarkNotificationRead(request.user.id, request.params.id))) {
      return reply.code(404).send({ error: 'Notification not found' });
    }
    return { message: 'Notification marked as read' };
  }));

  // Conversations
  fastify.get('/conversations', handle('Listing conversations', async (request) => {
    return { conversations: await ListConversations(request.user.id) };
  }));

  fastify.post('/conversations', { schema: createConversationSchema }, handle('Creating conversation', async (request, reply) => {
    const conversation = await CreateConversation(request.user.id, request.body.message);
    return reply.code(201).send({ conversation });
  }));

  fastify.get('/conversations/:id', { schema: { params: idParams } }, handle('Fetching conversation', async (request, reply) => {
    const conversation = await GetConversation(request.user.id, request.params.id);
    if (!conversation) return reply.code(404).send({ error: 'Conversation not found' });
    return { conversation };
  }));

  fastify.post('/conversations/:id/messages', { schema: addMessageSchema }, handle('Adding message', async (request, reply) => {
    const message = await AddConversationMessage(request.user.id, request.params.id, request.body.message);
    if (!message) return reply.code(404).send({ error: 'Conversation not found' });
    return reply.code(201).send({ message });
  }));

  fastify.patch('/conversations/:id', { schema: renameConversationSchema }, handle('Renaming conversation', async (request, reply) => {
    if (!(await RenameConversation(request.user.id, request.params.id, request.body.title))) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }
    return { message: 'Conversation renamed' };
  }));

  fastify.delete('/conversations/:id', { schema: { params: idParams } }, handle('Deleting conversation', async (request, reply) => {
    if (!(await DeleteConversation(request.user.id, request.params.id))) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }
    return { message: 'Conversation deleted' };
  }));

  // Privacy
  fastify.get('/consents', handle('Fetching consents', async (request) => {
    return { consents: await GetConsents(request.user.id) };
  }));

  fastify.put('/consents', { schema: updateConsentsSchema }, handle('Updating consents', async (request) => {
    return { message: 'Consent preferences saved', consents: await UpdateConsents(request.user.id, request.body) };
  }));

  fastify.get('/data-requests', handle('Listing data requests', async (request) => {
    return { requests: await ListDataRequests(request.user.id) };
  }));

  fastify.post(
    '/data-requests',
    { schema: dataRequestSchema, config: { rateLimit: dataRequestRateLimit } },
    handle('Creating data request', async (request, reply) => {
      const result = await CreateDataRequest(request.user.id, request.body);
      return reply.code(201).send({ message: 'Request received', request: result });
    }),
  );
}
