import React from 'react'
import SectionCard from './SectionCard'
import Field from './Field'

const MedicalInfo = ({ form, onChange }) => {
  return (
    <SectionCard title="Medical information" subtitle="Share only information relevant to your care.">
      <div className="form-grid">
        <Field label="Known allergies" htmlFor="allergies" full>
          <textarea
            id="allergies"
            className="input"
            value={form.allergies}
            onChange={(e) => onChange('allergies', e.target.value)}
          />
        </Field>

        <Field label="Current medications" htmlFor="medications" full>
          <textarea
            id="medications"
            className="input"
            placeholder="Add current medications, if relevant"
            value={form.medications}
            onChange={(e) => onChange('medications', e.target.value)}
          />
        </Field>

        <Field label="Relevant medical history" htmlFor="history" full>
          <textarea
            id="history"
            className="input"
            placeholder="Share only what is relevant to appointment routing"
            value={form.history}
            onChange={(e) => onChange('history', e.target.value)}
          />
        </Field>

        <Field label="Emergency contact" htmlFor="emergencyName">
          <input
            id="emergencyName"
            className="input"
            value={form.emergencyName}
            onChange={(e) => onChange('emergencyName', e.target.value)}
          />
        </Field>

        <Field label="Contact number" htmlFor="emergencyPhone">
          <input
            id="emergencyPhone"
            type="tel"
            className="input"
            value={form.emergencyPhone}
            onChange={(e) => onChange('emergencyPhone', e.target.value)}
          />
        </Field>
      </div>
    </SectionCard>
  )
}

export default MedicalInfo