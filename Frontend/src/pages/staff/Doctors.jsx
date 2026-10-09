import { useEffect, useMemo, useState } from "react";
import "./Staff.css";
import searchIcon from "../../assets/icons/search.png";

const initialDoctors = [
  { id: 1, name: "Dr. Maria Santos", specialty: "Internal Medicine", department: "Adult Medicine", today: 8, availability: "Available" },
  { id: 2, name: "Dr. Daniel Reyes", specialty: "Family Medicine", department: "Primary Care", today: 6, availability: "In consultation" },
  { id: 3, name: "Dr. Angela Cruz", specialty: "Pediatrics", department: "Child Health", today: 5, availability: "Available" },
  { id: 4, name: "Dr. Gabriel Mendoza", specialty: "Neurology", department: "Neurosciences", today: 7, availability: "On leave" },
];

const specialties = ["Internal Medicine", "Family Medicine", "Pediatrics", "Neurology", "Cardiology", "Emergency"];
const availabilities = ["Available", "In consultation", "On leave"];
const consultationTypes = ["In-person and Online", "In-person only", "Online only"];
const avatarTones = ["#c0392b", "#2f6f8f", "#7a8f9e", "#4f46a5", "#0f766e", "#b7791f"];

const slug = (s) => s.toLowerCase().replace(/\s+/g, "-");
const unique = (key, list) => [...new Set(list.map((d) => d[key]))];
const initials = (name) =>
  name.replace(/^dr\.?\s*/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

export default function Doctors() {
  const [doctors, setDoctors] = useState(initialDoctors);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ specialty: "", department: "", availability: "" });
  const [open, setOpen] = useState(false);

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter(
      (d) =>
        (!q || d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q)) &&
        (!filters.specialty || d.specialty === filters.specialty) &&
        (!filters.department || d.department === filters.department) &&
        (!filters.availability || d.availability === filters.availability)
    );
  }, [doctors, query, filters]);

  const handleAdd = (form) => {
    const name = form.name.trim();
    setDoctors((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`,
        specialty: form.specialty,
        department: form.department.trim() || form.specialty,
        today: 0,
        availability: "Available",
        license: form.license,
        email: form.email,
        consultation: form.consultation,
        intro: form.intro,
      },
    ]);
    setOpen(false);
  };

  return (
    <div className="st-page">
      {/* ---------- Title ---------- */}
      <div className="st-pagehead">
        <div>
          <h1 className="st-title">Doctor Management</h1>
          <p className="st-sub">Manage verified hospital doctors, profiles, and availability.</p>
        </div>
        <div className="st-actions">
          <button type="button" className="st-btn st-btn--primary" onClick={() => setOpen(true)}>
            <span className="st-btn__plus" aria-hidden="true">+</span> Add doctor
          </button>
        </div>
      </div>

      {/* ---------- Filters ---------- */}
      <div className="st-filters">
        <label className="st-searchbox">
          <img src={searchIcon} alt="" className="st-btn__ico" />
          <input type="search" placeholder="Search doctors" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <select className="st-select" value={filters.specialty} onChange={setFilter("specialty")} aria-label="Filter by specialty">
          <option value="">All specialties</option>
          {unique("specialty", doctors).map((v) => <option key={v}>{v}</option>)}
        </select>
        <select className="st-select" value={filters.department} onChange={setFilter("department")} aria-label="Filter by department">
          <option value="">All departments</option>
          {unique("department", doctors).map((v) => <option key={v}>{v}</option>)}
        </select>
        <select className="st-select" value={filters.availability} onChange={setFilter("availability")} aria-label="Filter by availability">
          <option value="">All availability</option>
          {availabilities.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>

      {/* ---------- Doctor cards ---------- */}
      <section className="st-docgrid">
        {visible.map((d, i) => (
          <article className="st-card st-doc" key={d.id}>
            <div className="st-doc__avatarwrap">
              {d.photo ? (
                <img src={d.photo} alt="" className="st-doc__avatar" />
              ) : (
                <span className="st-doc__avatar" style={{ background: avatarTones[i % avatarTones.length] }}>
                  {initials(d.name)}
                </span>
              )}
              <i className={`st-doc__dot st-doc__dot--${slug(d.availability)}`} />
            </div>

            <h2 className="st-doc__name">{d.name}</h2>
            <p className="st-doc__spec">{d.specialty}</p>
            <p className="st-doc__dept">{d.department}</p>

            <div className="st-doc__stats">
              <div>
                <strong>{d.today}</strong>
                <small>Appointments today</small>
              </div>
              <span className={`st-pill st-pill--${slug(d.availability)}`}>{d.availability}</span>
            </div>

            <div className="st-doc__actions">
              <button type="button" className="st-btn">View profile</button>
              <button type="button" className="st-btn st-btn--icon" aria-label={`More actions for ${d.name}`}>···</button>
            </div>
          </article>
        ))}
        {visible.length === 0 && (
          <p className="st-empty st-empty--grid">No doctors match these filters. Clear a filter or change your search.</p>
        )}
      </section>

      {open && <AddDoctorModal onClose={() => setOpen(false)} onAdd={handleAdd} />}
    </div>
  );
}

/* ---------- Pop-up ---------- */
function AddDoctorModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: "", specialty: specialties[0], department: "", license: "", email: "",
    consultation: consultationTypes[0], intro: "",
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="st-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="st-modal" role="dialog" aria-modal="true" aria-labelledby="add-doc-title">
        <header className="st-modal__head">
          <div>
            <p className="st-modal__brand">HealthLocal AI</p>
            <h2 id="add-doc-title" className="st-modal__title">Add doctor</h2>
          </div>
          <button type="button" className="st-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="st-modal__body">
          <label className="st-field">
            <span>Full name</span>
            <input placeholder="Dr. Full Name" value={form.name} onChange={set("name")} autoFocus />
          </label>
          <label className="st-field">
            <span>Specialty</span>
            <select value={form.specialty} onChange={set("specialty")}>
              {specialties.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>

          <label className="st-field">
            <span>Department</span>
            <input value={form.department} onChange={set("department")} />
          </label>
          <label className="st-field">
            <span>License / registration</span>
            <input placeholder="PRC-MD-102938" value={form.license} onChange={set("license")} />
          </label>

          <label className="st-field">
            <span>Email</span>
            <input type="email" placeholder="doctor@stgabriel.demo" value={form.email} onChange={set("email")} />
          </label>
          <label className="st-field">
            <span>Consultation types</span>
            <select value={form.consultation} onChange={set("consultation")}>
              {consultationTypes.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>

          <label className="st-field st-field--full">
            <span>Professional introduction</span>
            <textarea rows="4" value={form.intro} onChange={set("intro")} />
          </label>
        </div>

        <footer className="st-modal__foot">
          <button type="button" className="st-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="st-btn st-btn--primary" disabled={!form.name.trim()} onClick={() => onAdd(form)}>
            Add doctor
          </button>
        </footer>
      </div>
    </div>
  );
}