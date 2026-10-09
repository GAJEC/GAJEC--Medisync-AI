import db from '../../util/database.js';
import { EmailSanitizer, hashPassword } from '../../util/checker.js';
import {
  blankToNull, escapeLike, fail, inTransaction, LogActivity, ok, patientCode, patientIdFromCode,
} from './shared.js';

const CONSENT = 'COALESCE(c.staff_review, 1) = 1';

// Mask a phone number for list views: "+63 917 123 0142" -> "+63 917 ••• 0142".
const maskPhone = (phone) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  return `${phone.slice(0, Math.max(0, phone.length - 8)).trim()} ••• ${digits.slice(-4)}`.trim();
};

const LIST_SELECT = `
  SELECT u.id, u.firstname, u.lastname, u.email, u.account_status AS status, u.created_at AS registeredAt,
         p.mobile,
         (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = u.id) AS appointments,
         (SELECT MAX(a.scheduled_at) FROM appointments a
           WHERE a.patient_id = u.id AND a.status = 'Completed') AS lastVisit,
         (SELECT l.notes FROM staff_activity_log l
           WHERE l.entity_type = 'patient' AND l.entity_id = u.id AND l.notes IS NOT NULL
           ORDER BY l.id DESC LIMIT 1) AS notes
    FROM users u
    LEFT JOIN patient_profiles p ON p.user_id = u.id
    LEFT JOIN patient_consents c ON c.user_id = u.id`;

const shapeListRow = ({ firstname, lastname, mobile, ...row }) => ({
  ...row,
  code: patientCode(row.id),
  name: `${firstname} ${lastname}`.trim(),
  contact: maskPhone(mobile) || row.email,
  appointments: Number(row.appointments),
  notes: row.notes || '',
});

export async function ListPatients({ search, status, page = 1, pageSize = 50 } = {}) {
  const where = ["u.role = 'patient'", CONSENT];
  const params = [];
  if (status) { where.push('u.account_status = ?'); params.push(status); }
  if (search) {
    const like = escapeLike(search);
    const byCode = patientIdFromCode(search);
    where.push(`(u.firstname LIKE ? OR u.lastname LIKE ? OR CONCAT(u.firstname, ' ', u.lastname) LIKE ?
                 OR u.email LIKE ? OR u.id = ?)`);
    params.push(like, like, like, like, byCode ?? 0);
  }

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total FROM users u LEFT JOIN patient_consents c ON c.user_id = u.id
      WHERE ${where.join(' AND ')}`,
    params,
  );
  const [rows] = await db.execute(
    `${LIST_SELECT} WHERE ${where.join(' AND ')}
      ORDER BY u.created_at DESC, u.id DESC LIMIT ? OFFSET ?`,
    [...params, String(pageSize), String((page - 1) * pageSize)],
  );
  return { patients: rows.map(shapeListRow), total: Number(countRows[0].total), page, pageSize };
}

async function GetPatientRow(patientId, connection = db) {
  const [rows] = await connection.execute(
    `${LIST_SELECT} WHERE u.id = ? AND u.role = 'patient' AND ${CONSENT}`,
    [patientId],
  );
  return rows[0] ? shapeListRow(rows[0]) : null;
}

// Full profile for staff with the staff-review consent.
export async function GetPatient(patientId) {
  const [rows] = await db.execute(
    `SELECT u.id, u.firstname, u.lastname, u.email, u.account_status AS status, u.created_at AS registeredAt,
            DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') AS dob,
            p.sex, p.mobile, p.address, p.allergies, p.medications,
            p.medical_history AS medicalHistory, p.emergency_name AS emergencyName,
            p.emergency_phone AS emergencyPhone, p.consult_type AS consultType,
            p.language, p.updated_at AS profileUpdatedAt
       FROM users u
       LEFT JOIN patient_profiles p ON p.user_id = u.id
       LEFT JOIN patient_consents c ON c.user_id = u.id
      WHERE u.id = ? AND u.role = 'patient' AND ${CONSENT}`,
    [patientId],
  );
  return rows[0] ? { ...rows[0], code: patientCode(rows[0].id) } : null;
}

// Front-desk registration. Staff set a temporary password that the patient changes after signing in;
// email is required because it is the sign-in identifier.
export async function CreatePatient(actorId, { firstname, lastname, email, mobile, password: temporaryPassword, status, notes }) {
  try {
    return await inTransaction(async (connection) => {
      const password = await hashPassword(temporaryPassword);
      const [result] = await connection.execute(
        `INSERT INTO users (firstname, lastname, email, role, password, account_status)
         VALUES (?, ?, ?, 'patient', ?, ?)`,
        [firstname.trim(), lastname.trim(), EmailSanitizer(email), password, status || 'Active'],
      );
      const id = result.insertId;
      await connection.execute(
        'INSERT INTO patient_profiles (user_id, mobile) VALUES (?, ?)',
        [id, blankToNull(mobile?.trim() ?? null)],
      );
      await connection.execute('INSERT INTO patient_consents (user_id) VALUES (?)', [id]);
      await LogActivity(connection, actorId, {
        action: 'patient.create', entityType: 'patient', entityId: id,
        summary: `Registered patient ${patientCode(id)}`, notes,
      });
      return ok({ patient: await GetPatientRow(id, connection) });
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return fail(409, 'An account with that email already exists.');
    throw error;
  }
}

export async function UpdatePatient(actorId, patientId, { status, notes }) {
  return inTransaction(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT u.account_status AS status FROM users u
         LEFT JOIN patient_consents c ON c.user_id = u.id
        WHERE u.id = ? AND u.role = 'patient' AND ${CONSENT} FOR UPDATE`,
      [patientId],
    );
    if (rows.length === 0) return fail(404, 'Patient not found.');

    if (status && status !== rows[0].status) {
      await connection.execute('UPDATE users SET account_status = ? WHERE id = ?', [status, patientId]);
      // An inactive account is signed out everywhere.
      if (status === 'Inactive') {
        await connection.execute(
          'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
          [patientId],
        );
      }
    }
    await LogActivity(connection, actorId, {
      action: 'patient.update', entityType: 'patient', entityId: patientId,
      summary: status && status !== rows[0].status
        ? `Patient ${patientCode(patientId)} set to ${status}`
        : `Patient ${patientCode(patientId)} note added`,
      notes,
    });
    return ok({ patient: await GetPatientRow(patientId, connection) });
  });
}

// Lightweight list for pickers (e.g. booking an appointment).
export async function SearchPatientOptions(search) {
  const where = ["u.role = 'patient'", "u.account_status = 'Active'", CONSENT];
  const params = [];
  if (search) {
    const like = escapeLike(search);
    where.push(`(CONCAT(u.firstname, ' ', u.lastname) LIKE ? OR u.email LIKE ? OR u.id = ?)`);
    params.push(like, like, patientIdFromCode(search) ?? 0);
  }
  const [rows] = await db.execute(
    `SELECT u.id, u.firstname, u.lastname, u.email
       FROM users u LEFT JOIN patient_consents c ON c.user_id = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY u.firstname, u.lastname LIMIT 20`,
    params,
  );
  return rows.map((r) => ({ id: r.id, code: patientCode(r.id), name: `${r.firstname} ${r.lastname}`.trim(), email: r.email }));
}
