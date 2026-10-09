import React, { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { PngIcon, ChevronRightIcon, ShieldCheckIcon } from '../../components/common/Icons'
import PersonalInfo from '../../components/patient/profile/PersonalInfo'
import MedicalInfo from '../../components/patient/profile/MedicalInfo'
import Preferences from '../../components/patient/profile/Preferences'
import SecurityPrivacy from '../../components/patient/profile/SecurityPrivacy'
import { patientApi } from '../../api/client'

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

const EDITABLE = [
  'firstname', 'lastname', 'email', 'dob', 'sex', 'mobile', 'address',
  'allergies', 'medications', 'history', 'emergencyName', 'emergencyPhone',
  'consultType', 'language',
]

// API profile -> form state (inputs need strings, not null)
const toForm = (profile) =>
  Object.fromEntries(EDITABLE.map((key) => [key, profile[key] ?? '']))

const Profile = () => {
  const { token, user, updateSessionUser, darkMode, toggleDark } = useOutletContext()
  const [section, setSection] = useState('personal')
  const [toast, setToast] = useState('')
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    let cancelled = false
    patientApi
      .profile(token)
      .then(({ profile }) => {
        if (cancelled) return
        setForm(toForm(profile))
        setSaved(toForm(profile))
      })
      .catch((err) => !cancelled && setLoadError(err.message))
    return () => {
      cancelled = true
    }
  }, [token])

  const notify = (message) => {
    setToast(message)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), 2600)
  }

  useEffect(() => {
    return () => clearTimeout(timer.current)
  }, [])

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }))

  const dirty = form && saved && EDITABLE.some((key) => form[key] !== saved[key])

  const save = async () => {
    if (!dirty || saving) return
    if (!form.firstname.trim() || !form.lastname.trim()) {
      setSection('personal')
      setSaveError('Please enter your first and last name.')
      return
    }
    // Only send what changed
    const changes = Object.fromEntries(EDITABLE.filter((k) => form[k] !== saved[k]).map((k) => [k, form[k]]))
    setSaving(true)
    setSaveError('')
    try {
      const { profile } = await patientApi.updateProfile(token, changes)
      setForm(toForm(profile))
      setSaved(toForm(profile))
      updateSessionUser({ firstname: profile.firstname, lastname: profile.lastname, email: profile.email })
      notify('Changes saved')
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const panels = form && {
    personal: <PersonalInfo form={form} patientCode={user.code} onChange={setField} />,
    medical: <MedicalInfo form={form} onChange={setField} />,
    preferences: (
      <Preferences form={form} onChange={setField} darkMode={darkMode} onToggleDark={toggleDark} />
    ),
    security: <SecurityPrivacy token={token} onNotify={notify} />,
  }

  return (
    <div className={SidebarStyle['page']}>
      <header className={SidebarStyle['page__header']}>
        <div>
          <p className={SidebarStyle['page__eyebrow']}>Your account</p>
          <h1 className={SidebarStyle['page__title']}>Profile & settings</h1>
          <p className={SidebarStyle['page__sub']}>Manage your information, preferences, and privacy.</p>
        </div>
        <button
          className={`${ProfileStyle['btn-primary']} ${ScheduleStyle['btn-primary']}`}
          onClick={save}
          disabled={!dirty || saving}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </header>

      {saveError && <p className={ProfileStyle['form-error']} role="alert">{saveError}</p>}

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

        {panels ? (
          panels[section]
        ) : (
          <p className={SidebarStyle['page__sub']} role={loadError ? 'alert' : undefined}>
            {loadError || 'Loading your profile…'}
          </p>
        )}
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
