import { useMemo, useState } from "react";

import { staffApi } from "../../api/client";
import { useDebounced, useStaffData } from "../../components/staff/useStaffData";
import ModalShell from "../../components/staff/ModalShell";

import searchIcon from "../../assets/icons/search.png";
import StaffStyle from "../../assets/styles/Staff.module.css";

const specialties = [
  "Internal Medicine", "Family Medicine", "Pediatrics", "Neurology", "Cardiology", "Emergency Medicine",
  "Dermatology", "Obstetrics and Gynecology", "Orthopedics", "Ophthalmology", "Otolaryngology (ENT)",
  "Psychiatry", "General Surgery", "Anesthesiology", "Radiology", "Pathology", "Pulmonology",
  "Gastroenterology", "Nephrology", "Endocrinology", "Oncology", "Infectious Disease", "Rheumatology",
  "Urology", "Physical Medicine and Rehabilitation", "Geriatrics", "Hematology", "Plastic Surgery",
  "Thoracic Surgery", "Vascular Surgery", "Neurosurgery", "Pain Medicine", "Preventive Medicine",
];

const availabilities = ["Available", "In consultation", "On leave", "Inactive"];
const avatarTones = ["#c0392b", "#2f6f8f", "#7a8f9e", "#4f46a5", "#0f766e", "#b7791f"];

const slug = (value) => value.toLowerCase().replace(/\s+/g, "-");
const initials = (name) =>
  name.replace(/^Dr\.\s*/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

export default function Doctors() {
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());
  const [filters, setFilters] = useState({ specialty: "", departmentId: "", availability: "" });
  const [modal, setModal] = useState(null); // null | { mode: "add" } | { mode: "edit", doctor }

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const { data, error, loading, reload, token } = useStaffData(
    (t) => staffApi.doctors(t, {
      search,
      specialty: filters.specialty,
      departmentId: filters.departmentId,
      includeInactive: filters.availability === "Inactive" ? true : undefined,
    }),
    [search, filters.specialty, filters.departmentId, filters.availability],
  );
  const departmentsData = useStaffData((t) => staffApi.departments(t));
  const departments = departmentsData.data?.departments ?? [];

  const doctors = useMemo(() => data?.doctors ?? [], [data]);
  const visible = useMemo(
    () => doctors.filter((d) => !filters.availability || d.availability === filters.availability),
    [doctors, filters.availability],
  );
  const specialtyOptions = useMemo(
    () => [...new Set([...doctors.map((d) => d.specialty), ...specialties])].sort(),
    [doctors],
  );

  const done = () => {
    setModal(null);
    reload();
  };

  return (
    <div className={StaffStyle['st-page']}>
      <div className={StaffStyle['st-pagehead']}>
        <div>
          <h1 className={StaffStyle['st-title']}>Doctor Management</h1>
          <p className={StaffStyle['st-sub']}>Manage verified hospital doctors, profiles, and availability.</p>
        </div>
        <div className={StaffStyle['st-actions']}>
          <button type="button" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} onClick={() => setModal({ mode: "add" })}>
            <span className={StaffStyle['st-btn__plus']} aria-hidden="true">+</span>
            Add doctor
          </button>
        </div>
      </div>

      <div className={StaffStyle['st-filters']}>
        <label className={StaffStyle['st-searchbox']}>
          <img src={searchIcon} alt="" className={StaffStyle['st-btn__ico']} />
          <input type="search" placeholder="Search doctors" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>

        <select className={StaffStyle['st-select']} value={filters.specialty} onChange={setFilter("specialty")} aria-label="Filter by specialty">
          <option value="">All specialties</option>
          {specialtyOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className={StaffStyle['st-select']} value={filters.departmentId} onChange={setFilter("departmentId")} aria-label="Filter by department">
          <option value="">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select className={StaffStyle['st-select']} value={filters.availability} onChange={setFilter("availability")} aria-label="Filter by availability">
          <option value="">All availability</option>
          {availabilities.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {error && <p className={StaffStyle['st-alert']} role="alert">{error}</p>}

      <section className={`${StaffStyle['st-docgrid']} ${loading ? StaffStyle['st-loading'] : ""}`}>
        {visible.map((doctor, index) => (
          <article className={`${StaffStyle['st-card']} ${StaffStyle['st-doc']}`} key={doctor.id}>
            <div className={StaffStyle['st-doc__avatarwrap']}>
              <span className={StaffStyle['st-doc__avatar']} style={{ background: avatarTones[index % avatarTones.length] }}>
                {initials(doctor.name)}
              </span>
              <i className={`${StaffStyle['st-doc__dot']} ${StaffStyle[`st-doc__dot--${slug(doctor.availability)}`] || ""}`} />
            </div>

            <h2 className={StaffStyle['st-doc__name']}>{doctor.name}</h2>
            <p className={StaffStyle['st-doc__spec']}>{doctor.specialty}</p>
            <p className={StaffStyle['st-doc__dept']}>{doctor.department || "No department"}</p>

            <div className={StaffStyle['st-doc__stats']}>
              <div>
                <strong>{doctor.today}</strong>
                <small>Appointments today</small>
              </div>
              <span className={`${StaffStyle['st-pill']} ${StaffStyle[`st-pill--${slug(doctor.availability)}`] || ""}`}>
                {doctor.availability}
              </span>
            </div>

            <div className={StaffStyle['st-doc__actions']}>
              <button type="button" className={StaffStyle['st-btn']} onClick={() => setModal({ mode: "edit", doctor })}>
                View profile
              </button>
            </div>
          </article>
        ))}

        {!loading && visible.length === 0 && (
          <p className={`${StaffStyle['st-empty']} ${StaffStyle['st-empty--grid']}`}>
            {search || Object.values(filters).some(Boolean)
              ? "No doctors match these filters. Clear a filter or change your search."
              : "No doctors yet. Add the first one."}
          </p>
        )}
      </section>

      {modal && (
        <DoctorModal
          key={modal.doctor?.id ?? "new"}
          token={token}
          doctor={modal.doctor}
          departments={departments}
          onClose={() => setModal(null)}
          onDone={done}
        />
      )}
    </div>
  );
}

function DoctorModal({ token, doctor, departments, onClose, onDone }) {
  const editing = Boolean(doctor);
  const [form, setForm] = useState({
    name: doctor?.name || "",
    specialty: doctor?.specialty || specialties[0],
    departmentId: doctor?.departmentId ? String(doctor.departmentId) : "",
    license: doctor?.license || "",
    email: doctor?.email || "",
    intro: doctor?.intro || "",
    workStart: doctor?.workStart || "08:00",
    workEnd: doctor?.workEnd || "17:00",
    active: doctor ? doctor.active : true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const specialtyChoices = specialties.includes(form.specialty) ? specialties : [form.specialty, ...specialties];

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    if (form.workStart >= form.workEnd) return setError("Working hours must end after they start.");

    const body = {
      name: form.name.trim(),
      specialty: form.specialty,
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      license: form.license.trim(),
      email: form.email.trim(),
      intro: form.intro.trim(),
      workStart: form.workStart,
      workEnd: form.workEnd,
    };
    if (editing) body.active = form.active;

    setSaving(true);
    setError("");
    try {
      if (editing) await staffApi.updateDoctor(token, doctor.id, body);
      else await staffApi.createDoctor(token, body);
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <ModalShell
      as="form"
      onSubmit={submit}
      titleId="doctor-modal-title"
      title={editing ? "Doctor profile" : "Add doctor"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={StaffStyle['st-btn']} onClick={onClose}>Cancel</button>
          <button type="submit" className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`} disabled={!form.name.trim() || saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add doctor"}
          </button>
        </>
      }
    >
      {error && <p className={StaffStyle['st-modal__error']} role="alert">{error}</p>}

      <label className={StaffStyle['st-field']}>
        <span>Full name</span>
        <input value={form.name} onChange={update("name")} placeholder="Dr. Full Name" maxLength={150} required autoFocus />
      </label>

      <label className={StaffStyle['st-field']}>
        <span>Specialty</span>
        <select value={form.specialty} onChange={update("specialty")} required>
          {specialtyChoices.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label className={StaffStyle['st-field']}>
        <span>Department</span>
        <select value={form.departmentId} onChange={update("departmentId")}>
          <option value="">No department</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </label>

      <label className={StaffStyle['st-field']}>
        <span>License / registration</span>
        <input value={form.license} onChange={update("license")} placeholder="PRC-MD-000000" maxLength={60} />
      </label>

      <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
        <span>Email</span>
        <input type="email" value={form.email} onChange={update("email")} placeholder="doctor@hospital.com" maxLength={255} />
      </label>

      <label className={StaffStyle['st-field']}>
        <span>Working hours start</span>
        <input type="time" value={form.workStart} onChange={update("workStart")} required />
      </label>

      <label className={StaffStyle['st-field']}>
        <span>Working hours end</span>
        <input type="time" value={form.workEnd} onChange={update("workEnd")} required />
      </label>

      {editing && (
        <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
          <span>Status</span>
          <select value={form.active ? "active" : "inactive"} onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === "active" }))}>
            <option value="active">Active (bookable)</option>
            <option value="inactive">Inactive (hidden from booking)</option>
          </select>
        </label>
      )}

      <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
        <span>Professional introduction</span>
        <textarea rows="4" maxLength={2000} value={form.intro} onChange={update("intro")} placeholder="Write a professional introduction..." />
      </label>
    </ModalShell>
  );
}
