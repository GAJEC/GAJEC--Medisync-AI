import { useEffect, useMemo, useState } from "react";

import searchIcon from "../../assets/icons/search.png";
import settingsIcon from "../../assets/icons/settings.png";
import "../../assets/styles/Staff.css";

const initialAppointments = [
  { id: 1, patient: "Sofia Reyes", pid: "P-8821", ref: "HL-250624-8821", doctor: "Dr. Maria Santos", specialty: "Internal Medicine", department: "Internal Medicine", when: "Jun 25 · 9:30 AM", source: "AI Intake", status: "Pending Review" },
  { id: 2, patient: "Luis Garcia", pid: "P-8819", ref: "HL-250624-8819", doctor: "Dr. Daniel Reyes", specialty: "Family Medicine", department: "Primary Care", when: "Jun 25 · 10:00 AM", source: "Patient Portal", status: "Confirmed" },
  { id: 3, patient: "Amelia Torres", pid: "P-8814", ref: "HL-250624-8814", doctor: "Dr. Angela Cruz", specialty: "Pediatrics", department: "Pediatrics", when: "Jun 25 · 10:30 AM", source: "Front Desk", status: "Checked In" },
  { id: 4, patient: "Noel Bautista", pid: "P-8807", ref: "HL-250624-8807", doctor: "Unassigned", specialty: "Neurology", department: "Neurology", when: "Jun 25 · 11:00 AM", source: "AI Intake", status: "Pending Review" },
  { id: 5, patient: "Clara Ramos", pid: "P-8798", ref: "HL-250624-8798", doctor: "Dr. Maria Santos", specialty: "Internal Medicine", department: "Internal Medicine", when: "Jun 25 · 1:30 PM", source: "Patient Portal", status: "Completed" },
];

const samplePatients = [
  { name: "Sofia Reyes", pid: "P-8821" }, { name: "Luis Garcia", pid: "P-8819" },
  { name: "Amelia Torres", pid: "P-8814" }, { name: "Noel Bautista", pid: "P-8807" },
  { name: "Clara Ramos", pid: "P-8798" },
];

const doctors = [
  { name: "Dr. Maria Santos", specialty: "Internal Medicine", department: "Internal Medicine" },
  { name: "Dr. Daniel Reyes", specialty: "Family Medicine", department: "Primary Care" },
  { name: "Dr. Angela Cruz", specialty: "Pediatrics", department: "Pediatrics" },
];

const times = ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const statusClass = (s) => "st-pill st-pill--" + s.toLowerCase().replace(/\s+/g, "-");
const unique = (key, list) => [...new Set(list.map((a) => a[key]))];

// "2025-06-25" + "9:30 AM"  ->  "Jun 25 · 9:30 AM"
const formatWhen = (iso, time) => {
  const [, m, d] = iso.split("-");
  return `${months[Number(m) - 1]} ${Number(d)} · ${time}`;
};

export default function Appointments() {
  const [rows, setRows] = useState(initialAppointments);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ status: "", doctor: "", specialty: "", department: "" });
  const [open, setOpen] = useState(false);

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!q || r.patient.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q)) &&
        (!filters.status || r.status === filters.status) &&
        (!filters.doctor || r.doctor === filters.doctor) &&
        (!filters.specialty || r.specialty === filters.specialty) &&
        (!filters.department || r.department === filters.department)
    );
  }, [rows, query, filters]);

  const handleCreate = (form) => {
    const doc = doctors.find((d) => d.name === form.doctor);
    const known = samplePatients.find((p) => p.name.toLowerCase() === form.patient.trim().toLowerCase());
    const number = 8830 + rows.length;
    setRows((prev) => [
      {
        id: Date.now(),
        patient: known ? known.name : form.patient.trim(),
        pid: known ? known.pid : `P-${number}`,
        ref: `HL-250624-${number}`,
        doctor: doc.name,
        specialty: doc.specialty,
        department: doc.department,
        when: formatWhen(form.date, form.time),
        source: "Front Desk",
        status: "Pending Review",
      },
      ...prev,
    ]);
    setOpen(false);
  };

  return (
    <div className="st-page">
      {/* ---------- Title ---------- */}
      <div className="st-pagehead">
        <div>
          <h1 className="st-title">Appointment Management</h1>
          <p className="st-sub">Review, assign, and coordinate hospital appointment requests.</p>
        </div>
        <div className="st-actions">
          <button type="button" className="st-btn st-btn--primary" onClick={() => setOpen(true)}>
            <span className="st-btn__plus" aria-hidden="true">+</span> New appointment
          </button>
        </div>
      </div>

      {/* ---------- Filters ---------- */}
      <div className="st-filters">
        <label className="st-searchbox">
          <img src={searchIcon} alt="" className="st-btn__ico" />
          <input
            type="search"
            placeholder="Search patient or reference"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <select className="st-select" value={filters.status} onChange={setFilter("status")} aria-label="Filter by status">
          <option value="">All statuses</option>
          {unique("status", initialAppointments).map((v) => <option key={v}>{v}</option>)}
        </select>
        <select className="st-select" value={filters.doctor} onChange={setFilter("doctor")} aria-label="Filter by doctor">
          <option value="">All doctors</option>
          {doctors.map((d) => <option key={d.name}>{d.name}</option>)}
        </select>
        <select className="st-select" value={filters.specialty} onChange={setFilter("specialty")} aria-label="Filter by specialty">
          <option value="">All specialties</option>
          {unique("specialty", initialAppointments).map((v) => <option key={v}>{v}</option>)}
        </select>
        <select className="st-select" value={filters.department} onChange={setFilter("department")} aria-label="Filter by department">
          <option value="">All departments</option>
          {unique("department", initialAppointments).map((v) => <option key={v}>{v}</option>)}
        </select>

        <button type="button" className="st-btn">More filters</button>
      </div>

      {/* ---------- Table ---------- */}
      <article className="st-card st-table-card">
        <header className="st-toolbar">
          <p className="st-count">{visible.length} appointment{visible.length === 1 ? "" : "s"}</p>
          <div className="st-toolbar__actions">
            <button type="button" className="st-link"><span aria-hidden="true">↓</span> Export</button>
            <button type="button" className="st-link">
              <img src={settingsIcon} alt="" className="st-btn__ico" /> Columns
            </button>
          </div>
        </header>

        <div className="st-tablewrap">
          <table className="st-table">
            <thead>
              <tr>
                <th>Patient</th><th>Reference</th><th>Doctor</th><th>Specialty</th>
                <th>Date &amp; time</th><th>Source</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.patient}</strong><small>{r.pid}</small></td>
                  <td className="st-ref">{r.ref}</td>
                  <td className="st-muted">{r.doctor}</td>
                  <td className="st-muted">{r.specialty}</td>
                  <td className="st-muted">{r.when}</td>
                  <td className="st-muted">{r.source}</td>
                  <td><span className={statusClass(r.status)}>{r.status}</span></td>
                  <td><button type="button" className="st-more" aria-label="More actions">···</button></td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan="8" className="st-empty">No appointments match these filters. Clear a filter or change your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {open && <NewAppointmentModal onClose={() => setOpen(false)} onCreate={handleCreate} />}
    </div>
  );
}

/* ---------- Pop-up ---------- */
function NewAppointmentModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ patient: "", doctor: doctors[0].name, date: "2025-06-25", time: "9:30 AM" });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Close with the Escape key
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSubmit = form.patient.trim() && form.date;

  return (
    <div className="st-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="st-modal" role="dialog" aria-modal="true" aria-labelledby="new-appt-title">
        <header className="st-modal__head">
          <div>
            <p className="st-modal__brand">HealthLocal AI</p>
            <h2 id="new-appt-title" className="st-modal__title">New appointment</h2>
          </div>
          <button type="button" className="st-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="st-modal__body">
          <label className="st-field">
            <span>Patient</span>
            <input list="st-patients" placeholder="Search sample patient" value={form.patient} onChange={set("patient")} autoFocus />
            <datalist id="st-patients">
              {samplePatients.map((p) => <option key={p.pid} value={p.name} />)}
            </datalist>
          </label>

          <label className="st-field">
            <span>Assigned doctor</span>
            <select value={form.doctor} onChange={set("doctor")}>
              {doctors.map((d) => <option key={d.name}>{d.name}</option>)}
            </select>
          </label>

          <label className="st-field">
            <span>Date</span>
            <input type="date" value={form.date} onChange={set("date")} />
          </label>

          <label className="st-field">
            <span>Time</span>
            <select value={form.time} onChange={set("time")}>
              {times.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
        </div>

        <footer className="st-modal__foot">
          <button type="button" className="st-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="st-btn st-btn--primary" disabled={!canSubmit} onClick={() => onCreate(form)}>
            Create request
          </button>
        </footer>
      </div>
    </div>
  );
}