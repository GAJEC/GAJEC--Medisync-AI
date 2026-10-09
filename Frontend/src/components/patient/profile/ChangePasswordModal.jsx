import React, { useState } from 'react'
import Modal from '../../common/Modal'
import Field from './Field'
import { authApi } from '../../../api/client'
import ModalStyle from '../../../assets/styles/modal.module.css'
import ProfileStyle from '../../../assets/styles/profile.module.css'
import ScheduleStyle from '../../../assets/styles/schedule.module.css'
import SidebarStyle from '../../../assets/styles/sidebar.module.css'

const ChangePasswordModal = ({ token, onClose, onDone }) => {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (saving) return
    if (!current) return setError('Enter your current password.')
    if (next.length < 8) return setError('Your new password must be at least 8 characters.')
    if (next.length > 128) return setError('Your new password must be at most 128 characters.')
    if (next === current) return setError('Choose a password you have not used before.')
    if (next !== confirm) return setError('The new passwords do not match.')

    setSaving(true)
    setError('')
    try {
      await authApi.changePassword(token, current, next)
      onDone('Password updated. Other devices were signed out.')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Change password"
      onClose={onClose}
      footer={
        <>
          <button className={SidebarStyle['btn-outline']} onClick={onClose}>Cancel</button>
          <button className={`${ProfileStyle['btn-primary']} ${ScheduleStyle['btn-primary']}`} onClick={submit} disabled={saving}>
            {saving ? 'Updating…' : 'Update password'}
          </button>
        </>
      }
    >
      <Field label="Current password" htmlFor="pw-current">
        <input
          id="pw-current"
          type="password"
          className={ProfileStyle['input']}
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </Field>
      <Field label="New password" htmlFor="pw-new">
        <input
          id="pw-new"
          type="password"
          className={ProfileStyle['input']}
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </Field>
      <Field label="Confirm new password" htmlFor="pw-confirm">
        <input
          id="pw-confirm"
          type="password"
          className={ProfileStyle['input']}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      <p className={ModalStyle['modal__text']}>Use at least 8 characters. You'll stay signed in on this device; other devices will be signed out.</p>
      {error && <p className={ProfileStyle['form-error']} role="alert">{error}</p>}
    </Modal>
  )
}

export default ChangePasswordModal