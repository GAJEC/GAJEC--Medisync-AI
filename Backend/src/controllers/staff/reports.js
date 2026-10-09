import db from '../../util/database.js';
import { DISPLAY_STATUS, shapeAppointment } from './appointments.js';
import { isoDay } from './shared.js';

const CONSENT = 'COALESCE(c.staff_review, 1) = 1';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

// `date` is "YYYY-MM-DD"; defaults to today.
export async function GetDashboard({ date, range = 7 } = {}) {
  const day = date || isoDay(new Date());

  const [[today]] = await db.execute(
    `SELECT COUNT(*) AS total,
            SUM(a.status = 'Scheduled' AND a.doctor_id IS NULL) AS pending,
            SUM(a.status = 'Scheduled' AND a.doctor_id IS NOT NULL) AS confirmed,
            SUM(a.status = 'Completed') AS completed,
            SUM(a.status = 'Cancelled') AS cancelled
       FROM appointments a
      WHERE a.scheduled_at >= ? AND a.scheduled_at < DATE_ADD(?, INTERVAL 1 DAY)`,
    [`${day} 00:00:00`, day],
  );
  const counts = Object.fromEntries(Object.entries(today).map(([k, v]) => [k, Number(v || 0)]));

  const [[sameDayLastWeek]] = await db.execute(
    `SELECT COUNT(*) AS total FROM appointments
      WHERE scheduled_at >= DATE_SUB(?, INTERVAL 7 DAY) AND scheduled_at < DATE_SUB(?, INTERVAL 6 DAY)`,
    [`${day} 00:00:00`, day],
  );
  const [[openRequests]] = await db.execute(
    "SELECT COUNT(*) AS total FROM appointments WHERE status = 'Scheduled' AND doctor_id IS NULL AND scheduled_at >= NOW()",
  );
  const [[doctorStats]] = await db.execute(
    `SELECT COUNT(*) AS available, COUNT(DISTINCT d.department_id) AS departments
       FROM doctors d
      WHERE d.active = 1
        AND NOT EXISTS (SELECT 1 FROM doctor_schedule_exceptions x WHERE x.doctor_id = d.id AND x.day = ?)`,
    [day],
  );

  const [weeklyRows] = await db.execute(
    `SELECT DATE_FORMAT(scheduled_at, '%Y-%m-%d') AS day, COUNT(*) AS total
       FROM appointments
      WHERE scheduled_at >= DATE_SUB(?, INTERVAL ? DAY) AND scheduled_at < DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY DATE_FORMAT(scheduled_at, '%Y-%m-%d')`,
    [`${day} 00:00:00`, range - 1, day],
  );
  const base = new Date(`${day}T00:00:00`);
  const weekly = Array.from({ length: range }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() - (range - 1 - i));
    const key = isoDay(d);
    return {
      date: key,
      day: range <= 7 ? DAY_NAMES[d.getDay()] : `${d.getMonth() + 1}/${d.getDate()}`,
      v: Number(weeklyRows.find((r) => r.day === key)?.total || 0),
    };
  });

  const [recent] = await db.execute(
    `SELECT a.id, a.reference AS ref, a.patient_id AS patientId, u.firstname, u.lastname,
            d.name AS doctor, d.specialty, a.scheduled_at AS scheduledAt, a.status,
            ${DISPLAY_STATUS} AS displayStatus, a.source
       FROM appointments a
       JOIN users u ON u.id = a.patient_id
       LEFT JOIN patient_consents c ON c.user_id = u.id
       LEFT JOIN doctors d ON d.id = a.doctor_id
      WHERE ${CONSENT}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 5`,
  );

  const lastWeek = Number(sameDayLastWeek.total);
  return {
    date: day,
    stats: {
      appointmentsToday: counts.total,
      changeFromLastWeek: lastWeek > 0 ? pct(counts.total - lastWeek, lastWeek) : null,
      pendingRequests: Number(openRequests.total),
      pendingToday: counts.pending,
      confirmed: counts.confirmed,
      confirmationRate: pct(counts.confirmed, counts.total),
      availableDoctors: Number(doctorStats.available),
      departments: Number(doctorStats.departments),
      cancelled: counts.cancelled,
      cancellationRate: pct(counts.cancelled, counts.total),
    },
    mix: {
      total: counts.total,
      confirmed: counts.confirmed,
      pending: counts.pending,
      completed: counts.completed,
      cancelled: counts.cancelled,
    },
    weekly,
    recent: recent.map(shapeAppointment),
  };
}

// Monthly operational report: current month vs previous month.
// month = "YYYY-MM", defaults to the current month (month-to-date).
export async function GetReport({ month } = {}) {
  const now = new Date();
  const [year, mon] = month ? month.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const start = new Date(year, mon - 1, 1);
  const nextStart = new Date(year, mon, 1);
  const prevStart = new Date(year, mon - 2, 1);
  const isCurrent = year === now.getFullYear() && mon === now.getMonth() + 1;
  const end = isCurrent ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) : nextStart;

  const periodStats = async (from, to) => {
    const [[row]] = await db.execute(
      `SELECT COUNT(*) AS total,
              SUM(status = 'Completed') AS completed,
              SUM(status = 'Cancelled') AS cancelled,
              SUM(status = 'Scheduled' AND scheduled_at < NOW()) AS noShow,
              -- Response time: from booking to the first staff action on the appointment.
              AVG(TIMESTAMPDIFF(MINUTE, a.created_at,
                  (SELECT MIN(l.created_at) FROM staff_activity_log l
                    WHERE l.entity_type = 'appointment' AND l.entity_id = a.id))) AS avgConfirm
         FROM appointments a
        WHERE a.scheduled_at >= ? AND a.scheduled_at < ?`,
      [from, to],
    );
    const total = Number(row.total || 0);
    const completed = Number(row.completed || 0);
    const cancelled = Number(row.cancelled || 0);
    const noShow = Number(row.noShow || 0);
    // Rates are measured against appointments that are already in the past or decided.
    const decided = completed + cancelled + noShow;
    return {
      total,
      completionRate: pct(completed, decided),
      cancellationRate: pct(cancelled, total),
      noShowRate: pct(noShow, decided),
      avgConfirmMinutes: row.avgConfirm == null ? null : Math.round(Number(row.avgConfirm)),
    };
  };

  // Previous period: same number of days into the previous month, for a fair month-to-date comparison.
  const prevEnd = isCurrent
    ? new Date(prevStart.getFullYear(), prevStart.getMonth(), Math.min(now.getDate() + 1, new Date(year, mon - 1, 0).getDate() + 1))
    : start;
  const current = await periodStats(start, end);
  const previous = await periodStats(prevStart, prevEnd);

  const fmtPct = (v) => `${v.toFixed(1)}%`;
  const delta = (a, b, unit = '%') => {
    const d = Math.round((a - b) * 10) / 10;
    return `${d > 0 ? '+' : ''}${d.toFixed(1)}${unit}`;
  };
  const volumeChange = previous.total > 0 ? delta(pct(current.total - previous.total, previous.total), 0) : '—';

  const metrics = [
    {
      metric: 'Appointment volume',
      thisMonth: current.total.toLocaleString('en-US'),
      lastMonth: previous.total.toLocaleString('en-US'),
      change: volumeChange,
      status: previous.total === 0 ? 'No baseline' : current.total >= previous.total ? 'On track' : 'Review',
    },
    {
      metric: 'Completion rate',
      thisMonth: fmtPct(current.completionRate),
      lastMonth: fmtPct(previous.completionRate),
      change: delta(current.completionRate, previous.completionRate),
      target: '90%',
      status: current.completionRate >= 90 ? 'On track' : current.completionRate >= 85 ? 'Near target' : 'Review',
    },
    {
      metric: 'Cancellation rate',
      thisMonth: fmtPct(current.cancellationRate),
      lastMonth: fmtPct(previous.cancellationRate),
      change: delta(current.cancellationRate, previous.cancellationRate),
      target: '< 6%',
      status: current.cancellationRate < 6 ? 'On track' : current.cancellationRate < 8 ? 'Near target' : 'Review',
    },
    {
      metric: 'No-show rate',
      thisMonth: fmtPct(current.noShowRate),
      lastMonth: fmtPct(previous.noShowRate),
      change: delta(current.noShowRate, previous.noShowRate),
      target: '< 4%',
      status: current.noShowRate < 4 ? 'On track' : current.noShowRate < 5 ? 'Near target' : 'Review',
    },
  ].map((m) => ({ target: '—', notes: '', ...m }));

  const periodEnd = new Date(end);
  periodEnd.setDate(periodEnd.getDate() - 1);
  return {
    month: `${year}-${String(mon).padStart(2, '0')}`,
    from: isoDay(start),
    to: isoDay(periodEnd),
    stats: {
      completionRate: current.completionRate,
      completionChange: Math.round((current.completionRate - previous.completionRate) * 10) / 10,
      avgConfirmMinutes: current.avgConfirmMinutes,
      avgConfirmChange:
        current.avgConfirmMinutes != null && previous.avgConfirmMinutes != null
          ? current.avgConfirmMinutes - previous.avgConfirmMinutes
          : null,
      noShowRate: current.noShowRate,
      noShowChange: Math.round((current.noShowRate - previous.noShowRate) * 10) / 10,
    },
    metrics,
  };
}

// Recent staff activity (audit log). details are not health information.
export async function ListActivity({ entityType, entityId, limit = 50 } = {}) {
  const where = [];
  const params = [];
  if (entityType) { where.push('l.entity_type = ?'); params.push(entityType); }
  if (entityId) { where.push('l.entity_id = ?'); params.push(entityId); }
  const [rows] = await db.execute(
    `SELECT l.id, l.action, l.entity_type AS entityType, l.entity_id AS entityId, l.summary, l.notes,
            l.created_at AS createdAt, CONCAT(u.firstname, ' ', u.lastname) AS actor
       FROM staff_activity_log l
       LEFT JOIN users u ON u.id = l.actor_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY l.id DESC LIMIT ?`,
    [...params, String(limit)],
  );
  return rows;
}
