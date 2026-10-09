import React from 'react'
import SectionCard from './SectionCard'
import Field from './Field'
import ProfileStyle from '../../../assets/styles/profile.module.css'

const MedicalInfo = ({ form, onChange }) => {
  return (
    <SectionCard title="Medical information" subtitle="Share only information relevant to your care.">
      <div className={ProfileStyle['form-grid']}>
        <Field label="Known allergies" htmlFor="allergies" full>
          <textarea
            id="allergies"
            className={ProfileStyle['input']}
            value={form.allergies}
            onChange={(e) => onChange('allergies', e.target.value)}
          />
        </Field>

        <Field label="Current medications" htmlFor="medications" full>
          <textarea
            id="medications"
            className={ProfileStyle['input']}
            placeholder="Add current medications, if relevant"
            value={form.medications}
            onChange={(e) => onChange('medications', e.target.value)}
          />
        </Field>

        <Field label="Relevant medical history" htmlFor="history" full>
          <textarea
            id="history"
            className={ProfileStyle['input']}
            placeholder="Share only what is relevant to appointment routing"
            value={form.history}
            onChange={(e) => onChange('history', e.target.value)}
          />
        </Field>

        <Field label="Emergency contact" htmlFor="emergencyName">
          <input
            id="emergencyName"
            className={ProfileStyle['input']}
            value={form.emergencyName}
            onChange={(e) => onChange('emergencyName', e.target.value)}
          />
        </Field>

        <Field label="Contact number" htmlFor="emergencyPhone">
          <input
            id="emergencyPhone"
            type="tel"
            className={ProfileStyle['input']}
            value={form.emergencyPhone}
            maxLength={30}
            onChange={(e) => onChange('emergencyPhone', e.target.value)}
          />
        </Field>
      </div>
    </SectionCard>
  )
}

export default MedicalInfo