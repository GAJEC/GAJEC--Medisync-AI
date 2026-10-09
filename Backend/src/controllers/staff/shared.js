import db from '../../util/database.js';

// Result helpers so route handlers can map controller outcomes to HTTP codes.
export const ok = (data = {}) => ({ success: true, ...data });
export const fail = (status, message) => ({ success: false, status, message });

export const escapeLike = (value) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
export const blankToNull = (value) =>
  typeof value === 'string' && value.trim() === '' ? null : value ?? null;

// Display id for patient accounts, e.g. 12 -> "P-00012".
export const patientCode = (id) => `P-${String(id).padStart(5, '0')}`;
export const patientIdFromCode = (code) => {
  const match = /^P-?(\d+)$/i.exec(String(code).trim());
  return match ? Number(match[1]) : null;
};

// "YYYY-MM-DD" in local time.
export const isoDay = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// "08:00:00" -> "08:00"
export const hhmm = (time) => (time ? String(time).slice(0, 5) : null);

// Writes one audit entry. Never put sensitive health details in summary/notes.
export async function LogActivity(connection, actorId, { action, entityType, entityId = null, summary, notes = null }) {
  await (connection || db).execute(
    `INSERT INTO staff_activity_log (actor_id, action, entity_type, entity_id, summary, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [actorId ?? null, action, entityType, entityId, summary.slice(0, 255), blankToNull(notes)?.slice(0, 1000) ?? null],
  );
}

// Runs fn inside a transaction on a dedicated connection.
export async function inTransaction(fn) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    if (result && result.success === false) await connection.rollback();
    else await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Turns COUNT/SUM columns (returned as strings by mysql2) into numbers.
export const numeric = (row, keys) => {
  const out = { ...row };
  for (const key of keys) out[key] = Number(out[key] ?? 0);
  return out;
};
