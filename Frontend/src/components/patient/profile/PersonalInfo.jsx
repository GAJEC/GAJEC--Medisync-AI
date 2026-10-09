import React from 'react'
import SectionCard from './SectionCard'
import Field from './Field'
import ProfileStyle from '../../../assets/styles/profile.module.css'

const PersonalInfo = ({ form, patientCode, onChange }) => {
  return (
    <SectionCard title="Personal information" subtitle="Used to coordinate your hospital visits.">
      <div className={ProfileStyle['form-grid']}>
        <Field label="First name" htmlFor="firstname">
          <input
            id="firstname"
            className={ProfileStyle['input']}
            value={form.firstname}
            maxLength={100}
            onChange={(e) => onChange('firstname', e.target.value)}
            autoComplete="given-name"
          />
        </Field>

        <Field label="Last name" htmlFor="lastname">
          <input
            id="lastname"
            className={ProfileStyle['input']}
            value={form.lastname}
            maxLength={100}
            onChange={(e) => onChange('lastname', e.target.value)}
            autoComplete="family-name"
          />
        </Field>

        <Field label="Patient ID" htmlFor="patientId">
          <input id="patientId" className={ProfileStyle['input']} value={patientCode} readOnly />
        </Field>

        <Field label="Date of birth" htmlFor="dob">
          <input
            id="dob"
            type="date"
            className={ProfileStyle['input']}
            value={form.dob}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => onChange('dob', e.target.value)}
          />
        </Field>

        <Field label="Sex" htmlFor="sex">
          <select
            id="sex"
            className={ProfileStyle['input']}
            value={form.sex}
            onChange={(e) => onChange('sex', e.target.value)}
          >
            <option value="">Select…</option>
            <option>Female</option>
            <option>Male</option>
            <option>Prefer not to say</option>
          </select>
        </Field>

        <Field label="Mobile number" htmlFor="mobile">
          <input
            id="mobile"
            type="tel"
            className={ProfileStyle['input']}
            value={form.mobile}
            maxLength={30}
            onChange={(e) => onChange('mobile', e.target.value)}
            autoComplete="tel"
          />
        </Field>

        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            className={ProfileStyle['input']}
            value={form.email}
            onChange={(e) => onChange('email', e.target.value)}
            autoComplete="email"
          />
        </Field>

        <Field label="Address (optional)" htmlFor="address" full>
          <input
            id="address"
            className={ProfileStyle['input']}
            value={form.address}
            maxLength={255}
            onChange={(e) => onChange('address', e.target.value)}
            autoComplete="street-address"
          />
        </Field>
      </div>
    </SectionCard>
  )
}

export default PersonalInfo