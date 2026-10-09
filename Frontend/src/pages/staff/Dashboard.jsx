import { useNavigate } from "react-router-dom";

import scheduleIcon from "../../assets/icons/schedule.png";
import historyIcon from "../../assets/icons/history.png";
import stetIcon from "../../assets/icons/stet.png";
import nextIcon from "../../assets/icons/next.png";
import StaffStyle from "../../assets/styles/Staff.module.css";

const stats = [
  { label: "Appointments today", value: 128, note: "↑ 12% from last Tuesday", tone: "teal", icon: scheduleIcon },
  { label: "Pending requests", value: 18, note: "8 need review soon", tone: "amber", icon: historyIcon },
  { label: "Confirmed", value: 96, note: "75% confirmation rate", tone: "blue", glyph: "✓" },
  { label: "Available doctors", value: 24, note: "Across 8 departments", tone: "violet", icon: stetIcon },
  { label: "Cancelled", value: 6, note: "4.7% of today's visits", tone: "red", glyph: "✕" },
];

// Tue is "today" (128 appointments), so the chart now matches the stat card
const weekly = [
  { day: "Wed", v: 82 }, { day: "Thu", v: 104 }, { day: "Fri", v: 91 },
  { day: "Sat", v: 118 }, { day: "Sun", v: 110 }, { day: "Mon", v: 142 }, { day: "Tue", v: 128 },
];

const mix = [
  { label: "Confirmed", pct: 75, color: "#0f766e" },
  { label: "Pending", pct: 14, color: "#4f8df0" },
  { label: "Completed", pct: 6, color: "#aab4b2" },
  { label: "Cancelled", pct: 5, color: "#d64545" },
];

const requests = [
  { patient: "Sofia Reyes", pid: "P-8821", ref: "HL-250624-8821", doctor: "Dr. Maria Santos", specialty: "Internal Medicine", when: "Jun 25 · 9:30 AM", status: "Pending Review" },
  { patient: "Luis Garcia", pid: "P-8819", ref: "HL-250624-8819", doctor: "Dr. Daniel Reyes", specialty: "Family Medicine", when: "Jun 25 · 10:00 AM", status: "Confirmed" },
  { patient: "Amelia Torres", pid: "P-8814", ref: "HL-250624-8814", doctor: "Dr. Angela Cruz", specialty: "Pediatrics", when: "Jun 25 · 10:30 AM", status: "Checked In" },
  { patient: "Noel Bautista", pid: "P-8807", ref: "HL-250624-8807", doctor: "Unassigned", specialty: "Neurology", when: "Jun 25 · 11:00 AM", status: "Pending Review" },
];

const statusClass = (s) => `${StaffStyle["st-pill"]} ${StaffStyle["st-pill--" + s.toLowerCase().replace(/\s+/g, "-")]}`;

// conic-gradient stops for the donut
const donut = (() => {
  let acc = 0;
  return mix.map((m) => { const s = `${m.color} ${acc}% ${acc + m.pct}%`; acc += m.pct; return s; }).join(", ");
})();

export default function Dashboard() {
  const navigate = useNavigate();
  const max = Math.max(...weekly.map((w) => w.v));
  const goToAppointments = () => navigate("/staff/appointments");

  return (
    <div className={StaffStyle['st-page']}>
      {/* ---------- Title ---------- */}
      <div className={StaffStyle['st-pagehead']}>
        <div>
          <p className={StaffStyle['st-eyebrow']}>Tuesday, June 24, 2025</p>
          <h1 className={StaffStyle['st-title']}>Hospital Operations Dashboard</h1>
          <p className={StaffStyle['st-sub']}>A live prototype view of today's appointment activity.</p>
        </div>
        <div className={StaffStyle['st-actions']}>
          <button type="button" className={StaffStyle['st-btn']}>
            <img src={scheduleIcon} alt="" className={StaffStyle['st-btn__ico']} /> Jun 24, 2025
          </button>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} onClick={goToAppointments}>
            Review requests <img src={nextIcon} alt="" className={`${StaffStyle['st-btn__ico']} ${StaffStyle['st-btn__ico--white']}`} />
          </button>
        </div>
      </div>

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
              <h2 className={StaffStyle['st-h2']}>Weekly activity</h2>
            </div>
            <select className={StaffStyle['st-select']} defaultValue="7" aria-label="Date range">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </header>
          <div className={StaffStyle['st-bars']}>
            {weekly.map((w) => (
              <div className={StaffStyle['st-bar']} key={w.day}>
                <span className={StaffStyle['st-bar__val']}>{w.v}</span>
                <span className={StaffStyle['st-bar__fill']} style={{ height: `${(w.v / max) * 100}%` }} />
                <span className={StaffStyle['st-bar__day']}>{w.day}</span>
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
            <button type="button" className={StaffStyle['st-more']} aria-label="More options">···</button>
          </header>
          <div className={StaffStyle['st-donutwrap']}>
            <div className={StaffStyle['st-donut']} style={{ background: `conic-gradient(${donut})` }}>
              <div className={StaffStyle['st-donut__hole']}><strong>128</strong><small>Total</small></div>
            </div>
            <ul className={StaffStyle['st-legend']}>
              {mix.map((m) => (
                <li key={m.label}><i style={{ background: m.color }} />{m.label}<b>{m.pct}%</b></li>
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
                <th>Specialty</th><th>Requested</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.ref}>
                  <td><strong>{r.patient}</strong><small>{r.pid}</small></td>
                  <td className={StaffStyle['st-ref']}>{r.ref}</td>
                  <td className={StaffStyle['st-muted']}>{r.doctor}</td>
                  <td className={StaffStyle['st-muted']}>{r.specialty}</td>
                  <td className={StaffStyle['st-muted']}>{r.when}</td>
                  <td><span className={statusClass(r.status)}>{r.status}</span></td>
                  <td><button type="button" className={StaffStyle['st-more']} aria-label="More actions">···</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}