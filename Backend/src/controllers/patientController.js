import db from '../util/database.js';
import { EmailSanitizer } from '../util/checker.js';
import {
    AppointmentReference,
    DataRequestReference,
    WithUniqueReference,
} from '../util/reference.js';

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

const PROFILE_FIELDS = {
    dob: 'date_of_birth',
    sex: 'sex',
    mobile: 'mobile',
    address: 'address',
    allergies: 'allergies',
    medications: 'medications',
    history: 'medical_history',
    emergencyName: 'emergency_name',
    emergencyPhone: 'emergency_phone',
    consultType: 'consult_type',
    language: 'language',
};

export async function GetProfile(userId) {
    const [rows] = await db.execute(
        `SELECT u.id, u.firstname, u.lastname, u.email, u.created_at,
                DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') AS dob,
                p.sex, p.mobile, p.address, p.allergies, p.medications,
                p.medical_history AS history, p.emergency_name AS emergencyName,
                p.emergency_phone AS emergencyPhone,
                COALESCE(p.consult_type, 'In-person') AS consultType,
                COALESCE(p.language, 'English') AS language
           FROM users u
           LEFT JOIN patient_profiles p ON p.user_id = u.id
          WHERE u.id = ?`,
        [userId],
    );
    return rows[0] || null;
}

// Empty strings are stored as NULL so "cleared" and "never set" look the same.
const blankToNull = (value) => (typeof value === 'string' && value.trim() === '' ? null : value);

export async function UpdateProfile(userId, changes) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const userUpdates = {};
        if (changes.firstname !== undefined) userUpdates.firstname = changes.firstname.trim();
        if (changes.lastname !== undefined) userUpdates.lastname = changes.lastname.trim();
        if (changes.email !== undefined) userUpdates.email = EmailSanitizer(changes.email);
        const userColumns = Object.keys(userUpdates);
        if (userColumns.length) {
            await connection.execute(
                `UPDATE users SET ${userColumns.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
                [...Object.values(userUpdates), userId],
            );
        }

        const entries = Object.entries(PROFILE_FIELDS).filter(([key]) => changes[key] !== undefined);
        if (entries.length) {
            const columns = entries.map(([, column]) => column);
            const values = entries.map(([key]) => blankToNull(changes[key]));
            await connection.execute(
                `INSERT INTO patient_profiles (user_id, ${columns.join(', ')})
                 VALUES (?, ${columns.map(() => '?').join(', ')})
                 ON DUPLICATE KEY UPDATE ${columns.map((c) => `${c} = VALUES(${c})`).join(', ')}`,
                [userId, ...values],
            );
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
    return GetProfile(userId);
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

const APPOINTMENT_SELECT = `
    SELECT a.id, a.reference AS ref, a.reason, a.visit_type AS type, a.mode,
           a.scheduled_at AS date, a.status, a.created_at AS createdAt,
           d.id AS doctorId, d.name AS doctor, d.specialty
      FROM appointments a
      LEFT JOIN doctors d ON d.id = a.doctor_id`;

export async function ListAppointments(userId, { status, from, to, search, order = 'newest' } = {}) {
    const where = ['a.patient_id = ?'];
    const params = [userId];

    if (status) { where.push('a.status = ?'); params.push(status); }
    if (from) { where.push('a.scheduled_at >= ?'); params.push(`${from} 00:00:00`); }
    if (to) { where.push('a.scheduled_at <= ?'); params.push(`${to} 23:59:59`); }
    if (search) {
        const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
        where.push('(a.reference LIKE ? OR a.reason LIKE ? OR d.name LIKE ? OR d.specialty LIKE ?)');
        params.push(like, like, like, like);
    }

    const [rows] = await db.execute(
        `${APPOINTMENT_SELECT}
          WHERE ${where.join(' AND ')}
          ORDER BY a.scheduled_at ${order === 'oldest' ? 'ASC' : 'DESC'}`,
        params,
    );
    return rows;
}

export async function GetAppointment(userId, appointmentId) {
    const [rows] = await db.execute(`${APPOINTMENT_SELECT} WHERE a.patient_id = ? AND a.id = ?`, [userId, appointmentId]);
    return rows[0] || null;
}

export async function CreateAppointment(userId, { doctorId, reason, type, mode, scheduledAt }) {
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime()) || when <= new Date()) {
        return { success: false, status: 400, message: 'Choose a date and time in the future.' };
    }

    if (doctorId) {
        const [doctors] = await db.execute('SELECT 1 FROM doctors WHERE id = ? AND active = 1', [doctorId]);
        if (doctors.length === 0) return { success: false, status: 400, message: 'That doctor is not available.' };
    }

    const insertId = await WithUniqueReference(AppointmentReference, async (reference) => {
        const [result] = await db.execute(
            `INSERT INTO appointments (reference, patient_id, doctor_id, reason, visit_type, mode, scheduled_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [reference, userId, doctorId || null, reason.trim(), type || 'consult', mode || 'In-person', when],
        );
        return result.insertId;
    });

    return { success: true, appointment: await GetAppointment(userId, insertId) };
}

export async function CancelAppointment(userId, appointmentId) {
    const appointment = await GetAppointment(userId, appointmentId);
    if (!appointment) return { success: false, status: 404, message: 'Appointment not found' };
    if (appointment.status !== 'Scheduled') {
        return { success: false, status: 409, message: `This appointment is already ${appointment.status.toLowerCase()}.` };
    }

    await db.execute(
        `UPDATE appointments SET status = 'Cancelled', cancelled_at = NOW()
          WHERE id = ? AND patient_id = ? AND status = 'Scheduled'`,
        [appointmentId, userId],
    );
    return { success: true, appointment: await GetAppointment(userId, appointmentId) };
}

export async function ListDoctors() {
    const [rows] = await db.execute('SELECT id, name, specialty FROM doctors WHERE active = 1 ORDER BY name');
    return rows;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function ListNotifications(userId) {
    const [rows] = await db.execute(
        `SELECT id, category, type, title, body, read_at IS NOT NULL AS \`read\`, created_at AS createdAt
           FROM notifications
          WHERE user_id = ?
          ORDER BY created_at DESC, id DESC
          LIMIT 200`,
        [userId],
    );
    return rows.map((row) => ({ ...row, read: Boolean(row.read) }));
}

export async function MarkNotificationRead(userId, notificationId) {
    const [result] = await db.execute(
        'UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = ? AND user_id = ?',
        [notificationId, userId],
    );
    return result.affectedRows > 0;
}

export async function MarkAllNotificationsRead(userId) {
    const [result] = await db.execute(
        'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
        [userId],
    );
    return result.affectedRows;
}

// For other modules (staff actions, reminders) to notify a patient.
// Never put sensitive health details in title/body; they appear in previews.
export async function CreateNotification(userId, { category, type, title, body }) {
    const [result] = await db.execute(
        'INSERT INTO notifications (user_id, category, type, title, body) VALUES (?, ?, ?, ?, ?)',
        [userId, category, type, title, body],
    );
    return result.insertId;
}

// ---------------------------------------------------------------------------
// Conversations (AI intake history)
// ---------------------------------------------------------------------------

export async function ListConversations(userId) {
    const [rows] = await db.execute(
        `SELECT id, title, created_at AS createdAt, updated_at AS updatedAt
           FROM conversations
          WHERE user_id = ?
          ORDER BY updated_at DESC, id DESC
          LIMIT 100`,
        [userId],
    );
    return rows;
}

export async function GetConversation(userId, conversationId) {
    const [rows] = await db.execute(
        'SELECT id, title, created_at AS createdAt, updated_at AS updatedAt FROM conversations WHERE id = ? AND user_id = ?',
        [conversationId, userId],
    );
    if (rows.length === 0) return null;
    const [messages] = await db.execute(
        `SELECT id, sender, body, created_at AS createdAt
           FROM conversation_messages
          WHERE conversation_id = ?
          ORDER BY id`,
        [conversationId],
    );
    return { ...rows[0], messages };
}

const titleFrom = (text) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > 60 ? `${clean.slice(0, 57)}...` : clean;
};

// Starts a conversation with the patient's first message.
export async function CreateConversation(userId, body) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.execute(
            'INSERT INTO conversations (user_id, title) VALUES (?, ?)',
            [userId, titleFrom(body)],
        );
        await connection.execute(
            "INSERT INTO conversation_messages (conversation_id, sender, body) VALUES (?, 'patient', ?)",
            [result.insertId, body.trim()],
        );
        await connection.commit();
        return GetConversation(userId, result.insertId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function AddConversationMessage(userId, conversationId, body) {
    const [owned] = await db.execute('SELECT 1 FROM conversations WHERE id = ? AND user_id = ?', [conversationId, userId]);
    if (owned.length === 0) return null;

    const [result] = await db.execute(
        "INSERT INTO conversation_messages (conversation_id, sender, body) VALUES (?, 'patient', ?)",
        [conversationId, body.trim()],
    );
    await db.execute('UPDATE conversations SET updated_at = NOW() WHERE id = ?', [conversationId]);
    const [rows] = await db.execute(
        'SELECT id, sender, body, created_at AS createdAt FROM conversation_messages WHERE id = ?',
        [result.insertId],
    );
    return rows[0];
}

export async function RenameConversation(userId, conversationId, title) {
    const [result] = await db.execute(
        'UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?',
        [title.trim(), conversationId, userId],
    );
    return result.affectedRows > 0;
}

export async function DeleteConversation(userId, conversationId) {
    const [result] = await db.execute('DELETE FROM conversations WHERE id = ? AND user_id = ?', [conversationId, userId]);
    return result.affectedRows > 0;
}

// ---------------------------------------------------------------------------
// Privacy: consents and data requests
// ---------------------------------------------------------------------------

const DEFAULT_CONSENTS = { routing: true, staff: true, history: false, reminders: true };

export async function GetConsents(userId) {
    const [rows] = await db.execute(
        `SELECT routing, staff_review AS staff, history_personalization AS history, reminders, updated_at AS updatedAt
           FROM patient_consents WHERE user_id = ?`,
        [userId],
    );
    if (rows.length === 0) return { ...DEFAULT_CONSENTS, updatedAt: null };
    const row = rows[0];
    return {
        routing: Boolean(row.routing),
        staff: Boolean(row.staff),
        history: Boolean(row.history),
        reminders: Boolean(row.reminders),
        updatedAt: row.updatedAt,
    };
}

// `routing` is required for the service and cannot be turned off.
export async function UpdateConsents(userId, { staff, history, reminders }) {
    await db.execute(
        `INSERT INTO patient_consents (user_id, routing, staff_review, history_personalization, reminders)
         VALUES (?, 1, ?, ?, ?)
         ON DUPLICATE KEY UPDATE routing = 1, staff_review = VALUES(staff_review),
           history_personalization = VALUES(history_personalization), reminders = VALUES(reminders)`,
        [userId, staff ? 1 : 0, history ? 1 : 0, reminders ? 1 : 0],
    );
    return GetConsents(userId);
}

export async function CreateDataRequest(userId, { type, note }) {
    return WithUniqueReference(DataRequestReference, async (reference) => {
        await db.execute(
            'INSERT INTO data_requests (reference, user_id, type, note) VALUES (?, ?, ?, ?)',
            [reference, userId, type, blankToNull(note ?? null)],
        );
        return { reference, type, status: 'Pending' };
    });
}

export async function ListDataRequests(userId) {
    const [rows] = await db.execute(
        `SELECT reference, type, status, created_at AS createdAt
           FROM data_requests WHERE user_id = ? ORDER BY created_at DESC`,
        [userId],
    );
    return rows;
}
