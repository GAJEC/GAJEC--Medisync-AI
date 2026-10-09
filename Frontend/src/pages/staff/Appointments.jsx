import { useEffect, useMemo, useState } from "react";

import { staffApi } from "../../api/client";
import { formatDateTime, isoDay, useDebounced, useStaffData } from "../../components/staff/useStaffData";
import ModalShell from "../../components/staff/ModalShell";

import searchIcon from "../../assets/icons/search.png";
import StaffStyle from "../../assets/styles/Staff.module.css";

const PAGE_SIZE = 25;
const STATUSES = ["Pending Review", "Confirmed", "Completed", "Cancelled"];
const TIMES = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

const statusClass = (s) => `${StaffStyle["st-pill"]} ${StaffStyle["st-pill--" + s.toLowerCase().replace(/\s+/g, "-")] || ""}`;
const timeLabel = (t) => new Date(`2000-01-01T${t}:00`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
// Local date + "HH:MM" -> ISO string with the browser's offset applied.
const toIso = (date, time) => new Date(`${date}T${time}:00`).toISOString();

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoDay(d);
};

export default function Appointments() {
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());
  const [filters, setFilters] = useState({ status: "", doctorId: "", specialty: "", departmentId: "" });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | { mode: "new" } | { mode: "manage", appointment }

  const setFilter = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPage(1);
  };

  const { data, error, loading, reload, token } = useStaffData(
    (t) => staffApi.appointments(t, { ...filters, search, page, pageSize: PAGE_SIZE, order: "latest" }),
    [filters, search, page],
  );
  const lookups = useStaffData(async (t) => {
    const [{ doctors }, { departments }] = await Promise.all([staffApi.doctors(t), staffApi.departments(t)]);
    return { doctors, departments };
  });

  const doctors = useMemo(() => lookups.data?.doctors ?? [], [lookups.data]);
  const departments = lookups.data?.departments ?? [];
  const specialties = useMemo(() => [...new Set(doctors.map((d) => d.specialty))].sort(), [doctors]);
  const rows = data?.appointments ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportCsv = () => {
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["Patient", "Patient ID", "Reference", "Doctor", "Specialty", "Department", "Date & time", "Source", "Status"],
      ...rows.map((r) => [r.patient, r.patientCode, r.ref, r.doctor || "Unassigned", r.specialty, r.department, formatDateTime(r.scheduledAt), r.source, r.displayStatus]),
    ];
    const url = URL.createObjectURL(new Blob([lines.map((l) => l.map(cell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `appointments-${isoDay()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const done = () => {
    setModal(null);
    reload();
  };

  return (
    <div className={StaffStyle['st-page']}>
      {/* ---------- Title ---------- */}
      <div className={StaffStyle['st-pagehead']}>
        <div>
          <h1 className={StaffStyle['st-title']}>Appointment Management</h1>
          <p className={StaffStyle['st-sub']}>Review, assign, and coordinate hospital appointment requests.</p>
        </div>
        <div className={StaffStyle['st-actions']}>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} onClick={() => setModal({ mode: "new" })}>
            <span className={StaffStyle['st-btn__plus']} aria-hidden="true">+</span> New appointment
          </button>
        </div>
      </div>

      {/* ---------- Filters ---------- */}
      <div className={StaffStyle['st-filters']}>
        <label className={StaffStyle['st-searchbox']}>
          <img src={searchIcon} alt="" className={StaffStyle['st-btn__ico']} />
          <input type="search" placeholder="Search patient, doctor or reference" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
        </label>

        <select className={StaffStyle['st-select']} value={filters.status} onChange={setFilter("status")} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((v) => <option key={v}>{v}</option>)}
        </select>
        <select className={StaffStyle['st-select']} value={filters.doctorId} onChange={setFilter("doctorId")} aria-label="Filter by doctor">
          <option value="">All doctors</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className={StaffStyle['st-select']} value={filters.specialty} onChange={setFilter("specialty")} aria-label="Filter by specialty">
          <option value="">All specialties</option>
          {specialties.map((v) => <option key={v}>{v}</option>)}
        </select>
        <select className={StaffStyle['st-select']} value={filters.departmentId} onChange={setFilter("departmentId")} aria-label="Filter by department">
          <option value="">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {error && <p className={StaffStyle['st-alert']} role="alert">{error}</p>}

      {/* ---------- Table ---------- */}
      <article className={`${StaffStyle['st-card']} ${StaffStyle['st-table-card']} ${loading ? StaffStyle['st-loading'] : ""}`}>
        <header className={StaffStyle['st-toolbar']}>
          <p className={StaffStyle['st-count']}>{total} appointment{total === 1 ? "" : "s"}</p>
          <div className={StaffStyle['st-toolbar__actions']}>
            <button type="button" className={StaffStyle['st-link']} onClick={exportCsv} disabled={rows.length === 0}>
              <span aria-hidden="true">↓</span> Export
            </button>
          </div>
        </header>

        <div className={StaffStyle['st-tablewrap']}>
          <table className={StaffStyle['st-table']}>
            <thead>
              <tr>
                <th>Patient</th><th>Reference</th><th>Doctor</th><th>Specialty</th>
                <th>Date &amp; time</th><th>Source</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.patient}</strong><small>{r.patientCode}</small></td>
                  <td className={StaffStyle['st-ref']}>{r.ref}</td>
                  <td className={StaffStyle['st-muted']}>{r.doctor || "Unassigned"}</td>
                  <td className={StaffStyle['st-muted']}>{r.specialty || "—"}</td>
                  <td className={StaffStyle['st-muted']}>{formatDateTime(r.scheduledAt)}</td>
                  <td className={StaffStyle['st-muted']}>{r.source}</td>
                  <td><span className={statusClass(r.displayStatus)}>{r.displayStatus}</span></td>
                  <td>
                    <button type="button" className={StaffStyle['st-more']} aria-label={`Manage ${r.ref}`}
                            onClick={() => setModal({ mode: "manage", appointment: r })}>···</button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan="8" className={StaffStyle['st-empty']}>
                  {search || Object.values(filters).some(Boolean)
                    ? "No appointments match these filters. Clear a filter or change your search."
                    : "No appointments yet."}
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

      {modal?.mode === "new" && (
        <NewAppointmentModal token={token} doctors={doctors} onClose={() => setModal(null)} onDone={done} />
      )}
      {modal?.mode === "manage" && (
        <ManageAppointmentModal token={token} doctors={doctors} appointment={modal.appointment} onClose={() => setModal(null)} onDone={done} />
      )}
    </div>
  );
}

/* ---------- New appointment ---------- */
function NewAppointmentModal({ token, doctors, onClose, onDone }) {
  const [form, setForm] = useState({ patientId: "", doctorId: "", reason: "", date: tomorrow(), time: "09:00" });
  const [patientQuery, setPatientQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const debounced = useDebounced(patientQuery.trim(), 250);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    let cancelled = false;
    staffApi.patientOptions(token, debounced)
      .then(({ patients }) => !cancelled && setOptions(patients))
      .catch(() => !cancelled && setOptions([]));
    return () => { cancelled = true; };
  }, [token, debounced]);

  const pickPatient = (e) => {
    setPatientQuery(e.target.value);
    const match = options.find((p) => `${p.name} (${p.code})` === e.target.value);
    setForm((f) => ({ ...f, patientId: match ? match.id : "" }));
  };

  const canSubmit = form.patientId && form.reason.trim() && form.date && form.time && !saving;

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await staffApi.createAppointment(token, {
        patientId: form.patientId,
        doctorId: form.doctorId ? Number(form.doctorId) : null,
        reason: form.reason.trim(),
        scheduledAt: toIso(form.date, form.time),
      });
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <ModalShell
      titleId="new-appt-title"
      title="New appointment"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={StaffStyle['st-btn']} onClick={onClose}>Cancel</button>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} disabled={!canSubmit} onClick={submit}>
            {saving ? "Booking…" : "Create appointment"}
          </button>
        </>
      }
    >
      {error && <p className={StaffStyle['st-modal__error']} role="alert">{error}</p>}

      <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
        <span>Patient</span>
        <input list="st-patients" placeholder="Search by name, email or patient ID" value={patientQuery} onChange={pickPatient} autoFocus />
        <datalist id="st-patients">
          {options.map((p) => <option key={p.id} value={`${p.name} (${p.code})`}>{p.email}</option>)}
        </datalist>
      </label>

      <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
        <span>Reason for visit</span>
        <input placeholder="e.g. Follow-up consultation" maxLength={255} value={form.reason} onChange={set("reason")} />
      </label>

      <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
        <span>Assigned doctor</span>
        <select value={form.doctorId} onChange={set("doctorId")}>
          <option value="">Assign later</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.specialty} · {d.workStart}–{d.workEnd}</option>)}
        </select>
      </label>

      <label className={StaffStyle['st-field']}>
        <span>Date</span>
        <input type="date" min={isoDay()} value={form.date} onChange={set("date")} />
      </label>

      <label className={StaffStyle['st-field']}>
        <span>Time</span>
        <select value={form.time} onChange={set("time")}>
          {TIMES.map((t) => <option key={t} value={t}>{timeLabel(t)}</option>)}
        </select>
      </label>
    </ModalShell>
  );
}

/* ---------- Manage appointment: assign, reschedule, complete, cancel ---------- */
function ManageAppointmentModal({ token, doctors, appointment, onClose, onDone }) {
  const at = new Date(appointment.scheduledAt);
  const startTime = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
  const [form, setForm] = useState({
    doctorId: appointment.doctorId ? String(appointment.doctorId) : "",
    date: isoDay(at),
    time: startTime,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const editable = appointment.status === "Scheduled";
  const times = TIMES.includes(startTime) ? TIMES : [startTime, ...TIMES];

  const send = async (changes) => {
    setSaving(true);
    setError("");
    try {
      await staffApi.updateAppointment(token, appointment.id, { ...changes, ...(form.notes.trim() && { notes: form.notes.trim() }) });
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const save = () => {
    const changes = {};
    const doctorId = form.doctorId ? Number(form.doctorId) : null;
    if (doctorId !== (appointment.doctorId ?? null)) changes.doctorId = doctorId;
    if (form.date !== isoDay(at) || form.time !== startTime) changes.scheduledAt = toIso(form.date, form.time);
    if (Object.keys(changes).length === 0) return onClose();
    send(changes);
  };

  const cancel = () => {
    if (window.confirm(`Cancel appointment ${appointment.ref}? The patient will be notified.`)) send({ status: "Cancelled" });
  };

  return (
    <ModalShell
      titleId="manage-appt-title"
      title={`Appointment ${appointment.ref}`}
      onClose={onClose}
      footer={
        editable ? (
          <>
            <button type="button" className={StaffStyle['st-btn']} onClick={cancel} disabled={saving}>Cancel appointment</button>
            <button type="button" className={StaffStyle['st-btn']} onClick={() => send({ status: "Completed" })} disabled={saving}>Mark completed</button>
            <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        ) : (
          <button type="button" className={StaffStyle['st-btn']} onClick={onClose}>Close</button>
        )
      }
    >
      {error && <p className={StaffStyle['st-modal__error']} role="alert">{error}</p>}

      <div className={StaffStyle['st-field']}>
        <span>Patient</span>
        <p className={StaffStyle['st-muted']} style={{ margin: 0 }}>{appointment.patient} · {appointment.patientCode}</p>
      </div>
      <div className={StaffStyle['st-field']}>
        <span>Reason</span>
        <p className={StaffStyle['st-muted']} style={{ margin: 0 }}>{appointment.reason}</p>
      </div>

      {editable ? (
        <>
          <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
            <span>Assigned doctor</span>
            <select value={form.doctorId} onChange={set("doctorId")}>
              <option value="">Unassigned</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.specialty} · {d.workStart}–{d.workEnd}</option>)}
            </select>
          </label>
          <label className={StaffStyle['st-field']}>
            <span>Date</span>
            <input type="date" min={isoDay()} value={form.date} onChange={set("date")} />
          </label>
          <label className={StaffStyle['st-field']}>
            <span>Time</span>
            <select value={form.time} onChange={set("time")}>
              {times.map((t) => <option key={t} value={t}>{timeLabel(t)}</option>)}
            </select>
          </label>
          <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
            <span>Notes</span>
            <textarea rows="3" maxLength={1000} placeholder="Optional note for the activity log…" value={form.notes} onChange={set("notes")} />
          </label>
        </>
      ) : (
        <p className={`${StaffStyle['st-muted']} ${StaffStyle['st-field--full']}`} style={{ margin: 0 }}>
          This appointment is {appointment.status.toLowerCase()} and can no longer be changed.
        </p>
      )}
    </ModalShell>
  );
}
