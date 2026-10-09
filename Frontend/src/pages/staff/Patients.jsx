import { useEffect, useMemo, useState } from "react";
import "./Staff.css";
import searchIcon from "../../assets/icons/search.png";
import settingsIcon from "../../assets/icons/settings.png";

const initialPatients = [
  { id: "P-20481", name: "Sofia Reyes", contact: "+63 917 ••• 0142", registered: "Jun 12, 2024", appointments: 4, lastVisit: "Mar 18, 2025", status: "Active", notes: "" },
  { id: "P-20479", name: "Luis Garcia", contact: "+63 905 ••• 2241", registered: "May 4, 2024", appointments: 2, lastVisit: "Jun 20, 2025", status: "Active", notes: "" },
  { id: "P-20472", name: "Amelia Torres", contact: "+63 998 ••• 1088", registered: "Apr 28, 2024", appointments: 6, lastVisit: "Jun 24, 2025", status: "Active", notes: "" },
];

const statuses = ["Active", "Inactive"];
const statusClass = (s) => "st-pill st-pill--" + s.toLowerCase();

export default function Patients() {
  const [rows, setRows] = useState(initialPatients);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState(null); // null | { mode: "edit", id } | { mode: "add" }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)) &&
        (!statusFilter || r.status === statusFilter)
    );
  }, [rows, query, statusFilter]);

  const handleSave = ({ id, status, notes }) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status, notes } : r)));
    setModal(null);
  };

  const handleAdd = ({ name, contact, status, notes }) => {
    const next = Math.max(...rows.map((r) => Number(r.id.split("-")[1]))) + 1;
    setRows((prev) => [
      { id: `P-${next}`, name: name.trim(), contact: contact.trim() || "—", registered: "Jun 24, 2025", appointments: 0, lastVisit: "—", status, notes },
      ...prev,
    ]);
    setModal(null);
  };

  return (
    <div className="st-page">
      {/* ---------- Title ---------- */}
      <div className="st-pagehead">
        <div>
          <h1 className="st-title">Patient Directory</h1>
          <p className="st-sub">View account and appointment information according to staff permissions.</p>
        </div>
        <div className="st-actions">
          <button type="button" className="st-btn" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <img src={settingsIcon} alt="" className="st-btn__ico" /> Filters
          </button>
          <button type="button" className="st-btn st-btn--primary" onClick={() => setModal({ mode: "add" })}>
            <span className="st-btn__plus" aria-hidden="true">+</span> Add patient
          </button>
        </div>
      </div>

      {/* ---------- Table card ---------- */}
      <article className="st-card st-table-card">
        <header className="st-toolbar st-toolbar--top">
          <label className="st-searchbox st-searchbox--sm">
            <img src={searchIcon} alt="" className="st-btn__ico" />
            <input type="search" placeholder="Search patients…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {showFilters && (
            <select className="st-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          <p className="st-count st-count--right">{visible.length} sample record{visible.length === 1 ? "" : "s"}</p>
        </header>

        <div className="st-tablewrap">
          <table className="st-table st-table--compact">
            <thead>
              <tr>
                <th>Patient</th><th>Patient ID</th><th>Contact</th><th>Registered</th>
                <th>Appointments</th><th>Last visit</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="st-row--click" tabIndex={0}
                    onClick={() => setModal({ mode: "edit", id: r.id })}
                    onKeyDown={(e) => e.key === "Enter" && setModal({ mode: "edit", id: r.id })}>
                  <td className="st-ref">{r.name}</td>
                  <td className="st-muted">{r.id}</td>
                  <td className="st-muted">{r.contact}</td>
                  <td className="st-muted">{r.registered}</td>
                  <td className="st-muted">{r.appointments}</td>
                  <td className="st-muted">{r.lastVisit}</td>
                  <td><span className={statusClass(r.status)}>{r.status}</span></td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan="7" className="st-empty">No patients match. Clear the search or the filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {modal?.mode === "edit" && (
        <PatientActionModal patients={rows} initialId={modal.id} onClose={() => setModal(null)} onSave={handleSave} />
      )}
      {modal?.mode === "add" && (
        <AddPatientModal onClose={() => setModal(null)} onAdd={handleAdd} />
      )}
    </div>
  );
}

/* ---------- Shared pop-up shell ---------- */
function ModalShell({ titleId, title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="st-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="st-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="st-modal__head">
          <div>
            <p className="st-modal__brand">HealthLocal AI</p>
            <h2 id={titleId} className="st-modal__title">{title}</h2>
          </div>
          <button type="button" className="st-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="st-modal__body">{children}</div>
        <footer className="st-modal__foot">{footer}</footer>
      </div>
    </div>
  );
}

/* ---------- Row action pop-up (matches your screenshot) ---------- */
function PatientActionModal({ patients, initialId, onClose, onSave }) {
  const first = patients.find((r) => r.id === initialId);
  const [form, setForm] = useState({ id: first.id, status: first.status, notes: first.notes });

  const changeSelection = (e) => {
    const next = patients.find((r) => r.id === e.target.value);
    setForm({ id: next.id, status: next.status, notes: next.notes });
  };

  return (
    <ModalShell
      titleId="patient-title"
      title="Patient Directory action"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="st-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="st-btn st-btn--primary" onClick={() => onSave(form)}>Save changes</button>
        </>
      }
    >
      <div className="st-callout st-field--full">
        <img src={settingsIcon} alt="" className="st-callout__ico" />
        <div>
          <strong>Authorized action</strong>
          <p>Changes are simulated and will be recorded in the sample activity log.</p>
        </div>
      </div>

      <label className="st-field">
        <span>Selection</span>
        <select value={form.id} onChange={changeSelection}>
          {patients.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </label>

      <label className="st-field">
        <span>Status</span>
        <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>

      <label className="st-field st-field--full">
        <span>Notes</span>
        <textarea rows="3" placeholder="Add an optional audit note…" value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </label>
    </ModalShell>
  );
}

/* ---------- Add patient pop-up ---------- */
function AddPatientModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", contact: "", status: "Active", notes: "" });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <ModalShell
      titleId="add-patient-title"
      title="Add patient"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="st-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="st-btn st-btn--primary" disabled={!form.name.trim()} onClick={() => onAdd(form)}>
            Add patient
          </button>
        </>
      }
    >
      <label className="st-field">
        <span>Full name</span>
        <input placeholder="Patient full name" value={form.name} onChange={set("name")} autoFocus />
      </label>

      <label className="st-field">
        <span>Contact</span>
        <input placeholder="+63 9XX ••• XXXX" value={form.contact} onChange={set("contact")} />
      </label>

      <label className="st-field st-field--full">
        <span>Status</span>
        <select value={form.status} onChange={set("status")}>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>

      <label className="st-field st-field--full">
        <span>Notes</span>
        <textarea rows="3" placeholder="Add an optional audit note…" value={form.notes} onChange={set("notes")} />
      </label>
    </ModalShell>
  );
}