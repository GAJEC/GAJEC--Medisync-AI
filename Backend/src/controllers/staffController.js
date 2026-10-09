import db from '../util/database.js';

const STAFF_APPOINTMENT_SELECT = `
  SELECT a.id, a.reference AS ref, a.patient_id AS patientId,
         u.firstname, u.lastname, u.email, p.mobile,
         a.doctor_id AS doctorId, d.name AS doctor, d.specialty,
         a.reason, a.visit_type AS type, a.mode, a.scheduled_at AS scheduledAt,
         a.status, a.created_at AS createdAt
    FROM appointments a
    JOIN users u ON u.id = a.patient_id
    LEFT JOIN patient_profiles p ON p.user_id = u.id
    LEFT JOIN patient_consents c ON c.user_id = u.id
    LEFT JOIN doctors d ON d.id = a.doctor_id`;

const escapeLike = (value) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;

export async function GetDashboard() {
  const [rows] = await db.execute(
    `SELECT
       (SELECT COUNT(*) FROM appointments
         WHERE status = 'Scheduled' AND scheduled_at >= CURDATE() AND scheduled_at < CURDATE() + INTERVAL 1 DAY) AS scheduledToday,
       (SELECT COUNT(*) FROM appointments
         WHERE status = 'Scheduled' AND scheduled_at >= NOW()) AS upcomingAppointments,
       (SELECT COUNT(*) FROM users WHERE role = 'patient') AS totalPatients,
       (SELECT COUNT(*) FROM doctors WHERE active = 1) AS activeDoctors,
       (SELECT COUNT(*) FROM data_requests WHERE status IN ('Pending', 'In review')) AS openDataRequests`,
  );
  return Object.fromEntries(Object.entries(rows[0]).map(([key, value]) => [key, Number(value)]));
}

export async function ListPatients({ search, page = 1, pageSize = 25 } = {}) {
  const where = ["u.role = 'patient'", 'COALESCE(c.staff_review, 1) = 1'];
  const params = [];
  if (search) {
    const like = escapeLike(search);
    where.push("(u.firstname LIKE ? OR u.lastname LIKE ? OR u.email LIKE ?)");
    params.push(like, like, like);
  }

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total
       FROM users u
       LEFT JOIN patient_consents c ON c.user_id = u.id
      WHERE ${where.join(' AND ')}`,
    params,
  );
  const [patients] = await db.execute(
    `SELECT u.id, u.firstname, u.lastname, u.email, u.created_at AS registeredAt,
            p.mobile, COUNT(a.id) AS appointmentCount
       FROM users u
       LEFT JOIN patient_consents c ON c.user_id = u.id
       LEFT JOIN patient_profiles p ON p.user_id = u.id
       LEFT JOIN appointments a ON a.patient_id = u.id
      WHERE ${where.join(' AND ')}
      GROUP BY u.id, u.firstname, u.lastname, u.email, u.created_at, p.mobile
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize],
  );

  return { patients, total: Number(countRows[0].total), page, pageSize };
}

export async function GetPatient(patientId) {
  const [rows] = await db.execute(
    `SELECT u.id, u.firstname, u.lastname, u.email, u.created_at AS registeredAt,
            DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') AS dob,
            p.sex, p.mobile, p.address, p.allergies, p.medications,
            p.medical_history AS medicalHistory, p.emergency_name AS emergencyName,
            p.emergency_phone AS emergencyPhone, p.consult_type AS consultType,
            p.language, p.updated_at AS profileUpdatedAt
       FROM users u
       LEFT JOIN patient_profiles p ON p.user_id = u.id
       LEFT JOIN patient_consents c ON c.user_id = u.id
      WHERE u.id = ? AND u.role = 'patient' AND COALESCE(c.staff_review, 1) = 1`,
    [patientId],
  );
  return rows[0] || null;
}

export async function ListAppointments({ status, from, to, search, doctorId, order = 'soonest', page = 1, pageSize = 25 } = {}) {
  const where = ['COALESCE(c.staff_review, 1) = 1'];
  const params = [];
  if (status) {
    where.push('a.status = ?');
    params.push(status);
  }
  if (from) {
    where.push('a.scheduled_at >= ?');
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    where.push('a.scheduled_at < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(to);
  }
  if (doctorId !== undefined) {
    where.push('a.doctor_id = ?');
    params.push(doctorId);
  }
  if (search) {
    const like = escapeLike(search);
    where.push('(a.reference LIKE ? OR u.firstname LIKE ? OR u.lastname LIKE ? OR d.name LIKE ?)');
    params.push(like, like, like, like);
  }

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total
       FROM appointments a
       JOIN users u ON u.id = a.patient_id
       LEFT JOIN patient_consents c ON c.user_id = u.id
       LEFT JOIN doctors d ON d.id = a.doctor_id
      WHERE ${where.join(' AND ')}`,
    params,
  );
  const [appointments] = await db.execute(
    `${STAFF_APPOINTMENT_SELECT}
      WHERE ${where.join(' AND ')}
      ORDER BY a.scheduled_at ${order === 'latest' ? 'DESC' : 'ASC'}, a.id DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  return { appointments, total: Number(countRows[0].total), page, pageSize };
}

export async function UpdateAppointment(appointmentId, changes) {
  if (changes.scheduledAt !== undefined) {
    const when = new Date(changes.scheduledAt);
    if (Number.isNaN(when.getTime()) || when <= new Date()) {
      return { success: false, status: 400, message: 'Choose a date and time in the future.' };
    }
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT a.patient_id AS patientId, a.status
         FROM appointments a
         LEFT JOIN patient_consents c ON c.user_id = a.patient_id
        WHERE a.id = ? AND COALESCE(c.staff_review, 1) = 1
        FOR UPDATE`,
      [appointmentId],
    );
    if (rows.length === 0) {
      await connection.rollback();
      return { success: false, status: 404, message: 'Appointment not found.' };
    }
    if (rows[0].status !== 'Scheduled') {
      await connection.rollback();
      return { success: false, status: 409, message: 'Only scheduled appointments can be updated.' };
    }

    if (changes.doctorId !== undefined && changes.doctorId !== null) {
      const [doctors] = await connection.execute(
        'SELECT 1 FROM doctors WHERE id = ? AND active = 1',
        [changes.doctorId],
      );
      if (doctors.length === 0) {
        await connection.rollback();
        return { success: false, status: 400, message: 'That doctor is not available.' };
      }
    }

    const updates = [];
    const values = [];
    if (changes.doctorId !== undefined) {
      updates.push('doctor_id = ?');
      values.push(changes.doctorId);
    }
    if (changes.scheduledAt !== undefined) {
      updates.push('scheduled_at = ?');
      values.push(new Date(changes.scheduledAt));
    }
    if (changes.mode !== undefined) {
      updates.push('mode = ?');
      values.push(changes.mode);
    }
    if (changes.status !== undefined) {
      updates.push('status = ?');
      values.push(changes.status);
      if (changes.status === 'Cancelled') updates.push('cancelled_at = NOW()');
    }

    await connection.execute(
      `UPDATE appointments SET ${updates.join(', ')} WHERE id = ? AND status = 'Scheduled'`,
      [...values, appointmentId],
    );
    await connection.execute(
      `INSERT INTO notifications (user_id, category, type, title, body)
       VALUES (?, 'appointments', 'reminder', 'Appointment updated',
               'Your appointment details have changed. Please check your appointment list.')`,
      [rows[0].patientId],
    );
    const [updatedRows] = await connection.execute(
      `${STAFF_APPOINTMENT_SELECT}
        WHERE a.id = ? AND COALESCE(c.staff_review, 1) = 1`,
      [appointmentId],
    );
    await connection.commit();
    return { success: true, appointment: updatedRows[0] || null };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function ListDoctors() {
  const [rows] = await db.execute(
    'SELECT id, name, specialty FROM doctors WHERE active = 1 ORDER BY name, id',
  );
  return rows;
}
