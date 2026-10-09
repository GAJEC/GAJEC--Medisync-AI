import React from 'react'
import SectionCard from './SectionCard'
import ProfileStyle from '../../../assets/styles/profile.module.css'

const Preferences = ({ form, onChange, darkMode, onToggleDark }) => {
  return (
    <SectionCard title="Preferences" subtitle="Customize your MediSync AI experience." flush>
      <div className={ProfileStyle['pref-row']}>
        <div>
          <div className={ProfileStyle['pref-row__title']}>Dark appearance</div>
          <div className={ProfileStyle['pref-row__sub']}>Use the dark theme across the portal</div>
        </div>
        <input
          type="checkbox"
          className={ProfileStyle['checkbox']}
          checked={darkMode}
          onChange={onToggleDark}
          aria-label="Dark appearance"
        />
      </div>

      <div className={ProfileStyle['pref-row']}>
        <div>
          <div className={ProfileStyle['pref-row__title']}>Default consultation type</div>
          <div className={ProfileStyle['pref-row__sub']}>Used as a starting preference only</div>
        </div>
        <select
          className={ProfileStyle['input']}
          value={form.consultType}
          onChange={(e) => onChange('consultType', e.target.value)}
          aria-label="Default consultation type"
        >
          <option>In-person</option>
          <option>Online</option>
        </select>
      </div>

      <div className={ProfileStyle['pref-row']}>
        <div>
          <div className={ProfileStyle['pref-row__title']}>Language</div>
          <div className={ProfileStyle['pref-row__sub']}>Interface language</div>
        </div>
        <select
          className={ProfileStyle['input']}
          value={form.language}
          onChange={(e) => onChange('language', e.target.value)}
          aria-label="Language"
        >
          <option>English</option>
          <option>Filipino</option>
        </select>
      </div>
    </SectionCard>
  )
}

export default Preferences