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
  UpdateConversation,
  DeleteConversation,
  GenerateAssistantReply,
  GetConsents,
  UpdateConsents,
  CreateDataRequest,
  ListDataRequests,
} from '../controllers/patientController.js';
import { authorize } from '../middlewares/middleware.js';
import {
  medicalChat,
  analyzeImage,
  transcribeAudio,
  getProgress,
  AIServiceError,
  patientMessageFor,
} from '../services/aiClient.js';

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

const updateConversationSchema = {
  params: idParams,
  body: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 120, pattern: '\\S' },
      pinned: { type: 'boolean' },
      archived: { type: 'boolean' },
    },
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
// One MedGemma reply takes ~45-60 s and the GPU handles one request at a time.
const aiReplyRateLimit = { max: 8, timeWindow: '1 minute' };

// Upload limits match AI/app/config.py (AI_MAX_IMAGE_BYTES, AI_MAX_AUDIO_BYTES) and AI/app/media.py.
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const AUDIO_MAX_BYTES = 15 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// The browser picks a random progress id per reply request and polls /ai-progress/:id while it runs.
// It is prefixed with the user id so a patient can only read progress of their own requests.
const progressIdPattern = '^[A-Za-z0-9-]{8,40}$';
const progressQuery = {
  type: 'object',
  additionalProperties: false,
  properties: { progress: { type: 'string', pattern: progressIdPattern } },
};
const aiRequestId = (userId, progressId) => `p${userId}-${progressId}`;
// Polled about once a second during a ~1 minute reply; above the 100/min global limit on purpose.
const progressRateLimit = { max: 240, timeWindow: '1 minute' };

class UploadError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Reads a single uploaded file from a multipart request. Returns { file, fields } where file is
// { buffer, mimetype, filename } or null when the request is not multipart or has no file.
async function readUpload(request, fieldName, maxBytes) {
  if (!request.isMultipart()) return { file: null, fields: {} };
  const fields = {};
  let file = null;
  try {
    for await (const part of request.parts({ limits: { fileSize: maxBytes, files: 1 } })) {
      if (part.type === 'file') {
        if (part.fieldname !== fieldName) {
          part.file.resume();
          continue;
        }
        const buffer = await part.toBuffer();
        file = { buffer, mimetype: part.mimetype, filename: part.filename };
      } else {
        fields[part.fieldname] = String(part.value ?? '');
      }
    }
  } catch (error) {
    if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
      throw new UploadError(413, `The file is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.`);
    }
    if (error.code === 'FST_FILES_LIMIT') throw new UploadError(400, 'Attach one file at a time.');
    throw error;
  }
  return { file, fields };
}

function sendAIFailure(request, reply, error, label) {
  if (error instanceof UploadError) return reply.code(error.status).send({ error: error.message });
  if (error instanceof AIServiceError) {
    request.log.warn({ statusCode: error.status, code: error.code }, `${label} failed`);
    // 422 = the AI service rejected the patient's input (bad photo, too long, ...): show it as such.
    // Other 4xx from the AI service are backend/service problems (e.g. wrong token): report 502.
    const status = error.status === 422 ? 422 : error.status >= 500 ? error.status : 502;
    return reply.code(status).send({ error: patientMessageFor(error), code: error.code });
  }
  request.log.error(error, `${label} failed`);
  return reply.code(500).send({ error: 'Internal server error' });
}

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

  // Asks the AI assistant to answer the patient's latest message(s) and stores the reply.
  // Send no body for a text reply, or multipart/form-data with an `image` (JPEG/PNG/WebP, max 10 MB)
  // to have MedGemma look at the photo together with the patient's latest message.
  fastify.post(
    '/conversations/:id/reply',
    { schema: { params: idParams, querystring: progressQuery }, config: { rateLimit: aiReplyRateLimit } },
    async (request, reply) => {
      try {
        const { file: image } = await readUpload(request, 'image', IMAGE_MAX_BYTES);
        if (image && !IMAGE_TYPES.has(image.mimetype)) {
          return reply.code(415).send({ error: 'Only JPEG, PNG and WebP photos can be analysed.' });
        }
        const progressId = request.query.progress;
        const result = await GenerateAssistantReply(request.user.id, request.params.id, {
          chat: medicalChat,
          analyzeImage,
          image,
          requestId: progressId ? aiRequestId(request.user.id, progressId) : request.id,
        });
        if (!result) return reply.code(404).send({ error: 'Conversation not found' });
        if (!result.pending) return reply.code(409).send({ error: 'There is no new message to reply to.' });
        return reply.code(201).send({ message: result.message, triage: result.triage });
      } catch (error) {
        return sendAIFailure(request, reply, error, 'AI reply');
      }
    },
  );

  // Live progress of a reply started with ?progress=<id>. { stage: 'waiting' } until the AI service
  // starts working on it; afterwards the AI's stage (preparing, queued, reading, writing, checking, done).
  fastify.get(
    '/ai-progress/:progressId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['progressId'],
          properties: { progressId: { type: 'string', pattern: progressIdPattern } },
        },
      },
      config: { rateLimit: progressRateLimit },
    },
    async (request, reply) => {
      try {
        const progress = await getProgress(aiRequestId(request.user.id, request.params.progressId));
        if (!progress) return { stage: 'waiting' };
        return {
          stage: progress.stage,
          kind: progress.kind,
          attempt: progress.attempt,
          tokens: progress.tokens,
          maxTokens: progress.max_tokens,
          section: progress.section,
          elapsedSeconds: progress.elapsed_seconds,
        };
      } catch (error) {
        return sendAIFailure(request, reply, error, 'Progress check');
      }
    },
  );

  // Speech-to-text with Whisper. multipart/form-data: `audio` (webm/ogg/mp4/wav/mp3, max 15 MB, max 120 s)
  // and optional `language` = auto | en | fil. The transcript is returned for the patient to review;
  // it is not stored or sent to the assistant automatically.
  fastify.post('/transcribe', { config: { rateLimit: aiReplyRateLimit } }, async (request, reply) => {
    try {
      const { file: audio, fields } = await readUpload(request, 'audio', AUDIO_MAX_BYTES);
      if (!audio) return reply.code(400).send({ error: 'Attach a voice recording.' });
      if (!audio.mimetype.startsWith('audio/') && audio.mimetype !== 'video/webm') {
        return reply.code(415).send({ error: 'The file is not an audio recording.' });
      }
      const language = ['auto', 'en', 'fil'].includes(fields.language) ? fields.language : 'auto';
      const result = await transcribeAudio(audio, language, request.id);
      return {
        text: result.text,
        language: result.language,
        durationSeconds: result.duration_seconds,
        warnings: Array.isArray(result.warnings) ? result.warnings : [],
      };
    } catch (error) {
      return sendAIFailure(request, reply, error, 'Transcription');
    }
  });

  // Rename, pin/unpin, archive/unarchive. Body: any of { title, pinned, archived }.
  fastify.patch('/conversations/:id', { schema: updateConversationSchema }, handle('Updating conversation', async (request, reply) => {
    const conversation = await UpdateConversation(request.user.id, request.params.id, request.body);
    if (!conversation) return reply.code(404).send({ error: 'Conversation not found' });
    return { message: 'Conversation updated', conversation };
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
