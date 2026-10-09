import React, { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { PngIcon, ChevronRightIcon, ShieldCheckIcon } from '../../components/common/Icons'
import PersonalInfo from '../../components/patient/profile/PersonalInfo'
import MedicalInfo from '../../components/patient/profile/MedicalInfo'
import Preferences from '../../components/patient/profile/Preferences'
import SecurityPrivacy from '../../components/patient/profile/SecurityPrivacy'

import profileIcon from '../../assets/icons/profile.png'
import heartIcon from '../../assets/icons/heart.png'
import settingsIcon from '../../assets/icons/settings.png'

import HomeStyle from '../../assets/styles/home.module.css'
import ProfileStyle from '../../assets/styles/profile.module.css'
import ScheduleStyle from '../../assets/styles/schedule.module.css'
import SidebarStyle from '../../assets/styles/sidebar.module.css'

const NAV = [
  { id: 'personal', label: 'Personal information', icon: profileIcon },
  { id: 'medical', label: 'Medical information', icon: heartIcon },
  { id: 'preferences', label: 'Preferences', icon: settingsIcon },
  { id: 'security', label: 'Security & privacy', icon: null },
]

const initialsOf = (name) =>
  name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const Profile = () => {
  const { user, updateUser, darkMode, toggleDark } = useOutletContext()
  const [section, setSection] = useState('personal')
  const [toast, setToast] = useState('')
  const timer = useRef(null)

  // Mock data. Replace with your backend later.
  const [form, setForm] = useState({
    fullName: user.name,
    patientId: user.id,
    dob: '1993-06-12',
    sex: 'Female',
    mobile: '+63 917 555 0142',
    email: 'sofia@healthlocal.demo',
    address: 'Makati City, Metro Manila',
    allergies: 'Penicillin',
    medications: '',
    history: '',
    emergencyName: 'Marco Reyes',
    emergencyPhone: '+63 917 555 0188',
    consultType: 'In-person',
    language: 'English',
  })

  const notify = (message) => {
    setToast(message)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), 2600)
  }

  useEffect(() => {
    return () => clearTimeout(timer.current)
  }, [])

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }))

  const save = () => {
    const name = form.fullName.trim() || user.name
    updateUser({ name, initials: initialsOf(name) })
    notify('Changes saved')
  }

  const panels = {
    personal: <PersonalInfo form={form} onChange={setField} />,
    medical: <MedicalInfo form={form} onChange={setField} />,
    preferences: (
      <Preferences form={form} onChange={setField} darkMode={darkMode} onToggleDark={toggleDark} />
    ),
    security: <SecurityPrivacy onNotify={notify} />,
  }

  return (
    <div className={SidebarStyle['page']}>
      <header className={SidebarStyle['page__header']}>
        <div>
          <p className={SidebarStyle['page__eyebrow']}>Your account</p>
          <h1 className={SidebarStyle['page__title']}>Profile & settings</h1>
          <p className={SidebarStyle['page__sub']}>Manage your information, preferences, and privacy.</p>
        </div>
        <button className={`${ProfileStyle['btn-primary']} ${ScheduleStyle['btn-primary']}`} onClick={save}>Save changes</button>
      </header>

      <div className={ProfileStyle['settings']}>
        <nav className={ProfileStyle['settings__nav']} aria-label="Settings sections">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`${ProfileStyle['settings__item']} ${section === item.id ? ProfileStyle['settings__item--active'] : ''}`}
              onClick={() => setSection(item.id)}
              aria-current={section === item.id ? 'page' : undefined}
            >
              {item.icon ? (
                <PngIcon src={item.icon} size={16} className={section === item.id ? HomeStyle['icon-teal'] : SidebarStyle['icon-muted']} />
              ) : (
                <ShieldCheckIcon width={16} height={16} />
              )}
              <span>{item.label}</span>
              <ChevronRightIcon width={15} height={15} />
            </button>
          ))}
        </nav>

        {panels[section]}
      </div>

      {toast && (
        <div className={ProfileStyle['toast']} role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

export default Profile