import db from '../../util/database.js';
import { blankToNull, escapeLike, fail, hhmm, inTransaction, isoDay, LogActivity, ok } from './shared.js';

// Availability is derived: On leave (leave/blocked today), In consultation (an appointment now),
// otherwise Available. Inactive doctors are listed separately with `active: false`.
const SELECT = `
  SELECT d.id, d.name, d.specialty, d.department_id AS departmentId, dep.name AS department,
         d.license, d.email, d.intro, d.active,
         d.work_start AS workStart, d.work_end AS workEnd,
         (SELECT COUNT(*) FROM appointments a
           WHERE a.doctor_id = d.id AND a.status <> 'Cancelled'
             AND a.scheduled_at >= CURDATE() AND a.scheduled_at < CURDATE() + INTERVAL 1 DAY) AS today,
         (SELECT x.status FROM doctor_schedule_exceptions x
           WHERE x.doctor_id = d.id AND x.day = CURDATE()) AS exceptionToday,
         EXISTS (SELECT 1 FROM appointments a
           WHERE a.doctor_id = d.id AND a.status = 'Scheduled'
             AND a.scheduled_at <= NOW() AND a.scheduled_at > NOW() - INTERVAL 30 MINUTE) AS busyNow
    FROM doctors d
    LEFT JOIN departments dep ON dep.id = d.department_id`;

const shape = ({ exceptionToday, busyNow, workStart, workEnd, ...row }) => ({
  ...row,
  active: Boolean(row.active),
  today: Number(row.today),
  workStart: hhmm(workStart),
  workEnd: hhmm(workEnd),
  availability: !row.active ? 'Inactive' : exceptionToday ? 'On leave' : busyNow ? 'In consultation' : 'Available',
});

export async function ListDoctors({ search, specialty, departmentId, includeInactive = false } = {}) {
  const where = [];
  const params = [];
  if (!includeInactive) where.push('d.active = 1');
  if (specialty) { where.push('d.specialty = ?'); params.push(specialty); }
  if (departmentId) { where.push('d.department_id = ?'); params.push(departmentId); }
  if (search) {
    const like = escapeLike(search);
    where.push('(d.name LIKE ? OR d.specialty LIKE ? OR dep.name LIKE ?)');
    params.push(like, like, like);
  }
  const [rows] = await db.execute(
    `${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY d.active DESC, d.name, d.id`,
    params,
  );
  return rows.map(shape);
}

async function GetDoctor(doctorId, connection = db) {
  const [rows] = await connection.execute(`${SELECT} WHERE d.id = ?`, [doctorId]);
  return rows[0] ? shape(rows[0]) : null;
}

const withDrPrefix = (name) => {
  const clean = name.trim().replace(/\s+/g, ' ');
  return /^Dr\.?\s/i.test(clean) ? clean.replace(/^Dr\.?\s*/i, 'Dr. ') : `Dr. ${clean}`;
};

async function CheckDepartment(connection, departmentId) {
  if (!departmentId) return null;
  const [rows] = await connection.execute('SELECT 1 FROM departments WHERE id = ?', [departmentId]);
  return rows.length ? null : fail(400, 'That department does not exist.');
}

const DOCTOR_COLUMNS = {
  name: 'name',
  specialty: 'specialty',
  departmentId: 'department_id',
  license: 'license',
  email: 'email',
  intro: 'intro',
  workStart: 'work_start',
  workEnd: 'work_end',
  active: 'active',
};

function doctorValues(input) {
  const out = {};
  for (const [key, column] of Object.entries(DOCTOR_COLUMNS)) {
    if (input[key] === undefined) continue;
    let value = input[key];
    if (key === 'name') value = withDrPrefix(value);
    else if (key === 'active') value = value ? 1 : 0;
    else if (typeof value === 'string') value = blankToNull(value.trim());
    out[column] = value;
  }
  return out;
}

export async function CreateDoctor(actorId, input) {
  if (input.workStart && input.workEnd && input.workStart >= input.workEnd) {
    return fail(400, 'Working hours must end after they start.');
  }
  return inTransaction(async (connection) => {
    const problem = await CheckDepartment(connection, input.departmentId);
    if (problem) return problem;
    const values = doctorValues(input);
    const columns = Object.keys(values);
    const [result] = await connection.execute(
      `INSERT INTO doctors (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      Object.values(values),
    );
    await LogActivity(connection, actorId, {
      action: 'doctor.create', entityType: 'doctor', entityId: result.insertId, summary: `Added ${values.name}`,
    });
    return ok({ doctor: await GetDoctor(result.insertId, connection) });
  });
}

export async function UpdateDoctor(actorId, doctorId, input) {
  return inTransaction(async (connection) => {
    const [rows] = await connection.execute(
      'SELECT name, work_start AS workStart, work_end AS workEnd FROM doctors WHERE id = ? FOR UPDATE',
      [doctorId],
    );
    if (rows.length === 0) return fail(404, 'Doctor not found.');
    const start = input.workStart ?? hhmm(rows[0].workStart);
    const end = input.workEnd ?? hhmm(rows[0].workEnd);
    if (start >= end) return fail(400, 'Working hours must end after they start.');

    const problem = await CheckDepartment(connection, input.departmentId);
    if (problem) return problem;
    const values = doctorValues(input);
    if (Object.keys(values).length) {
      await connection.execute(
        `UPDATE doctors SET ${Object.keys(values).map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
        [...Object.values(values), doctorId],
      );
    }
    await LogActivity(connection, actorId, {
      action: 'doctor.update', entityType: 'doctor', entityId: doctorId,
      summary: `Updated profile of ${values.name || rows[0].name}`,
    });
    return ok({ doctor: await GetDoctor(doctorId, connection) });
  });
}

// ---- Weekly schedule (Monday-Friday) ----

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const mondayOf = (isoDate) => {
  const d = isoDate ? new Date(`${isoDate}T00:00:00`) : new Date();
  d.setHours(0, 0, 0, 0);
  return addDays(d, -((d.getDay() + 6) % 7));
};

export async function GetWeekSchedule({ weekStart, search } = {}) {
  const monday = mondayOf(weekStart);
  const days = DAYS.map((_, i) => isoDay(addDays(monday, i)));
  const friday = days[4];

  const where = ['d.active = 1'];
  const params = [];
  if (search) { where.push('d.name LIKE ?'); params.push(escapeLike(search)); }
  const [doctors] = await db.execute(
    `SELECT d.id, d.name, d.specialty, d.work_start AS workStart, d.work_end AS workEnd
       FROM doctors d WHERE ${where.join(' AND ')} ORDER BY d.name, d.id`,
    params,
  );
  if (doctors.length === 0) return { weekStart: days[0], days, schedules: [] };

  const ids = doctors.map((d) => d.id);
  const marks = ids.map(() => '?').join(', ');
  const [exceptions] = await db.execute(
    `SELECT doctor_id AS doctorId, DATE_FORMAT(day, '%Y-%m-%d') AS day, status, notes
       FROM doctor_schedule_exceptions
      WHERE doctor_id IN (${marks}) AND day BETWEEN ? AND ?`,
    [...ids, days[0], friday],
  );
  // Conflicts: scheduled appointments on a leave/blocked day or outside working hours.
  const [appointments] = await db.execute(
    `SELECT a.doctor_id AS doctorId, DATE_FORMAT(a.scheduled_at, '%Y-%m-%d') AS day,
            TIME(a.scheduled_at) AS time
       FROM appointments a
      WHERE a.doctor_id IN (${marks}) AND a.status = 'Scheduled'
        AND a.scheduled_at >= ? AND a.scheduled_at < DATE_ADD(?, INTERVAL 1 DAY)`,
    [...ids, `${days[0]} 00:00:00`, friday],
  );

  const schedules = doctors.map((doctor) => {
    const hours = `${hhmm(doctor.workStart)}–${hhmm(doctor.workEnd)}`;
    const mine = exceptions.filter((e) => e.doctorId === doctor.id);
    const week = days.map((day) => {
      const exception = mine.find((e) => e.day === day);
      return exception ? exception.status : hours;
    });
    const conflicts = appointments.filter((a) => {
      if (a.doctorId !== doctor.id) return false;
      if (mine.some((e) => e.day === a.day)) return true;
      const t = String(a.time);
      return t < String(doctor.workStart) || t >= String(doctor.workEnd);
    }).length;
    const notes = mine.map((e) => e.notes).filter(Boolean).join(' · ');
    return { id: doctor.id, name: doctor.name, specialty: doctor.specialty, hours, week, conflicts, notes };
  });

  return { weekStart: days[0], days, schedules };
}

// status Active clears leave/blocked for the chosen days; Leave/Blocked marks them.
export async function SetSchedule(actorId, { doctorId, weekStart, day, status, notes }) {
  const monday = mondayOf(weekStart);
  const targets = day === 'Whole week'
    ? DAYS.map((_, i) => isoDay(addDays(monday, i)))
    : [isoDay(addDays(monday, DAYS.indexOf(day)))];

  return inTransaction(async (connection) => {
    const [doctors] = await connection.execute('SELECT name FROM doctors WHERE id = ? AND active = 1', [doctorId]);
    if (doctors.length === 0) return fail(404, 'Doctor not found.');

    for (const target of targets) {
      if (status === 'Active') {
        await connection.execute('DELETE FROM doctor_schedule_exceptions WHERE doctor_id = ? AND day = ?', [doctorId, target]);
      } else {
        await connection.execute(
          `INSERT INTO doctor_schedule_exceptions (doctor_id, day, status, notes, created_by)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes), created_by = VALUES(created_by)`,
          [doctorId, target, status, blankToNull(notes?.trim() ?? null), actorId],
        );
      }
    }

    const label = day === 'Whole week' ? `week of ${targets[0]}` : targets[0];
    await LogActivity(connection, actorId, {
      action: 'schedule.update', entityType: 'doctor', entityId: doctorId,
      summary: `${doctors[0].name}: ${status === 'Active' ? 'available' : status.toLowerCase()} on ${label}`,
      notes,
    });
    return ok();
  });
}
