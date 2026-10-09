import db from '../../util/database.js';
import { blankToNull, escapeLike, fail, hhmm, inTransaction, LogActivity, ok } from './shared.js';

// capacity = today's appointments in the department as a percentage of its daily capacity.
const SELECT = `
  SELECT dep.id, dep.name, dep.specialty, dep.head_doctor_id AS headDoctorId, h.name AS head,
         dep.opens_at AS opensAt, dep.closes_at AS closesAt, dep.daily_capacity AS dailyCapacity,
         dep.status, dep.notes,
         (SELECT COUNT(*) FROM doctors d WHERE d.department_id = dep.id AND d.active = 1) AS doctors,
         (SELECT COUNT(*) FROM appointments a JOIN doctors d ON d.id = a.doctor_id
           WHERE d.department_id = dep.id AND a.status <> 'Cancelled'
             AND a.scheduled_at >= CURDATE() AND a.scheduled_at < CURDATE() + INTERVAL 1 DAY) AS todayCount
    FROM departments dep
    LEFT JOIN doctors h ON h.id = dep.head_doctor_id`;

const shape = ({ opensAt, closesAt, todayCount, ...row }) => {
  const today = Number(todayCount);
  return {
    ...row,
    doctors: Number(row.doctors),
    opensAt: hhmm(opensAt),
    closesAt: hhmm(closesAt),
    hours: `${hhmm(opensAt)}–${hhmm(closesAt)}`,
    today,
    capacity: row.dailyCapacity > 0 ? Math.min(100, Math.round((today / row.dailyCapacity) * 100)) : 0,
    notes: row.notes || '',
  };
};

export async function ListDepartments({ search, status } = {}) {
  const where = [];
  const params = [];
  if (status) { where.push('dep.status = ?'); params.push(status); }
  if (search) {
    const like = escapeLike(search);
    where.push('(dep.name LIKE ? OR dep.specialty LIKE ? OR h.name LIKE ?)');
    params.push(like, like, like);
  }
  const [rows] = await db.execute(
    `${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY dep.name`,
    params,
  );
  return rows.map(shape);
}

async function GetDepartment(id, connection = db) {
  const [rows] = await connection.execute(`${SELECT} WHERE dep.id = ?`, [id]);
  return rows[0] ? shape(rows[0]) : null;
}

const COLUMNS = {
  name: 'name',
  specialty: 'specialty',
  headDoctorId: 'head_doctor_id',
  opensAt: 'opens_at',
  closesAt: 'closes_at',
  dailyCapacity: 'daily_capacity',
  status: 'status',
  notes: 'notes',
};

const values = (input) => {
  const out = {};
  for (const [key, column] of Object.entries(COLUMNS)) {
    if (input[key] === undefined) continue;
    out[column] = typeof input[key] === 'string' ? blankToNull(input[key].trim()) : input[key];
  }
  return out;
};

async function CheckHead(connection, headDoctorId) {
  if (!headDoctorId) return null;
  const [rows] = await connection.execute('SELECT 1 FROM doctors WHERE id = ? AND active = 1', [headDoctorId]);
  return rows.length ? null : fail(400, 'The department head must be an active doctor.');
}

const duplicate = (error) =>
  error.code === 'ER_DUP_ENTRY' ? fail(409, 'A department with that name already exists.') : null;

export async function CreateDepartment(actorId, input) {
  if (input.opensAt && input.closesAt && input.opensAt >= input.closesAt) {
    return fail(400, 'Closing time must be after opening time.');
  }
  try {
    return await inTransaction(async (connection) => {
      const problem = await CheckHead(connection, input.headDoctorId);
      if (problem) return problem;
      const v = values(input);
      const [result] = await connection.execute(
        `INSERT INTO departments (${Object.keys(v).join(', ')}) VALUES (${Object.keys(v).map(() => '?').join(', ')})`,
        Object.values(v),
      );
      await LogActivity(connection, actorId, {
        action: 'department.create', entityType: 'department', entityId: result.insertId,
        summary: `Added department ${v.name}`,
      });
      return ok({ department: await GetDepartment(result.insertId, connection) });
    });
  } catch (error) {
    const known = duplicate(error);
    if (known) return known;
    throw error;
  }
}

export async function UpdateDepartment(actorId, departmentId, input) {
  try {
    return await inTransaction(async (connection) => {
      const [rows] = await connection.execute(
        'SELECT name, opens_at AS opensAt, closes_at AS closesAt FROM departments WHERE id = ? FOR UPDATE',
        [departmentId],
      );
      if (rows.length === 0) return fail(404, 'Department not found.');
      const opens = input.opensAt ?? hhmm(rows[0].opensAt);
      const closes = input.closesAt ?? hhmm(rows[0].closesAt);
      if (opens >= closes) return fail(400, 'Closing time must be after opening time.');
      const problem = await CheckHead(connection, input.headDoctorId);
      if (problem) return problem;

      const v = values(input);
      if (Object.keys(v).length) {
        await connection.execute(
          `UPDATE departments SET ${Object.keys(v).map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
          [...Object.values(v), departmentId],
        );
      }
      await LogActivity(connection, actorId, {
        action: 'department.update', entityType: 'department', entityId: departmentId,
        summary: input.status ? `Department ${v.name || rows[0].name} set to ${input.status}` : `Updated department ${v.name || rows[0].name}`,
      });
      return ok({ department: await GetDepartment(departmentId, connection) });
    });
  } catch (error) {
    const known = duplicate(error);
    if (known) return known;
    throw error;
  }
}
