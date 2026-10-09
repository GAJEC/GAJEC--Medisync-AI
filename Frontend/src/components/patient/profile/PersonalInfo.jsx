import React from 'react'
import SectionCard from './SectionCard'
import Field from './Field'

const PersonalInfo = ({ form, onChange }) => {
  return (
    <SectionCard title="Personal information" subtitle="Used to coordinate your hospital visits.">
      <div className="form-grid">
        <Field label="Full name" htmlFor="fullName">
          <input
            id="fullName"
            className="input"
            value={form.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
            autoComplete="name"
          />
        </Field>

        <Field label="Patient ID" htmlFor="patientId">
          <input id="patientId" className="input" value={form.patientId} readOnly />
        </Field>

        <Field label="Date of birth" htmlFor="dob">
          <input
            id="dob"
            type="date"
            className="input"
            value={form.dob}
            onChange={(e) => onChange('dob', e.target.value)}
          />
        </Field>

        <Field label="Sex" htmlFor="sex">
          <select
            id="sex"
            className="input"
            value={form.sex}
            onChange={(e) => onChange('sex', e.target.value)}
          >
            <option>Female</option>
            <option>Male</option>
            <option>Prefer not to say</option>
          </select>
        </Field>

        <Field label="Mobile number" htmlFor="mobile">
          <input
            id="mobile"
            type="tel"
            className="input"
            value={form.mobile}
            onChange={(e) => onChange('mobile', e.target.value)}
            autoComplete="tel"
          />
        </Field>

        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => onChange('email', e.target.value)}
            autoComplete="email"
          />
        </Field>

        <Field label="Address (optional)" htmlFor="address" full>
          <input
            id="address"
            className="input"
            value={form.address}
            onChange={(e) => onChange('address', e.target.value)}
            autoComplete="street-address"
          />
        </Field>
      </div>
    </SectionCard>
  )
}

export default PersonalInfo