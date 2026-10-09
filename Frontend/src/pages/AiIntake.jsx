import { useEffect, useMemo, useState } from "react";
import "./staff/Staff.css";
import searchIcon from "../../assets/icons/search.png";
import settingsIcon from "../../assets/icons/settings.png";
import aiIcon from "../../assets/icons/ai.png";
import insuranceIcon from "../../assets/icons/insurance.png";

const initialIntakes = [
  { id: "AI-250624-109", patient: "P-20481", concern: "Recurring headache", pain: "4/10", specialty: "Internal Medicine", doctor: "Dr. Maria Santos", status: "Pending", notes: "" },
  { id: "AI-250624-108", patient: "P-20479", concern: "Persistent cough", pain: "2/10", specialty: "Family Medicine", doctor: "Dr. Daniel Reyes", status: "Reviewed", notes: "" },
  { id: "AI-250624-104", patient: "P-20461", concern: "Severe chest pain", pain: "9/10", specialty: "Emergency", doctor: "Escalated", status: "Clinical review", notes: "" },
];

const statuses = ["Pending", "Reviewed", "Clinical review"];
const statusClass = (s) => "st-pill st-pill--" + s.toLowerCase().replace(/\s+/g, "-");

export default function AiIntake() {
  const [rows, setRows] = useState(initialIntakes);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState(null); // null = pop-up closed

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!q || [r.id, r.patient, r.concern, r.specialty, r.doctor].some((v) => v.toLowerCase().includes(q))) &&
        (!statusFilter || r.status === statusFilter)
    );
  }, [rows, query, statusFilter]);

  // "Review queue" opens the first intake that is still pending
  const openQueue = () => {
    const next = rows.find((r) => r.status === "Pending") || rows[0];
    setSelectedId(next.id);
  };

  const handleSave = ({ id, status, notes }) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status, notes } : r)));
    setSelectedId(null);
  };

  return (
    <div className="st-page">
      {/* ---------- Title ---------- */}
      <div className="st-pagehead">
        <div>
          <h1 className="st-title">AI Intake &amp; Matching</h1>
          <p className="st-sub">Review preliminary routing suggestions before clinical assignment.</p>
        </div>
        <div className="st-actions">
          <button type="button" className="st-btn" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <img src={settingsIcon} alt="" className="st-btn__ico" /> Filters
          </button>
          <button type="button" className="st-btn st-btn--primary" onClick={openQueue}>
            <span className="st-btn__plus" aria-hidden="true">+</span> Review queue
          </button>
        </div>
      </div>

      {/* ---------- Table card ---------- */}
      <article className="st-card st-table-card">
        <header className="st-toolbar st-toolbar--top">
          <label className="st-searchbox st-searchbox--sm">
            <img src={searchIcon} alt="" className="st-btn__ico" />
            <input type="search" placeholder="Search intake…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {showFilters && (
            <select className="st-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by review status">
              <option value="">All review statuses</option>
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          <p className="st-count st-count--right">{visible.length} sample record{visible.length === 1 ? "" : "s"}</p>
        </header>

        <div className="st-tablewrap">
          <table className="st-table st-table--compact">
            <thead>
              <tr>
                <th>Intake ID</th><th>Patient</th><th>Reported concern</th><th>Pain</th>
                <th>Suggested specialty</th><th>Doctor</th><th>Review status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="st-row--click" tabIndex={0}
                    onClick={() => setSelectedId(r.id)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedId(r.id)}>
                  <td className="st-ref">{r.id}</td>
                  <td className="st-muted">{r.patient}</td>
                  <td>{r.concern}</td>
                  <td className="st-muted">{r.pain}</td>
                  <td className="st-muted">{r.specialty}</td>
                  <td className="st-muted">{r.doctor}</td>
                  <td><span className={statusClass(r.status)}>{r.status}</span></td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan="7" className="st-empty">No intake records match. Clear the search or the filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {/* ---------- Notice ---------- */}
      <div className="st-notice">
        <img src={insuranceIcon} alt="" className="st-notice__ico" />
        <div>
          <strong>AI suggestions are preliminary.</strong>
          <p>They explain hospital-configured specialty and availability criteria; they do not provide a diagnosis. Urgent cases follow the hospital escalation process.</p>
        </div>
      </div>

      {selectedId && (
        <IntakeActionModal
          intakes={rows}
          initialId={selectedId}
          onClose={() => setSelectedId(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

/* ---------- Pop-up ---------- */
function IntakeActionModal({ intakes, initialId, onClose, onSave }) {
  const first = intakes.find((r) => r.id === initialId);
  const [form, setForm] = useState({ id: first.id, status: first.status, notes: first.notes });

  // Switching the selection loads that intake's current status and note
  const changeSelection = (e) => {
    const next = intakes.find((r) => r.id === e.target.value);
    setForm({ id: next.id, status: next.status, notes: next.notes });
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="st-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="st-modal" role="dialog" aria-modal="true" aria-labelledby="intake-title">
        <header className="st-modal__head">
          <div>
            <p className="st-modal__brand">HealthLocal AI</p>
            <h2 id="intake-title" className="st-modal__title">AI Intake &amp; Matching action</h2>
          </div>
          <button type="button" className="st-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="st-modal__body">
          <div className="st-callout st-field--full">
            <img src={aiIcon} alt="" className="st-callout__ico" />
            <div>
              <strong>Authorized action</strong>
              <p>Changes are simulated and will be recorded in the sample activity log.</p>
            </div>
          </div>

          <label className="st-field">
            <span>Selection</span>
            <select value={form.id} onChange={changeSelection}>
              {intakes.map((r) => <option key={r.id}>{r.id}</option>)}
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
        </div>

        <footer className="st-modal__foot">
          <button type="button" className="st-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="st-btn st-btn--primary" onClick={() => onSave(form)}>Save changes</button>
        </footer>
      </div>
    </div>
  );
}