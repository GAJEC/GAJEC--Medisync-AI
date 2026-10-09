import React, { useState } from 'react'
import Modal from '../../common/Modal'
import Field from './Field'

const ChangePasswordModal = ({ onClose, onDone }) => {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    if (!current) return setError('Enter your current password.')
    if (next.length < 8) return setError('Your new password must be at least 8 characters.')
    if (next === current) return setError('Choose a password you have not used before.')
    if (next !== confirm) return setError('The new passwords do not match.')
    // TODO: send to the backend.
    onDone('Password updated')
  }

  return (
    <Modal
      title="Change password"
      onClose={onClose}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Update password</button>
        </>
      }
    >
      <Field label="Current password" htmlFor="pw-current">
        <input
          id="pw-current"
          type="password"
          className="input"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </Field>
      <Field label="New password" htmlFor="pw-new">
        <input
          id="pw-new"
          type="password"
          className="input"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </Field>
      <Field label="Confirm new password" htmlFor="pw-confirm">
        <input
          id="pw-confirm"
          type="password"
          className="input"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      <p className="modal__text">Use at least 8 characters. You'll stay signed in on this device.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  )
}

export default ChangePasswordModal