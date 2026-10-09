import { useEffect, useMemo, useState } from "react";
import "./Staff.css";
import searchIcon from "../../assets/icons/search.png";
import settingsIcon from "../../assets/icons/settings.png";
import insuranceIcon from "../../assets/icons/insurance.png";

const initialStaff = [
  { id: 1, name: "Ana Mendoza", role: "Hospital Administrator", department: "Operations", lastActive: "Now", account: "Active", mfa: "Enabled", notes: "" },
  { id: 2, name: "Carlo Lim", role: "Appointment Coordinator", department: "Patient Services", lastActive: "12 min ago", account: "Active", mfa: "Enabled", notes: "" },
  { id: 3, name: "Dr. Maria Santos", role: "Doctor", department: "Adult Medicine", lastActive: "1 hour ago", account: "Active", mfa: "Enabled", notes: "" },
  { id: 4, name: "Elena Cruz", role: "Read-only Staff", department: "Quality", lastActive: "Yesterday", account: "Active", mfa: "Pending", notes: "" },
];

const roles = ["Hospital Administrator", "Appointment Coordinator", "Doctor", "Read-only Staff"];
const accountStatuses = ["Active", "Pending", "Suspended"];

export default function StaffPermissions() {
  const [rows, setRows] = useState(initialStaff);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");
  const [modal, setModal] = useState(null); // null | { mode: "edit", id } | { mode: "invite" }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!q || [r.name, r.role, r.department].some((v) => v.toLowerCase().includes(q))) &&
        (!roleFilter || r.role === roleFilter)
    );
  }, [rows, query, roleFilter]);

  const handleSave = ({ id, status, notes }) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, account: status, notes } : r)));
    setModal(null);
  };

  const handleInvite = (form) => {
    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: form.name.trim(),
        role: form.role,
        department: form.department.trim() || "—",
        lastActive: "Invited",
        account: "Pending",
        mfa: "Pending",
        notes: "",
      },
    ]);
    setModal(null);
  };

  return (
    <div className="st-page">
      {/* ---------- Title ---------- */}
      <div className="st-pagehead">
        <div>
          <h1 className="st-title">Staff &amp; Permissions</h1>
          <p className="st-sub">Manage staff roles, account access, and activity records.</p>
        </div>
        <div className="st-actions">
          <button type="button" className="st-btn" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <img src={settingsIcon} alt="" className="st-btn__ico" /> Filters
          </button>
          <button type="button" className="st-btn st-btn--primary" onClick={() => setModal({ mode: "invite" })}>
            <span className="st-btn__plus" aria-hidden="true">+</span> Invite staff
          </button>
        </div>
      </div>

      {/* ---------- Table card ---------- */}
      <article className="st-card st-table-card">
        <header className="st-toolbar st-toolbar--top">
          <label className="st-searchbox st-searchbox--sm">
            <img src={searchIcon} alt="" className="st-btn__ico" />
            <input type="search" placeholder="Search staff…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {showFilters && (
            <select className="st-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
              <option value="">All roles</option>
              {roles.map((r) => <option key={r}>{r}</option>)}
            </select>
          )}
          <p className="st-count st-count--right">{visible.length} sample record{visible.length === 1 ? "" : "s"}</p>
        </header>

        <div className="st-tablewrap">
          <table className="st-table st-table--compact">
            <thead>
              <tr>
                <th>Staff member</th><th>Role</th><th>Department</th>
                <th>Last active</th><th>Account</th><th>MFA</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td className="st-ref">{r.name}</td>
                  <td className="st-muted">{r.role}</td>
                  <td className="st-muted">{r.department}</td>
                  <td className="st-muted">{r.lastActive}</td>
                  <td className="st-muted">{r.account}</td>
                  <td className="st-muted">{r.mfa}</td>
                  <td>
                    <button type="button" className="st-manage" onClick={() => setModal({ mode: "edit", id: r.id })}
                            aria-label={`Manage ${r.name}`}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan="7" className="st-empty">No staff match. Clear the search or the filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {modal?.mode === "edit" && (
        <StaffActionModal staff={rows} initialId={modal.id} onClose={() => setModal(null)} onSave={handleSave} />
      )}
      {modal?.mode === "invite" && (
        <InviteStaffModal onClose={() => setModal(null)} onInvite={handleInvite} />
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

/* ---------- Manage pop-up (matches your screenshot) ---------- */
function StaffActionModal({ staff, initialId, onClose, onSave }) {
  const first = staff.find((r) => r.id === initialId);
  const [form, setForm] = useState({ id: first.id, status: first.account, notes: first.notes });

  const changeSelection = (e) => {
    const next = staff.find((r) => r.id === Number(e.target.value));
    setForm({ id: next.id, status: next.account, notes: next.notes });
  };

  return (
    <ModalShell
      titleId="staff-title"
      title="Staff & Permissions action"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="st-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="st-btn st-btn--primary" onClick={() => onSave(form)}>Save changes</button>
        </>
      }
    >
      <div className="st-callout st-field--full">
        <img src={insuranceIcon} alt="" className="st-callout__ico" />
        <div>
          <strong>Authorized action</strong>
          <p>Changes are simulated and will be recorded in the sample activity log.</p>
        </div>
      </div>

      <label className="st-field">
        <span>Selection</span>
        <select value={form.id} onChange={changeSelection}>
          {staff.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </label>

      <label className="st-field">
        <span>Status</span>
        <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
          {accountStatuses.map((s) => <option key={s}>{s}</option>)}
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

/* ---------- Invite staff pop-up ---------- */
function InviteStaffModal({ onClose, onInvite }) {
  const [form, setForm] = useState({ name: "", email: "", role: roles[1], department: "" });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <ModalShell
      titleId="invite-title"
      title="Invite staff"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="st-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="st-btn st-btn--primary" disabled={!form.name.trim()} onClick={() => onInvite(form)}>
            Send invite
          </button>
        </>
      }
    >
      <label className="st-field">
        <span>Full name</span>
        <input placeholder="Full name" value={form.name} onChange={set("name")} autoFocus />
      </label>
      <label className="st-field">
        <span>Email</span>
        <input type="email" placeholder="name@stgabriel.demo" value={form.email} onChange={set("email")} />
      </label>

      <label className="st-field">
        <span>Role</span>
        <select value={form.role} onChange={set("role")}>
          {roles.map((r) => <option key={r}>{r}</option>)}
        </select>
      </label>
      <label className="st-field">
        <span>Department</span>
        <input placeholder="e.g. Patient Services" value={form.department} onChange={set("department")} />
      </label>
    </ModalShell>
  );
}