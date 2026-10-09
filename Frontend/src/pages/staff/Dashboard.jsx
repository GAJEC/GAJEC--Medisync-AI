import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { staffApi } from "../../api/client";
import { formatDateTime, useStaffData } from "../../components/staff/useStaffData";

import scheduleIcon from "../../assets/icons/schedule.png";
import historyIcon from "../../assets/icons/history.png";
import stetIcon from "../../assets/icons/stet.png";
import nextIcon from "../../assets/icons/next.png";
import StaffStyle from "../../assets/styles/Staff.module.css";

const MIX = [
  { key: "confirmed", label: "Confirmed", color: "#0f766e" },
  { key: "pending", label: "Pending", color: "#4f8df0" },
  { key: "completed", label: "Completed", color: "#aab4b2" },
  { key: "cancelled", label: "Cancelled", color: "#d64545" },
];

const statusClass = (s) => `${StaffStyle["st-pill"]} ${StaffStyle["st-pill--" + s.toLowerCase().replace(/\s+/g, "-")] || ""}`;

const pctOf = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

function buildStats(s) {
  if (!s) s = {};
  const change = s.changeFromLastWeek;
  return [
    {
      label: "Appointments today", value: s.appointmentsToday ?? 0, tone: "teal", icon: scheduleIcon,
      note: change == null ? "No data for last week" : `${change >= 0 ? "↑" : "↓"} ${Math.abs(change)}% from last week`,
    },
    {
      label: "Pending requests", value: s.pendingRequests ?? 0, tone: "amber", icon: historyIcon,
      note: "Upcoming, no doctor assigned",
    },
    {
      label: "Confirmed", value: s.confirmed ?? 0, tone: "blue", glyph: "✓",
      note: `${s.confirmationRate ?? 0}% confirmation rate`,
    },
    {
      label: "Available doctors", value: s.availableDoctors ?? 0, tone: "violet", icon: stetIcon,
      note: `Across ${s.departments ?? 0} department${s.departments === 1 ? "" : "s"}`,
    },
    {
      label: "Cancelled", value: s.cancelled ?? 0, tone: "red", glyph: "✕",
      note: `${s.cancellationRate ?? 0}% of today's visits`,
    },
  ];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState(7);
  const { data, error, loading } = useStaffData((token) => staffApi.dashboard(token, { range }), [range]);

  const today = new Date();
  const stats = buildStats(data?.stats);
  const weekly = data?.weekly ?? [];
  const max = Math.max(1, ...weekly.map((w) => w.v));
  const mix = data?.mix ?? { total: 0 };
  const recent = data?.recent ?? [];

  let acc = 0;
  const donut = mix.total > 0
    ? MIX.map((m) => {
        const p = (mix[m.key] / mix.total) * 100;
        const stop = `${m.color} ${acc}% ${acc + p}%`;
        acc += p;
        return stop;
      }).join(", ")
    : "var(--border, #e3e8e7) 0% 100%";

  const goToAppointments = () => navigate("/staff/appointments");

  return (
    <div className={`${StaffStyle['st-page']} ${loading ? StaffStyle['st-loading'] : ""}`}>
      {/* ---------- Title ---------- */}
      <div className={StaffStyle['st-pagehead']}>
        <div>
          <p className={StaffStyle['st-eyebrow']}>
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
          <h1 className={StaffStyle['st-title']}>Hospital Operations Dashboard</h1>
          <p className={StaffStyle['st-sub']}>An overview of today's appointment activity.</p>
        </div>
        <div className={StaffStyle['st-actions']}>
          <button type="button" className={StaffStyle['st-btn']}>
            <img src={scheduleIcon} alt="" className={StaffStyle['st-btn__ico']} />
            {today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </button>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} onClick={goToAppointments}>
            Review requests <img src={nextIcon} alt="" className={`${StaffStyle['st-btn__ico']} ${StaffStyle['st-btn__ico--white']}`} />
          </button>
        </div>
      </div>

      {error && <p className={StaffStyle['st-alert']} role="alert">{error}</p>}

      {/* ---------- Stat cards ---------- */}
      <section className={StaffStyle['st-stats']}>
        {stats.map((s) => (
          <article className={`${StaffStyle['st-card']} ${StaffStyle['st-stat']}`} key={s.label}>
            <span className={`${StaffStyle['st-stat__icon']} ${StaffStyle[`st-tone--${s.tone}`]}`}>
              {s.icon ? <img src={s.icon} alt="" /> : s.glyph}
            </span>
            <div>
              <p className={StaffStyle['st-stat__label']}>{s.label}</p>
              <p className={StaffStyle['st-stat__value']}>{s.value}</p>
              <p className={StaffStyle['st-stat__note']}>{s.note}</p>
            </div>
          </article>
        ))}
      </section>

      {/* ---------- Charts ---------- */}
      <section className={StaffStyle['st-grid2']}>
        <article className={StaffStyle['st-card']}>
          <header className={StaffStyle['st-card__head']}>
            <div>
              <p className={StaffStyle['st-eyebrow']}>Appointment volume</p>
              <h2 className={StaffStyle['st-h2']}>{range === 7 ? "Weekly" : "Monthly"} activity</h2>
            </div>
            <select className={StaffStyle['st-select']} value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Date range">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </header>
          <div className={StaffStyle['st-bars']}>
            {weekly.map((w) => (
              <div className={StaffStyle['st-bar']} key={w.date} title={`${w.date}: ${w.v}`}>
                {range === 7 && <span className={StaffStyle['st-bar__val']}>{w.v}</span>}
                <span className={StaffStyle['st-bar__fill']} style={{ height: `${(w.v / max) * 100}%` }} />
                {(range === 7 || weekly.indexOf(w) % 5 === 0) && <span className={StaffStyle['st-bar__day']}>{w.day}</span>}
              </div>
            ))}
          </div>
        </article>

        <article className={StaffStyle['st-card']}>
          <header className={StaffStyle['st-card__head']}>
            <div>
              <p className={StaffStyle['st-eyebrow']}>Status mix</p>
              <h2 className={StaffStyle['st-h2']}>Today's appointments</h2>
            </div>
          </header>
          <div className={StaffStyle['st-donutwrap']}>
            <div className={StaffStyle['st-donut']} style={{ background: `conic-gradient(${donut})` }}>
              <div className={StaffStyle['st-donut__hole']}><strong>{mix.total}</strong><small>Total</small></div>
            </div>
            <ul className={StaffStyle['st-legend']}>
              {MIX.map((m) => (
                <li key={m.key}><i style={{ background: m.color }} />{m.label}<b>{pctOf(mix[m.key] ?? 0, mix.total)}%</b></li>
              ))}
            </ul>
          </div>
        </article>
      </section>

      {/* ---------- Appointment requests ---------- */}
      <article className={`${StaffStyle['st-card']} ${StaffStyle['st-table-card']}`}>
        <header className={StaffStyle['st-card__head']}>
          <div>
            <p className={StaffStyle['st-eyebrow']}>Recent activity</p>
            <h2 className={StaffStyle['st-h2']}>Appointment requests</h2>
          </div>
          <button type="button" className={StaffStyle['st-link']} onClick={goToAppointments}>
            View all <img src={nextIcon} alt="" className={StaffStyle['st-btn__ico']} />
          </button>
        </header>
        <div className={StaffStyle['st-tablewrap']}>
          <table className={StaffStyle['st-table']}>
            <thead>
              <tr>
                <th>Patient</th><th>Reference</th><th>Assigned doctor</th>
                <th>Specialty</th><th>Requested</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.patient}</strong><small>{r.patientCode}</small></td>
                  <td className={StaffStyle['st-ref']}>{r.ref}</td>
                  <td className={StaffStyle['st-muted']}>{r.doctor || "Unassigned"}</td>
                  <td className={StaffStyle['st-muted']}>{r.specialty || "—"}</td>
                  <td className={StaffStyle['st-muted']}>{formatDateTime(r.scheduledAt)}</td>
                  <td><span className={statusClass(r.displayStatus)}>{r.displayStatus}</span></td>
                </tr>
              ))}
              {!loading && recent.length === 0 && (
                <tr><td colSpan="6" className={StaffStyle['st-empty']}>No appointment requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
