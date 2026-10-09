
import { useEffect, useMemo, useState } from "react";

import searchIcon from "../../assets/icons/search.png";
import StaffStyle from "../../assets/styles/Staff.module.css";

const specialties = [
  "Internal Medicine",
  "Family Medicine",
  "Pediatrics",
  "Neurology",
  "Cardiology",
  "Emergency Medicine",
  "Dermatology",
  "Obstetrics and Gynecology",
  "Orthopedics",
  "Ophthalmology",
  "Otolaryngology (ENT)",
  "Psychiatry",
  "General Surgery",
  "Anesthesiology",
  "Radiology",
  "Pathology",
  "Pulmonology",
  "Gastroenterology",
  "Nephrology",
  "Endocrinology",
  "Oncology",
  "Infectious Disease",
  "Rheumatology",
  "Urology",
  "Physical Medicine and Rehabilitation",
  "Geriatrics",
  "Hematology",
  "Plastic Surgery",
  "Thoracic Surgery",
  "Vascular Surgery",
  "Neurosurgery",
  "Pain Medicine",
  "Preventive Medicine",
];

const availabilities = [
  "Available",
  "In consultation",
  "On leave",
];

const consultationTypes = [
  "In-person and Online",
  "In-person only",
  "Online only",
];

const avatarTones = [
  "#c0392b",
  "#2f6f8f",
  "#7a8f9e",
  "#4f46a5",
  "#0f766e",
  "#b7791f",
];

const initialDoctors = [
  {
    id: 1,
    name: "Dr. Maria Santos",
    specialty: "Internal Medicine",
    department: "Adult Medicine",
    today: 8,
    availability: "Available",
    license: "PRC-MD-102938",
    email: "doctor@stgabriel.demo",
    consultation: "In-person and Online",
    intro:
      "Experienced in evaluating general symptoms and coordinating whole-person care.",
  },
  {
    id: 2,
    name: "Dr. Daniel Reyes",
    specialty: "Family Medicine",
    department: "Primary Care",
    today: 6,
    availability: "In consultation",
    license: "",
    email: "",
    consultation: "In-person and Online",
    intro: "",
  },
  {
    id: 3,
    name: "Dr. Angela Cruz",
    specialty: "Pediatrics",
    department: "Child Health",
    today: 5,
    availability: "Available",
    license: "",
    email: "",
    consultation: "In-person and Online",
    intro: "",
  },
  {
    id: 4,
    name: "Dr. Gabriel Mendoza",
    specialty: "Neurology",
    department: "Neurosciences",
    today: 7,
    availability: "On leave",
    license: "",
    email: "",
    consultation: "In-person and Online",
    intro: "",
  },
];

const slug = (value) =>
  value.toLowerCase().replace(/\s+/g, "-");

const unique = (key, list) =>
  [...new Set(list.map((item) => item[key]))];

const initials = (name) =>
  name
    .replace(/^Dr\.\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

export default function Doctors() {
  const [doctors, setDoctors] = useState(initialDoctors);
  const [query, setQuery] = useState("");

  const [filters, setFilters] = useState({
    specialty: "",
    department: "",
    availability: "",
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const setFilter = (key) => (event) => {
    setFilters((previous) => ({
      ...previous,
      [key]: event.target.value,
    }));
  };

  const visibleDoctors = useMemo(() => {
    const search = query.trim().toLowerCase();

    return doctors.filter(
      (doctor) =>
        (!search ||
          doctor.name.toLowerCase().includes(search) ||
          doctor.specialty.toLowerCase().includes(search) ||
          doctor.department.toLowerCase().includes(search)) &&
        (!filters.specialty ||
          doctor.specialty === filters.specialty) &&
        (!filters.department ||
          doctor.department === filters.department) &&
        (!filters.availability ||
          doctor.availability === filters.availability)
    );
  }, [doctors, query, filters]);

  const handleAddDoctor = (form) => {
    const name = form.name.trim();

    const newDoctor = {
      ...form,
      id: Date.now(),
      name: /^Dr\.\s*/i.test(name) ? name : `Dr. ${name}`,
      department: form.department.trim() || form.specialty,
      today: 0,
      availability: "Available",
    };

    setDoctors((previous) => [...previous, newDoctor]);
    setShowAddModal(false);
  };

  const handleSaveProfile = (updatedDoctor) => {
    setDoctors((previous) =>
      previous.map((doctor) =>
        doctor.id === updatedDoctor.id
          ? { ...doctor, ...updatedDoctor }
          : doctor
      )
    );

    setSelectedDoctor(null);
  };

  return (
    <div className={StaffStyle['st-page']}>
      <div className={StaffStyle['st-pagehead']}>
        <div>
          <h1 className={StaffStyle['st-title']}>Doctor Management</h1>
          <p className={StaffStyle['st-sub']}>
            Manage verified hospital doctors, profiles, and availability.
          </p>
        </div>

        <div className={StaffStyle['st-actions']}>
          <button
            type="button"
            className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`}
            onClick={() => setShowAddModal(true)}
          >
            <span className={StaffStyle['st-btn__plus']} aria-hidden="true">
              +
            </span>
            Add doctor
          </button>
        </div>
      </div>

      <div className={StaffStyle['st-filters']}>
        <label className={StaffStyle['st-searchbox']}>
          <img src={searchIcon} alt="" className={StaffStyle['st-btn__ico']} />
          <input
            type="search"
            placeholder="Search doctors"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <select
          className={StaffStyle['st-select']}
          value={filters.specialty}
          onChange={setFilter("specialty")}
          aria-label="Filter by specialty"
        >
          <option value="">All specialties</option>
          {unique("specialty", doctors).map((specialty) => (
            <option key={specialty} value={specialty}>
              {specialty}
            </option>
          ))}
        </select>

        <select
          className={StaffStyle['st-select']}
          value={filters.department}
          onChange={setFilter("department")}
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {unique("department", doctors).map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>

        <select
          className={StaffStyle['st-select']}
          value={filters.availability}
          onChange={setFilter("availability")}
          aria-label="Filter by availability"
        >
          <option value="">All availability</option>
          {availabilities.map((availability) => (
            <option key={availability} value={availability}>
              {availability}
            </option>
          ))}
        </select>
      </div>

      <section className={StaffStyle['st-docgrid']}>
        {visibleDoctors.map((doctor, index) => (
          <article className={`${StaffStyle['st-card']} ${StaffStyle['st-doc']}`} key={doctor.id}>
            <div className={StaffStyle['st-doc__avatarwrap']}>
              {doctor.photo ? (
                <img
                  src={doctor.photo}
                  alt={doctor.name}
                  className={StaffStyle['st-doc__avatar']}
                />
              ) : (
                <span
                  className={StaffStyle['st-doc__avatar']}
                  style={{
                    background:
                      avatarTones[index % avatarTones.length],
                  }}
                >
                  {initials(doctor.name)}
                </span>
              )}

              <i
                className={`${StaffStyle['st-doc__dot']} ${StaffStyle[`st-doc__dot--${slug(
                  doctor.availability
                )}`]}`}
              />
            </div>

            <h2 className={StaffStyle['st-doc__name']}>{doctor.name}</h2>
            <p className={StaffStyle['st-doc__spec']}>{doctor.specialty}</p>
            <p className={StaffStyle['st-doc__dept']}>{doctor.department}</p>

            <div className={StaffStyle['st-doc__stats']}>
              <div>
                <strong>{doctor.today}</strong>
                <small>Appointments today</small>
              </div>

              <span
                className={`${StaffStyle['st-pill']} ${StaffStyle[`st-pill--${slug(
                  doctor.availability
                )}`]}`}
              >
                {doctor.availability}
              </span>
            </div>

            <div className={StaffStyle['st-doc__actions']}>
              <button
                type="button"
                className={StaffStyle['st-btn']}
                onClick={() => setSelectedDoctor({ ...doctor })}
              >
                View profile
              </button>

              <button
                type="button"
                className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--icon']}`}
                aria-label={`View profile for ${doctor.name}`}
                onClick={() => setSelectedDoctor({ ...doctor })}
              >
                ···
              </button>
            </div>
          </article>
        ))}

        {visibleDoctors.length === 0 && (
          <p className={`${StaffStyle['st-empty']} ${StaffStyle['st-empty--grid']}`}>
            No doctors match these filters. Clear a filter or change your search.
          </p>
        )}
      </section>

      {showAddModal && (
        <DoctorModal
          title="Add doctor"
          submitLabel="Add doctor"
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddDoctor}
        />
      )}

      {selectedDoctor && (
        <DoctorModal
          key={selectedDoctor.id}
          title="Doctor profile"
          submitLabel="Save changes"
          doctor={selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          onSubmit={handleSaveProfile}
        />
      )}
    </div>
  );
}

function DoctorModal({
  title,
  submitLabel,
  doctor,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({
    id: doctor?.id,
    name: doctor?.name || "",
    specialty: doctor?.specialty || specialties[0],
    department: doctor?.department || "",
    license: doctor?.license || "",
    email: doctor?.email || "",
    consultation: doctor?.consultation || consultationTypes[0],
    intro: doctor?.intro || "",
    today: doctor?.today ?? 0,
    availability: doctor?.availability || "Available",
    photo: doctor?.photo || "",
  });

  const updateField = (key) => (event) => {
    setForm((previous) => ({
      ...previous,
      [key]: event.target.value,
    }));
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.name.trim()) return;

    onSubmit({
      ...form,
      name: /^Dr\.\s*/i.test(form.name.trim())
        ? form.name.trim()
        : `Dr. ${form.name.trim()}`,
      department: form.department.trim() || form.specialty,
    });
  };

  return (
    <div
      className={StaffStyle['st-overlay']}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className={StaffStyle['st-modal']}
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctor-modal-title"
        onSubmit={handleSubmit}
      >
        <header className={StaffStyle['st-modal__head']}>
          <div>
            <p className={StaffStyle['st-modal__brand']}>MediSync AI</p>
            <h2 id="doctor-modal-title" className={StaffStyle['st-modal__title']}>
              {title}
            </h2>
          </div>

          <button
            type="button"
            className={StaffStyle['st-modal__close']}
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </header>

        <div className={StaffStyle['st-modal__body']}>
          <label className={StaffStyle['st-field']}>
            <span>Full name</span>
            <input
              value={form.name}
              onChange={updateField("name")}
              placeholder="Dr. Full Name"
              required
              autoFocus
            />
          </label>

          <label className={StaffStyle['st-field']}>
            <span>Specialty</span>
            <select
              value={form.specialty}
              onChange={updateField("specialty")}
              required
            >
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
          </label>

          <label className={StaffStyle['st-field']}>
            <span>Department</span>
            <input
              value={form.department}
              onChange={updateField("department")}
              placeholder="Enter department"
            />
          </label>

          <label className={StaffStyle['st-field']}>
            <span>License / registration</span>
            <input
              value={form.license}
              onChange={updateField("license")}
              placeholder="PRC-MD-102938"
            />
          </label>

          <label className={StaffStyle['st-field']}>
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={updateField("email")}
              placeholder="doctor@stgabriel.demo"
            />
          </label>

          <label className={StaffStyle['st-field']}>
            <span>Consultation types</span>
            <select
              value={form.consultation}
              onChange={updateField("consultation")}
            >
              {consultationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className={`${StaffStyle['st-field']} ${StaffStyle['st-field--full']}`}>
            <span>Professional introduction</span>
            <textarea
              rows="4"
              value={form.intro}
              onChange={updateField("intro")}
              placeholder="Write a professional introduction..."
            />
          </label>
        </div>

        <footer className={StaffStyle['st-modal__foot']}>
          <button
            type="button"
            className={StaffStyle['st-btn']}
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className={`${StaffStyle['st-btn']} ${StaffStyle['st-btn--primary']}`}
            disabled={!form.name.trim()}
          >
            {submitLabel}
          </button>
        </footer>
      </form>
    </div>
  );
}
