import db from '../../util/database.js';
import { AppointmentReference, WithUniqueReference } from '../../util/reference.js';
import { escapeLike, fail, hhmm, inTransaction, isoDay, LogActivity, ok, patientCode } from './shared.js';

// Patients who withdrew the staff-review consent are hidden from staff lists.
const CONSENT = 'COALESCE(c.staff_review, 1) = 1';

// Staff-facing status: a scheduled appointment without a doctor still needs review.
export const DISPLAY_STATUS = `CASE WHEN a.status = 'Scheduled' AND a.doctor_id IS NULL THEN 'Pending Review'
                                     WHEN a.status = 'Scheduled' THEN 'Confirmed'
                                     ELSE a.status END`;

const FROM = `
    FROM appointments a
    JOIN users u ON u.id = a.patient_id
    LEFT JOIN patient_profiles p ON p.user_id = u.id
    LEFT JOIN patient_consents c ON c.user_id = u.id
    LEFT JOIN doctors d ON d.id = a.doctor_id
    LEFT JOIN departments dep ON dep.id = d.department_id`;

const SELECT = `
  SELECT a.id, a.reference AS ref, a.patient_id AS patientId,
         u.firstname, u.lastname, u.email, p.mobile,
         a.doctor_id AS doctorId, d.name AS doctor, d.specialty,
         dep.id AS departmentId, dep.name AS department,
         a.reason, a.visit_type AS type, a.mode, a.scheduled_at AS scheduledAt,
         a.status, ${DISPLAY_STATUS} AS displayStatus, a.source, a.created_at AS createdAt
  ${FROM}`;

export const shapeAppointment = ({ firstname, lastname, ...row }) => ({
  ...row,
  patient: `${firstname} ${lastname}`.trim(),
  patientCode: patientCode(row.patientId),
});

export async function GetAppointment(appointmentId, connection = db) {
  const [rows] = await connection.execute(`${SELECT} WHERE a.id = ? AND ${CONSENT}`, [appointmentId]);
  return rows[0] ? shapeAppointment(rows[0]) : null;
}

export async function ListAppointments({
  status, doctorId, departmentId, specialty, from, to, search,
  order = 'soonest', page = 1, pageSize = 25,
} = {}) {
  const where = [CONSENT];
  const params = [];
  if (status === 'Pending Review') where.push("a.status = 'Scheduled' AND a.doctor_id IS NULL");
  else if (status === 'Confirmed') where.push("a.status = 'Scheduled' AND a.doctor_id IS NOT NULL");
  else if (status) { where.push('a.status = ?'); params.push(status); }
  if (doctorId) { where.push('a.doctor_id = ?'); params.push(doctorId); }
  if (departmentId) { where.push('d.department_id = ?'); params.push(departmentId); }
  if (specialty) { where.push('d.specialty = ?'); params.push(specialty); }
  if (from) { where.push('a.scheduled_at >= ?'); params.push(`${from} 00:00:00`); }
  if (to) { where.push('a.scheduled_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(to); }
  if (search) {
    const like = escapeLike(search);
    where.push(`(a.reference LIKE ? OR u.firstname LIKE ? OR u.lastname LIKE ?
                 OR CONCAT(u.firstname, ' ', u.lastname) LIKE ? OR d.name LIKE ?)`);
    params.push(like, like, like, like, like);
  }

  const [countRows] = await db.execute(`SELECT COUNT(*) AS total ${FROM} WHERE ${where.join(' AND ')}`, params);
  const [rows] = await db.execute(
    `${SELECT}
      WHERE ${where.join(' AND ')}
      ORDER BY a.scheduled_at ${order === 'latest' ? 'DESC' : 'ASC'}, a.id DESC
      LIMIT ? OFFSET ?`,
    [...params, String(pageSize), String((page - 1) * pageSize)],
  );
  return { appointments: rows.map(shapeAppointment), total: Number(countRows[0].total), page, pageSize };
}

const timeOf = (date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;

// Checks that a doctor can take an appointment at `when`: active, Monday-Friday within working hours,
// not on leave / blocked, and not double-booked. All visits are in-person at the hospital.
async function CheckDoctorSlot(connection, doctorId, when, ignoreAppointmentId = 0) {
  const [doctors] = await connection.execute(
    'SELECT name, work_start AS workStart, work_end AS workEnd FROM doctors WHERE id = ? AND active = 1',
    [doctorId],
  );
  if (doctors.length === 0) return fail(400, 'That doctor is not available.');
  const { name, workStart, workEnd } = doctors[0];

  const weekday = when.getDay();
  if (weekday === 0 || weekday === 6) return fail(409, `${name} does not work on weekends.`);
  const at = timeOf(when);
  if (at < String(workStart) || at >= String(workEnd)) {
    return fail(409, `${name} works ${hhmm(workStart)}–${hhmm(workEnd)}. Choose a time within those hours.`);
  }

  const [exceptions] = await connection.execute(
    'SELECT status FROM doctor_schedule_exceptions WHERE doctor_id = ? AND day = ?',
    [doctorId, isoDay(when)],
  );
  if (exceptions.length) {
    return fail(409, `${name} is unavailable that day (${exceptions[0].status.toLowerCase()}).`);
  }

  const [clashes] = await connection.execute(
    `SELECT 1 FROM appointments
      WHERE doctor_id = ? AND status = 'Scheduled' AND scheduled_at = ? AND id <> ?`,
    [doctorId, when, ignoreAppointmentId],
  );
  if (clashes.length) return fail(409, `${name} already has an appointment at that time.`);
  return null;
}

async function NotifyPatient(connection, patientId, title, body) {
  await connection.execute(
    `INSERT INTO notifications (user_id, category, type, title, body)
     VALUES (?, 'appointments', 'reminder', ?, ?)`,
    [patientId, title, body],
  );
}

export async function CreateAppointment(actorId, { patientId, doctorId, reason, type, scheduledAt }) {
  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime()) || when <= new Date()) return fail(400, 'Choose a date and time in the future.');

  return inTransaction(async (connection) => {
    const [patients] = await connection.execute(
      `SELECT u.id FROM users u
         LEFT JOIN patient_consents c ON c.user_id = u.id
        WHERE u.id = ? AND u.role = 'patient' AND u.account_status = 'Active' AND ${CONSENT}`,
      [patientId],
    );
    if (patients.length === 0) return fail(400, 'That patient was not found or is inactive.');

    if (doctorId) {
      const problem = await CheckDoctorSlot(connection, doctorId, when);
      if (problem) return problem;
    }

    const id = await WithUniqueReference(AppointmentReference, async (reference) => {
      const [result] = await connection.execute(
        `INSERT INTO appointments (reference, patient_id, doctor_id, reason, visit_type, mode, scheduled_at, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [reference, patientId, doctorId || null, reason.trim(), type || 'consult', 'In-person', when, 'Front Desk'],
      );
      return result.insertId;
    });

    await NotifyPatient(connection, patientId, 'Appointment booked',
      'The hospital booked an appointment for you. Please check your appointment list.');
    const appointment = await GetAppointment(id, connection);
    await LogActivity(connection, actorId, {
      action: 'appointment.create',
      entityType: 'appointment',
      entityId: id,
      summary: `Booked appointment ${appointment.ref}`,
    });
    return ok({ appointment });
  });
}

export async function UpdateAppointment(actorId, appointmentId, { notes, ...changes }) {
  let when;
  if (changes.scheduledAt !== undefined) {
    when = new Date(changes.scheduledAt);
    if (Number.isNaN(when.getTime()) || when <= new Date()) return fail(400, 'Choose a date and time in the future.');
  }

  return inTransaction(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT a.patient_id AS patientId, a.status, a.doctor_id AS doctorId, a.scheduled_at AS scheduledAt, a.reference
         FROM appointments a
         LEFT JOIN patient_consents c ON c.user_id = a.patient_id
        WHERE a.id = ? AND ${CONSENT}
        FOR UPDATE`,
      [appointmentId],
    );
    const current = rows[0];
    if (!current) return fail(404, 'Appointment not found.');
    if (current.status !== 'Scheduled') return fail(409, 'Only scheduled appointments can be changed.');

    const nextDoctor = changes.doctorId !== undefined ? changes.doctorId : current.doctorId;
    const nextWhen = when || current.scheduledAt;
    const movesSlot = changes.doctorId !== undefined || when !== undefined;
    if (nextDoctor && movesSlot && changes.status !== 'Cancelled') {
      const problem = await CheckDoctorSlot(connection, nextDoctor, nextWhen, appointmentId);
      if (problem) return problem;
    }

    const updates = [];
    const values = [];
    if (changes.doctorId !== undefined) { updates.push('doctor_id = ?'); values.push(changes.doctorId); }
    if (when) { updates.push('scheduled_at = ?'); values.push(when); }
    if (changes.status !== undefined) {
      updates.push('status = ?');
      values.push(changes.status);
      if (changes.status === 'Cancelled') updates.push('cancelled_at = NOW()');
    }
    if (updates.length) {
      await connection.execute(`UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`, [...values, appointmentId]);
    }

    if (changes.status === 'Cancelled') {
      await NotifyPatient(connection, current.patientId, 'Appointment cancelled',
        'The hospital cancelled one of your appointments. Please check your appointment list.');
    } else if (movesSlot) {
      await NotifyPatient(connection, current.patientId, 'Appointment updated',
        'Your appointment details have changed. Please check your appointment list.');
    }

    const what = changes.status ? changes.status.toLowerCase() : 'updated';
    await LogActivity(connection, actorId, {
      action: `appointment.${changes.status ? changes.status.toLowerCase() : 'update'}`,
      entityType: 'appointment',
      entityId: appointmentId,
      summary: `Appointment ${current.reference} ${what}`,
      notes,
    });
    return ok({ appointment: await GetAppointment(appointmentId, connection) });
  });
}
