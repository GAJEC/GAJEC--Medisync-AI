import React from 'react'
import SectionCard from './SectionCard'
import Field from './Field'
import ProfileStyle from '../../../assets/styles/profile.module.css'

const PersonalInfo = ({ form, onChange }) => {
  return (
    <SectionCard title="Personal information" subtitle="Used to coordinate your hospital visits.">
      <div className={ProfileStyle['form-grid']}>
        <Field label="Full name" htmlFor="fullName">
          <input
            id="fullName"
            className={ProfileStyle['input']}
            value={form.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
            autoComplete="name"
          />
        </Field>

        <Field label="Patient ID" htmlFor="patientId">
          <input id="patientId" className={ProfileStyle['input']} value={form.patientId} readOnly />
        </Field>

        <Field label="Date of birth" htmlFor="dob">
          <input
            id="dob"
            type="date"
            className={ProfileStyle['input']}
            value={form.dob}
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
            onChange={(e) => onChange('address', e.target.value)}
            autoComplete="street-address"
          />
        </Field>
      </div>
    </SectionCard>
  )
}

export default PersonalInfo