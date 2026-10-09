import React, { useState } from 'react'
import Modal from '../../common/Modal'
import { ShieldCheckIcon } from '../../common/Icons'
import ModalStyle from '../../../assets/styles/modal.module.css'
import ProfileStyle from '../../../assets/styles/profile.module.css'
import ScheduleStyle from '../../../assets/styles/schedule.module.css'
import SidebarStyle from '../../../assets/styles/sidebar.module.css'

const CHOICES = [
  { id: 'access', title: 'Request a copy of my data', desc: 'We will prepare the information we hold about you.' },
  { id: 'delete', title: 'Request deletion of eligible data', desc: 'Records the hospital must keep by law cannot be deleted.' },
]

const DataRequestModal = ({ onClose }) => {
  const [type, setType] = useState('access')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [reference] = useState(() => `HL-REQ-${Math.floor(100000 + Math.random() * 900000)}`)

  const submit = () => {
    // TODO: send to the backend.
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <Modal
        title="Request received"
        onClose={onClose}
        footer={<button className={`${ProfileStyle['btn-primary']} ${ScheduleStyle['btn-primary']}`} onClick={onClose}>Done</button>}
      >
        <div className={ProfileStyle['success-box']}>
          <ShieldCheckIcon width={16} height={16} />
          <span>
            Your {type === 'access' ? 'data access' : 'deletion'} request was submitted. Reference{' '}
            <strong>{reference}</strong>.
          </span>
        </div>
        <p className={ModalStyle['modal__text']}>
          We will confirm your identity before acting on it. Some records may be kept to meet
          retention requirements.
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      title="Access or delete eligible data"
      onClose={onClose}
      footer={
        <>
          <button className={SidebarStyle['btn-outline']} onClick={onClose}>Cancel</button>
          <button className={`${ProfileStyle['btn-primary']} ${ScheduleStyle['btn-primary']}`} onClick={submit}>Submit request</button>
        </>
      }
    >
      <div className={ProfileStyle['choice-list']} role="radiogroup" aria-label="Request type">
        {CHOICES.map((c) => (
          <label key={c.id} className={`${ProfileStyle['choice']} ${type === c.id ? ProfileStyle['choice--active'] : ''}`}>
            <input
              type="radio"
              name="data-request"
              checked={type === c.id}
              onChange={() => setType(c.id)}
            />
            <span>
              <span className={ProfileStyle['choice__title']}>{c.title}</span>
              <span className={ProfileStyle['choice__desc']}>{c.desc}</span>
            </span>
          </label>
        ))}
      </div>

      <div className={ProfileStyle['field']}>
        <label htmlFor="data-note">Details (optional)</label>
        <textarea
          id="data-note"
          className={ProfileStyle['input']}
          placeholder="Tell us what you need, such as a date range or a specific visit"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <p className={ModalStyle['modal__text']}>Requests are subject to retention requirements.</p>
    </Modal>
  )
}

export default DataRequestModal