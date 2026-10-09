import { useEffect, useMemo, useState } from "react";

import searchIcon from "../../assets/icons/search.png";
import settingsIcon from "../../assets/icons/settings.png";
import StaffStyle from "../../assets/styles/Staff.module.css";

const initialDepartments = [
  { id: 1, name: "Adult Medicine", specialty: "Internal Medicine", head: "Dr. M. Santos", doctors: 12, hours: "8:00–17:00", capacity: 86, status: "Active", notes: "" },
  { id: 2, name: "Primary Care", specialty: "Family Medicine", head: "Dr. D. Reyes", doctors: 9, hours: "7:00–19:00", capacity: 72, status: "Active", notes: "" },
  { id: 3, name: "Child Health", specialty: "Pediatrics", head: "Dr. A. Cruz", doctors: 8, hours: "8:00–17:00", capacity: 64, status: "Active", notes: "" },
];

const statuses = ["Active", "Inactive"];
const statusClass = (s) => `${StaffStyle["st-pill"]} ${StaffStyle["st-pill--" + s.toLowerCase()]}`;

export default function Departments() {
  const [rows, setRows] = useState(initialDepartments);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState(null); // null | { mode: "edit", id } | { mode: "add" }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!q || [r.name, r.specialty, r.head].some((v) => v.toLowerCase().includes(q))) &&
        (!statusFilter || r.status === statusFilter)
    );
  }, [rows, query, statusFilter]);

  const handleSave = ({ id, status, notes }) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status, notes } : r)));
    setModal(null);
  };

  const handleAdd = (form) => {
    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: form.name.trim(),
        specialty: form.specialty.trim() || "—",
        head: form.head.trim() || "Unassigned",
        doctors: 0,
        hours: form.hours.trim() || "8:00–17:00",
        capacity: 0,
        status: form.status,
        notes: "",
      },
    ]);
    setModal(null);
  };

  return (
    <div className={StaffStyle['st-page']}>
      {/* ---------- Title ---------- */}
      <div className={StaffStyle['st-pagehead']}>
        <div>
          <h1 className={StaffStyle['st-title']}>Departments &amp; Specialties</h1>
          <p className={StaffStyle['st-sub']}>Configure hospital routing, capacity, and department availability.</p>
        </div>
        <div className={StaffStyle['st-actions']}>
          <button type="button" className={StaffStyle['st-btn']} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <img src={settingsIcon} alt="" className={StaffStyle['st-btn__ico']} /> Filters
          </button>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} onClick={() => setModal({ mode: "add" })}>
            <span className={StaffStyle['st-btn__plus']} aria-hidden="true">+</span> Add department
          </button>
        </div>
      </div>

      {/* ---------- Table card ---------- */}
      <article className={`${StaffStyle['st-card']} ${StaffStyle['st-table-card']}`}>
        <header className={`${StaffStyle['st-toolbar']} ${StaffStyle['st-toolbar--top']}`}>
          <label className={`${StaffStyle['st-searchbox']} ${StaffStyle['st-searchbox--sm']}`}>
            <img src={searchIcon} alt="" className={StaffStyle['st-btn__ico']} />
            <input type="search" placeholder="Search departments…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {showFilters && (
            <select className={StaffStyle['st-select']} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          <p className={`${StaffStyle['st-count']} ${StaffStyle['st-count--right']}`}>{visible.length} sample record{visible.length === 1 ? "" : "s"}</p>
        </header>

        <div className={StaffStyle['st-tablewrap']}>
          <table className={`${StaffStyle['st-table']} ${StaffStyle['st-table--compact']}`}>
            <thead>
              <tr>
                <th>Department</th><th>Specialty</th><th>Department head</th>
                <th>Doctors</th><th>Hours</th><th>Capacity</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className={StaffStyle['st-row--click']} tabIndex={0}
                    onClick={() => setModal({ mode: "edit", id: r.id })}
                    onKeyDown={(e) => e.key === "Enter" && setModal({ mode: "edit", id: r.id })}>
                  <td className={StaffStyle['st-ref']}>{r.name}</td>
                  <td className={StaffStyle['st-muted']}>{r.specialty}</td>
                  <td className={StaffStyle['st-muted']}>{r.head}</td>
                  <td className={StaffStyle['st-num']}>{r.doctors}</td>
                  <td className={StaffStyle['st-muted']}>{r.hours}</td>
                  <td className={StaffStyle['st-muted']}>{r.capacity}%</td>
                  <td><span className={statusClass(r.status)}>{r.status}</span></td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan="7" className={StaffStyle['st-empty']}>No departments match. Clear the search or the filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {modal?.mode === "edit" && (
        <DepartmentActionModal departments={rows} initialId={modal.id} onClose={() => setModal(null)} onSave={handleSave} />
      )}
      {modal?.mode === "add" && (
        <AddDepartmentModal onClose={() => setModal(null)} onAdd={handleAdd} />
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
    <div className={StaffStyle['st-overlay']} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={StaffStyle['st-modal']} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={StaffStyle['st-modal__head']}>
          <div>
            <p className={StaffStyle['st-modal__brand']}>HealthLocal AI</p>
            <h2 id={titleId} className={StaffStyle['st-modal__title']}>{title}</h2>
          </div>
          <button type="button" className={StaffStyle['st-modal__close']} onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className={StaffStyle['st-modal__body']}>{children}</div>
        <footer className={StaffStyle['st-modal__foot']}>{footer}</footer>
      </div>
    </div>
  );
}

/* ---------- Row action pop-up (matches your screenshot) ---------- */
function DepartmentActionModal({ departments, initialId, onClose, onSave }) {
  const first = departments.find((r) => r.id === initialId);
  const [form, setForm] = useState({ id: first.id, status: first.status, notes: first.notes });

  const changeSelection = (e) => {
    const next = departments.find((r) => r.id === Number(e.target.value));
    setForm({ id: next.id, status: next.status, notes: next.notes });
  };

  return (
    <ModalShell
      titleId="dept-title"
      title="Departments & Specialties action"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={StaffStyle['st-btn']} onClick={onClose}>Cancel</button>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} onClick={() => onSave(form)}>Save changes</button>
        </>
      }
    >
      <div className={`${StaffStyle['st-callout']} ${StaffStyle['st-field--full']}`}>
        <img src={settingsIcon} alt="" className={StaffStyle['st-callout__ico']} />
        <div>
          <strong>Authorized action</strong>
          <p>Changes are simulated and will be recorded in the sample activity log.</p>
        </div>
      </div>

      <label className={StaffStyle['st-field']}>
        <span>Selection</span>
        <select value={form.id} onChange={changeSelection}>
          {departments.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </label>

      <label className={StaffStyle['st-field']}>
        <span>Status</span>
        <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>

      <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
        <span>Notes</span>
        <textarea rows="3" placeholder="Add an optional audit note…" value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </label>
    </ModalShell>
  );
}

/* ---------- Add department pop-up ---------- */
function AddDepartmentModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", specialty: "", head: "", hours: "8:00–17:00", status: "Active" });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <ModalShell
      titleId="add-dept-title"
      title="Add department"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={StaffStyle['st-btn']} onClick={onClose}>Cancel</button>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} disabled={!form.name.trim()} onClick={() => onAdd(form)}>
            Add department
          </button>
        </>
      }
    >
      <label className={StaffStyle['st-field']}>
        <span>Department name</span>
        <input placeholder="e.g. Cardiology Care" value={form.name} onChange={set("name")} autoFocus />
      </label>
      <label className={StaffStyle['st-field']}>
        <span>Specialty</span>
        <input placeholder="e.g. Cardiology" value={form.specialty} onChange={set("specialty")} />
      </label>

      <label className={StaffStyle['st-field']}>
        <span>Department head</span>
        <input placeholder="Dr. Full Name" value={form.head} onChange={set("head")} />
      </label>
      <label className={StaffStyle['st-field']}>
        <span>Hours</span>
        <input placeholder="8:00–17:00" value={form.hours} onChange={set("hours")} />
      </label>

      <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
        <span>Status</span>
        <select value={form.status} onChange={set("status")}>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
    </ModalShell>
  );
}