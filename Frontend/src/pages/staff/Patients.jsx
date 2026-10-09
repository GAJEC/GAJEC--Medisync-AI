import { useEffect, useState } from "react";

import { staffApi } from "../../api/client";
import { formatDate, useDebounced, useStaffData } from "../../components/staff/useStaffData";
import ModalShell from "../../components/staff/ModalShell";

import searchIcon from "../../assets/icons/search.png";
import settingsIcon from "../../assets/icons/settings.png";
import StaffStyle from "../../assets/styles/Staff.module.css";

const PAGE_SIZE = 50;
const statuses = ["Active", "Inactive"];
const statusClass = (s) => `${StaffStyle["st-pill"]} ${StaffStyle["st-pill--" + s.toLowerCase()]}`;

export default function Patients() {
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | { mode: "edit", patient } | { mode: "add" }

  const onSearch = (e) => {
    setQuery(e.target.value);
    setPage(1);
  };
  const onStatus = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const { data, error, loading, reload, token } = useStaffData(
    (t) => staffApi.patients(t, { search, status: statusFilter, page, pageSize: PAGE_SIZE }),
    [search, statusFilter, page],
  );
  const rows = data?.patients ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const done = () => {
    setModal(null);
    reload();
  };

  return (
    <div className={StaffStyle['st-page']}>
      {/* ---------- Title ---------- */}
      <div className={StaffStyle['st-pagehead']}>
        <div>
          <h1 className={StaffStyle['st-title']}>Patient Directory</h1>
          <p className={StaffStyle['st-sub']}>View account and appointment information for patients who allow staff review.</p>
        </div>
        <div className={StaffStyle['st-actions']}>
          <button type="button" className={StaffStyle['st-btn']} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <img src={settingsIcon} alt="" className={StaffStyle['st-btn__ico']} /> Filters
          </button>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} onClick={() => setModal({ mode: "add" })}>
            <span className={StaffStyle['st-btn__plus']} aria-hidden="true">+</span> Add patient
          </button>
        </div>
      </div>

      {error && <p className={StaffStyle['st-alert']} role="alert">{error}</p>}

      {/* ---------- Table card ---------- */}
      <article className={`${StaffStyle['st-card']} ${StaffStyle['st-table-card']} ${loading ? StaffStyle['st-loading'] : ""}`}>
        <header className={`${StaffStyle['st-toolbar']} ${StaffStyle['st-toolbar--top']}`}>
          <label className={`${StaffStyle['st-searchbox']} ${StaffStyle['st-searchbox--sm']}`}>
            <img src={searchIcon} alt="" className={StaffStyle['st-btn__ico']} />
            <input type="search" placeholder="Search name, email or patient ID…" value={query} onChange={onSearch} />
          </label>
          {showFilters && (
            <select className={StaffStyle['st-select']} value={statusFilter} onChange={onStatus} aria-label="Filter by status">
              <option value="">All statuses</option>
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          <p className={`${StaffStyle['st-count']} ${StaffStyle['st-count--right']}`}>{total} patient{total === 1 ? "" : "s"}</p>
        </header>

        <div className={StaffStyle['st-tablewrap']}>
          <table className={`${StaffStyle['st-table']} ${StaffStyle['st-table--compact']}`}>
            <thead>
              <tr>
                <th>Patient</th><th>Patient ID</th><th>Contact</th><th>Registered</th>
                <th>Appointments</th><th>Last visit</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={StaffStyle['st-row--click']} tabIndex={0}
                    onClick={() => setModal({ mode: "edit", patient: r })}
                    onKeyDown={(e) => e.key === "Enter" && setModal({ mode: "edit", patient: r })}>
                  <td className={StaffStyle['st-ref']}>{r.name}</td>
                  <td className={StaffStyle['st-muted']}>{r.code}</td>
                  <td className={StaffStyle['st-muted']}>{r.contact || "—"}</td>
                  <td className={StaffStyle['st-muted']}>{formatDate(r.registeredAt)}</td>
                  <td className={StaffStyle['st-muted']}>{r.appointments}</td>
                  <td className={StaffStyle['st-muted']}>{formatDate(r.lastVisit)}</td>
                  <td><span className={statusClass(r.status)}>{r.status}</span></td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan="7" className={StaffStyle['st-empty']}>
                  {search || statusFilter ? "No patients match. Clear the search or the filter." : "No patients yet."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <footer className={StaffStyle['st-toolbar']} style={{ paddingTop: 14 }}>
            <p className={StaffStyle['st-count']}>Page {page} of {pages}</p>
            <div className={StaffStyle['st-toolbar__actions']}>
              <button type="button" className={StaffStyle['st-btn']} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button type="button" className={StaffStyle['st-btn']} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </footer>
        )}
      </article>

      {modal?.mode === "edit" && (
        <PatientActionModal token={token} patient={modal.patient} onClose={() => setModal(null)} onDone={done} />
      )}
      {modal?.mode === "add" && (
        <AddPatientModal token={token} onClose={() => setModal(null)} onDone={done} />
      )}
    </div>
  );
}

/* ---------- Patient details + status / note ---------- */
function PatientActionModal({ token, patient, onClose, onDone }) {
  const [form, setForm] = useState({ status: patient.status, notes: "" });
  const [details, setDetails] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    staffApi.patient(token, patient.id)
      .then(({ patient: p }) => !cancelled && setDetails(p))
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, [token, patient.id]);

  const changed = form.status !== patient.status || form.notes.trim();

  const save = async () => {
    if (form.status === "Inactive" && patient.status !== "Inactive" &&
        !window.confirm(`Deactivate ${patient.name}? They will be signed out and cannot sign in.`)) return;
    setSaving(true);
    setError("");
    try {
      await staffApi.updatePatient(token, patient.id, {
        ...(form.status !== patient.status && { status: form.status }),
        ...(form.notes.trim() && { notes: form.notes.trim() }),
      });
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const info = (label, value) => (
    <div className={StaffStyle['st-field']}>
      <span>{label}</span>
      <p className={StaffStyle['st-muted']} style={{ margin: 0, whiteSpace: "pre-wrap" }}>{value || "—"}</p>
    </div>
  );

  return (
    <ModalShell
      titleId="patient-title"
      title={`${patient.name} · ${patient.code}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={StaffStyle['st-btn']} onClick={onClose}>Cancel</button>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} disabled={!changed || saving} onClick={save}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      {error && <p className={StaffStyle['st-modal__error']} role="alert">{error}</p>}

      {info("Email", details?.email ?? patient.email)}
      {info("Mobile", details?.mobile)}
      {info("Date of birth", details?.dob)}
      {info("Sex", details?.sex)}
      {info("Allergies", details?.allergies)}
      {info("Current medications", details?.medications)}

      <label className={StaffStyle['st-field']}>
        <span>Account status</span>
        <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      {info("Last note", patient.notes)}

      <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
        <span>Add note</span>
        <textarea rows="3" maxLength={1000} placeholder="Add an optional audit note…" value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </label>
    </ModalShell>
  );
}

/* ---------- Register a patient at the front desk ---------- */
function AddPatientModal({ token, onClose, onDone }) {
  const [form, setForm] = useState({ firstname: "", lastname: "", email: "", mobile: "", password: "", status: "Active", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const canSubmit = form.firstname.trim() && form.lastname.trim() && /\S+@\S+\.\S+/.test(form.email)
    && form.password.length >= 8 && !saving;

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const body = {
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        email: form.email.trim(),
        password: form.password,
        status: form.status,
      };
      if (form.mobile.trim()) body.mobile = form.mobile.trim();
      if (form.notes.trim()) body.notes = form.notes.trim();
      await staffApi.createPatient(token, body);
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <ModalShell
      titleId="add-patient-title"
      title="Add patient"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={StaffStyle['st-btn']} onClick={onClose}>Cancel</button>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} disabled={!canSubmit} onClick={submit}>
            {saving ? "Adding…" : "Add patient"}
          </button>
        </>
      }
    >
      {error && <p className={StaffStyle['st-modal__error']} role="alert">{error}</p>}

      <label className={StaffStyle['st-field']}>
        <span>First name</span>
        <input maxLength={100} value={form.firstname} onChange={set("firstname")} autoFocus />
      </label>
      <label className={StaffStyle['st-field']}>
        <span>Last name</span>
        <input maxLength={100} value={form.lastname} onChange={set("lastname")} />
      </label>

      <label className={StaffStyle['st-field']}>
        <span>Email</span>
        <input type="email" maxLength={255} placeholder="patient@email.com" value={form.email} onChange={set("email")} />
      </label>
      <label className={StaffStyle['st-field']}>
        <span>Mobile</span>
        <input maxLength={30} placeholder="+63 9XX XXX XXXX" value={form.mobile} onChange={set("mobile")} />
      </label>

      <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
        <span>Status</span>
        <select value={form.status} onChange={set("status")}>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>

      <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
        <span>Notes</span>
        <textarea rows="3" maxLength={1000} placeholder="Add an optional audit note…" value={form.notes} onChange={set("notes")} />
      </label>

      <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
        <span>Temporary password</span>
        <input type="text" minLength={8} maxLength={128} placeholder="At least 8 characters" value={form.password} onChange={set("password")} autoComplete="new-password" />
        <small className={StaffStyle['st-muted']}>Give this to the patient; they can change it in their account settings.</small>
      </label>
    </ModalShell>
  );
}
