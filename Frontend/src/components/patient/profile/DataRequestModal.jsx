import React, { useState } from 'react'
import Modal from '../../common/Modal'
import { ShieldCheckIcon } from '../../common/Icons'

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
        footer={<button className="btn-primary" onClick={onClose}>Done</button>}
      >
        <div className="success-box">
          <ShieldCheckIcon width={16} height={16} />
          <span>
            Your {type === 'access' ? 'data access' : 'deletion'} request was submitted. Reference{' '}
            <strong>{reference}</strong>.
          </span>
        </div>
        <p className="modal__text">
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
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Submit request</button>
        </>
      }
    >
      <div className="choice-list" role="radiogroup" aria-label="Request type">
        {CHOICES.map((c) => (
          <label key={c.id} className={`choice ${type === c.id ? 'choice--active' : ''}`}>
            <input
              type="radio"
              name="data-request"
              checked={type === c.id}
              onChange={() => setType(c.id)}
            />
            <span>
              <span className="choice__title">{c.title}</span>
              <span className="choice__desc">{c.desc}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="field">
        <label htmlFor="data-note">Details (optional)</label>
        <textarea
          id="data-note"
          className="input"
          placeholder="Tell us what you need, such as a date range or a specific visit"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <p className="modal__text">Requests are subject to retention requirements.</p>
    </Modal>
  )
}

export default DataRequestModal