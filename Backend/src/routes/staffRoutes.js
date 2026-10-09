import {
  GetDashboard,
  GetReport,
  ListActivity,
  ListAppointments,
  GetAppointment,
  CreateAppointment,
  UpdateAppointment,
  ListDoctors,
  CreateDoctor,
  UpdateDoctor,
  GetWeekSchedule,
  SetSchedule,
  ListPatients,
  GetPatient,
  CreatePatient,
  UpdatePatient,
  SearchPatientOptions,
  ListDepartments,
  CreateDepartment,
  UpdateDepartment,
} from '../controllers/staffController.js';
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
const time = { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' };
const search = { type: 'string', maxLength: 100 };
const notes = { type: 'string', maxLength: 1000 };
const nullableId = { anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }] };
const text = (max) => ({ type: 'string', minLength: 1, maxLength: max, pattern: '\\S' });
const optionalText = (max) => ({ type: 'string', maxLength: max });

const pagination = {
  page: { type: 'integer', minimum: 1, default: 1 },
  pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
};

const query = (properties) => ({
  querystring: { type: 'object', additionalProperties: false, properties },
});

const body = (properties, required = []) => ({
  type: 'object',
  additionalProperties: false,
  required,
  ...(required.length === 0 && { minProperties: 1 }),
  properties,
});

const dashboardSchema = query({
  date: isoDate,
  range: { type: 'integer', enum: [7, 30], default: 7 },
});

const appointmentStatuses = ['Scheduled', 'Pending Review', 'Confirmed', 'Completed', 'Cancelled'];

const appointmentListSchema = query({
  ...pagination,
  search,
  status: { type: 'string', enum: appointmentStatuses },
  doctorId: { type: 'integer', minimum: 1 },
  departmentId: { type: 'integer', minimum: 1 },
  specialty: { type: 'string', maxLength: 100 },
  from: isoDate,
  to: isoDate,
  order: { type: 'string', enum: ['soonest', 'latest'], default: 'soonest' },
});

const createAppointmentSchema = {
  body: body(
    {
      patientId: { type: 'integer', minimum: 1 },
      doctorId: nullableId,
      reason: text(255),
      type: { type: 'string', enum: ['consult', 'follow-up', 'checkup'] },
      scheduledAt: { type: 'string', format: 'date-time' },
    },
    ['patientId', 'reason', 'scheduledAt'],
  ),
};

const updateAppointmentSchema = {
  params: idParams,
  body: body({
    doctorId: nullableId,
    scheduledAt: { type: 'string', format: 'date-time' },
    status: { type: 'string', enum: ['Completed', 'Cancelled'] },
    notes,
  }),
};

const patientStatuses = ['Active', 'Inactive'];

const patientListSchema = query({
  ...pagination,
  pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
  search,
  status: { type: 'string', enum: patientStatuses },
});

const createPatientSchema = {
  body: body(
    {
      firstname: text(100),
      lastname: text(100),
      email: { type: 'string', format: 'email', maxLength: 255 },
      mobile: { type: 'string', maxLength: 30, pattern: '^[0-9+()\\-\\s]*$' },
      password: { type: 'string', minLength: 8, maxLength: 128 },
      status: { type: 'string', enum: patientStatuses },
      notes,
    },
    ['firstname', 'lastname', 'email', 'password'],
  ),
};

const updatePatientSchema = {
  params: idParams,
  body: body({ status: { type: 'string', enum: patientStatuses }, notes }),
};

const doctorFields = {
  name: text(150),
  specialty: text(100),
  departmentId: nullableId,
  license: optionalText(60),
  email: { anyOf: [{ type: 'string', format: 'email', maxLength: 255 }, { type: 'string', maxLength: 0 }] },
  intro: optionalText(2000),
  workStart: time,
  workEnd: time,
};

const doctorListSchema = query({
  search,
  specialty: { type: 'string', maxLength: 100 },
  departmentId: { type: 'integer', minimum: 1 },
  includeInactive: { type: 'boolean', default: false },
});

const createDoctorSchema = { body: body(doctorFields, ['name', 'specialty']) };
const updateDoctorSchema = { params: idParams, body: body({ ...doctorFields, active: { type: 'boolean' } }) };

const scheduleSchema = query({ weekStart: isoDate, search });

const setScheduleSchema = {
  body: body(
    {
      doctorId: { type: 'integer', minimum: 1 },
      weekStart: isoDate,
      day: { type: 'string', enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Whole week'] },
      status: { type: 'string', enum: ['Active', 'Leave', 'Blocked'] },
      notes: optionalText(500),
    },
    ['doctorId', 'weekStart', 'day', 'status'],
  ),
};

const departmentFields = {
  name: text(120),
  specialty: text(100),
  headDoctorId: nullableId,
  opensAt: time,
  closesAt: time,
  dailyCapacity: { type: 'integer', minimum: 0, maximum: 10000 },
  status: { type: 'string', enum: ['Active', 'Inactive'] },
  notes,
};

const departmentListSchema = query({ search, status: { type: 'string', enum: ['Active', 'Inactive'] } });
const createDepartmentSchema = { body: body(departmentFields, ['name', 'specialty']) };
const updateDepartmentSchema = { params: idParams, body: body(departmentFields) };

const reportSchema = query({ month: { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$' } });

const activitySchema = query({
  entityType: { type: 'string', enum: ['appointment', 'patient', 'doctor', 'department'] },
  entityId: { type: 'integer', minimum: 1 },
  limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const handle = (label, fn) => async (request, reply) => {
  try {
    return await fn(request, reply);
  } catch (error) {
    request.log.error(error, `${label} failed`);
    return reply.code(500).send({ error: 'Internal server error' });
  }
};

// Sends a controller result ({ success, status, message, ...data }) as the response.
const respond = (reply, result, successCode = 200, message) => {
  if (!result.success) return reply.code(result.status).send({ error: result.message });
  const { success, ...data } = result;
  return reply.code(successCode).send(message ? { message, ...data } : data);
};

// ---------------------------------------------------------------------------
// Routes (all under /api/staff, staff role only)
// ---------------------------------------------------------------------------

export default async function staffRoutes(fastify) {
  fastify.addHook('preHandler', authorize('staff'));

  // Dashboard
  fastify.get('/dashboard', { schema: dashboardSchema }, handle('Loading staff dashboard', async (request) =>
    GetDashboard(request.query)));

  // Appointments
  fastify.get('/appointments', { schema: appointmentListSchema }, handle('Listing staff appointments', async (request) =>
    ListAppointments(request.query)));

  fastify.get('/appointments/:id', { schema: { params: idParams } }, handle('Fetching staff appointment', async (request, reply) => {
    const appointment = await GetAppointment(request.params.id);
    if (!appointment) return reply.code(404).send({ error: 'Appointment not found' });
    return { appointment };
  }));

  fastify.post('/appointments', { schema: createAppointmentSchema }, handle('Creating staff appointment', async (request, reply) =>
    respond(reply, await CreateAppointment(request.user.id, request.body), 201, 'Appointment booked')));

  fastify.patch('/appointments/:id', { schema: updateAppointmentSchema }, handle('Updating staff appointment', async (request, reply) =>
    respond(reply, await UpdateAppointment(request.user.id, request.params.id, request.body), 200, 'Appointment updated')));

  // Patients
  fastify.get('/patients', { schema: patientListSchema }, handle('Listing staff patients', async (request) =>
    ListPatients(request.query)));

  fastify.get('/patients/options', { schema: query({ search }) }, handle('Searching patients', async (request) => ({
    patients: await SearchPatientOptions(request.query.search),
  })));

  fastify.get('/patients/:id', { schema: { params: idParams } }, handle('Fetching staff patient', async (request, reply) => {
    const patient = await GetPatient(request.params.id);
    if (!patient) return reply.code(404).send({ error: 'Patient not found' });
    return { patient };
  }));

  fastify.post('/patients', { schema: createPatientSchema }, handle('Registering patient', async (request, reply) =>
    respond(reply, await CreatePatient(request.user.id, request.body), 201, 'Patient registered')));

  fastify.patch('/patients/:id', { schema: updatePatientSchema }, handle('Updating patient', async (request, reply) =>
    respond(reply, await UpdatePatient(request.user.id, request.params.id, request.body), 200, 'Patient updated')));

  // Doctors
  fastify.get('/doctors', { schema: doctorListSchema }, handle('Listing staff doctors', async (request) => ({
    doctors: await ListDoctors(request.query),
  })));

  fastify.post('/doctors', { schema: createDoctorSchema }, handle('Adding doctor', async (request, reply) =>
    respond(reply, await CreateDoctor(request.user.id, request.body), 201, 'Doctor added')));

  fastify.patch('/doctors/:id', { schema: updateDoctorSchema }, handle('Updating doctor', async (request, reply) =>
    respond(reply, await UpdateDoctor(request.user.id, request.params.id, request.body), 200, 'Doctor updated')));

  // Scheduling
  fastify.get('/schedule', { schema: scheduleSchema }, handle('Loading schedule', async (request) =>
    GetWeekSchedule(request.query)));

  fastify.put('/schedule', { schema: setScheduleSchema }, handle('Updating schedule', async (request, reply) =>
    respond(reply, await SetSchedule(request.user.id, request.body), 200, 'Schedule updated')));

  // Departments
  fastify.get('/departments', { schema: departmentListSchema }, handle('Listing departments', async (request) => ({
    departments: await ListDepartments(request.query),
  })));

  fastify.post('/departments', { schema: createDepartmentSchema }, handle('Adding department', async (request, reply) =>
    respond(reply, await CreateDepartment(request.user.id, request.body), 201, 'Department added')));

  fastify.patch('/departments/:id', { schema: updateDepartmentSchema }, handle('Updating department', async (request, reply) =>
    respond(reply, await UpdateDepartment(request.user.id, request.params.id, request.body), 200, 'Department updated')));

  // Reports and audit trail
  fastify.get('/reports', { schema: reportSchema }, handle('Building report', async (request) =>
    GetReport(request.query)));

  fastify.get('/activity', { schema: activitySchema }, handle('Listing activity', async (request) => ({
    activity: await ListActivity(request.query),
  })));
}
