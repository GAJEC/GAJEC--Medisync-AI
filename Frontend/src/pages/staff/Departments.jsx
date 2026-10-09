import { useState } from "react";

import { staffApi } from "../../api/client";
import { useDebounced, useStaffData } from "../../components/staff/useStaffData";
import ModalShell from "../../components/staff/ModalShell";

import searchIcon from "../../assets/icons/search.png";
import settingsIcon from "../../assets/icons/settings.png";
import StaffStyle from "../../assets/styles/Staff.module.css";

const statuses = ["Active", "Inactive"];
const statusClass = (s) => `${StaffStyle["st-pill"]} ${StaffStyle["st-pill--" + s.toLowerCase()]}`;

export default function Departments() {
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState(null); // null | { department } (edit) | {} (add)

  const { data, error, loading, reload, token } = useStaffData(
    (t) => staffApi.departments(t, { search, status: statusFilter }),
    [search, statusFilter],
  );
  const doctorsData = useStaffData((t) => staffApi.doctors(t));
  const rows = data?.departments ?? [];
  const doctors = doctorsData.data?.doctors ?? [];

  const done = () => {
    setModal(null);
    reload();
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
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} onClick={() => setModal({})}>
            <span className={StaffStyle['st-btn__plus']} aria-hidden="true">+</span> Add department
          </button>
        </div>
      </div>

      {error && <p className={StaffStyle['st-alert']} role="alert">{error}</p>}

      {/* ---------- Table card ---------- */}
      <article className={`${StaffStyle['st-card']} ${StaffStyle['st-table-card']} ${loading ? StaffStyle['st-loading'] : ""}`}>
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
          <p className={`${StaffStyle['st-count']} ${StaffStyle['st-count--right']}`}>{rows.length} department{rows.length === 1 ? "" : "s"}</p>
        </header>

        <div className={StaffStyle['st-tablewrap']}>
          <table className={`${StaffStyle['st-table']} ${StaffStyle['st-table--compact']}`}>
            <thead>
              <tr>
                <th>Department</th><th>Specialty</th><th>Department head</th>
                <th>Doctors</th><th>Hours</th><th>Capacity today</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={StaffStyle['st-row--click']} tabIndex={0}
                    onClick={() => setModal({ department: r })}
                    onKeyDown={(e) => e.key === "Enter" && setModal({ department: r })}>
                  <td className={StaffStyle['st-ref']}>{r.name}</td>
                  <td className={StaffStyle['st-muted']}>{r.specialty}</td>
                  <td className={StaffStyle['st-muted']}>{r.head || "Unassigned"}</td>
                  <td className={StaffStyle['st-num']}>{r.doctors}</td>
                  <td className={StaffStyle['st-muted']}>{r.hours}</td>
                  <td className={StaffStyle['st-muted']} title={`${r.today} of ${r.dailyCapacity} daily slots`}>{r.capacity}%</td>
                  <td><span className={statusClass(r.status)}>{r.status}</span></td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan="7" className={StaffStyle['st-empty']}>
                  {search || statusFilter ? "No departments match. Clear the search or the filter." : "No departments yet."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {modal && (
        <DepartmentModal token={token} department={modal.department} doctors={doctors} onClose={() => setModal(null)} onDone={done} />
      )}
    </div>
  );
}

/* ---------- Add / edit department ---------- */
function DepartmentModal({ token, department, doctors, onClose, onDone }) {
  const editing = Boolean(department);
  const [form, setForm] = useState({
    name: department?.name || "",
    specialty: department?.specialty || "",
    headDoctorId: department?.headDoctorId ? String(department.headDoctorId) : "",
    opensAt: department?.opensAt || "08:00",
    closesAt: department?.closesAt || "17:00",
    dailyCapacity: String(department?.dailyCapacity ?? 40),
    status: department?.status || "Active",
    notes: department?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const capacity = Number(form.dailyCapacity);
  const canSubmit = form.name.trim() && form.specialty.trim() && Number.isInteger(capacity) && capacity >= 0 && !saving;

  const submit = async () => {
    if (form.opensAt >= form.closesAt) return setError("Closing time must be after opening time.");
    setSaving(true);
    setError("");
    const body = {
      name: form.name.trim(),
      specialty: form.specialty.trim(),
      headDoctorId: form.headDoctorId ? Number(form.headDoctorId) : null,
      opensAt: form.opensAt,
      closesAt: form.closesAt,
      dailyCapacity: capacity,
      status: form.status,
      notes: form.notes.trim(),
    };
    try {
      if (editing) await staffApi.updateDepartment(token, department.id, body);
      else await staffApi.createDepartment(token, body);
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <ModalShell
      titleId="dept-title"
      title={editing ? department.name : "Add department"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={StaffStyle['st-btn']} onClick={onClose}>Cancel</button>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} disabled={!canSubmit} onClick={submit}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add department"}
          </button>
        </>
      }
    >
      {error && <p className={StaffStyle['st-modal__error']} role="alert">{error}</p>}

      <label className={StaffStyle['st-field']}>
        <span>Department name</span>
        <input placeholder="e.g. Cardiology Care" maxLength={120} value={form.name} onChange={set("name")} autoFocus />
      </label>
      <label className={StaffStyle['st-field']}>
        <span>Specialty</span>
        <input placeholder="e.g. Cardiology" maxLength={100} value={form.specialty} onChange={set("specialty")} />
      </label>

      <label className={StaffStyle['st-field']}>
        <span>Department head</span>
        <select value={form.headDoctorId} onChange={set("headDoctorId")}>
          <option value="">Unassigned</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </label>
      <label className={StaffStyle['st-field']}>
        <span>Daily capacity (appointments)</span>
        <input type="number" min="0" max="10000" step="1" value={form.dailyCapacity} onChange={set("dailyCapacity")} />
      </label>

      <label className={StaffStyle['st-field']}>
        <span>Opens</span>
        <input type="time" value={form.opensAt} onChange={set("opensAt")} />
      </label>
      <label className={StaffStyle['st-field']}>
        <span>Closes</span>
        <input type="time" value={form.closesAt} onChange={set("closesAt")} />
      </label>

      <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
        <span>Status</span>
        <select value={form.status} onChange={set("status")}>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>

      <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
        <span>Notes</span>
        <textarea rows="3" maxLength={1000} placeholder="Optional notes…" value={form.notes} onChange={set("notes")} />
      </label>
    </ModalShell>
  );
}
