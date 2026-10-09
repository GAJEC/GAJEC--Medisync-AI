import React, { useState } from 'react'
import Modal from '../../common/Modal'

const OPTIONS = [
  {
    id: 'routing', required: true,
    title: 'Use my answers to route appointments',
    desc: 'Needed so the hospital can match you with the right care.',
  },
  {
    id: 'staff', required: false,
    title: 'Let authorized hospital staff review my intake',
    desc: 'Staff you are scheduled to see can read your symptom summary.',
  },
  {
    id: 'history', required: false,
    title: 'Use past conversations to personalize suggestions',
    desc: 'Previous details are always confirmed with you before reuse.',
  },
  {
    id: 'reminders', required: false,
    title: 'Send appointment reminders',
    desc: 'Reminders never include sensitive health details.',
  },
]

const ConsentModal = ({ onClose, onDone }) => {
  const [values, setValues] = useState({ routing: true, staff: true, history: false, reminders: true })

  const toggle = (id) => setValues((v) => ({ ...v, [id]: !v[id] }))

  return (
    <Modal
      title="Consent & data use"
      onClose={onClose}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onDone('Consent preferences saved')}>
            Save choices
          </button>
        </>
      }
    >
      <p className="modal__text">Review how the information you submit is used. You can change these at any time.</p>
      <div className="consent-list">
        {OPTIONS.map((o) => (
          <label key={o.id} className="consent-row">
            <span>
              <span className="consent-row__title">{o.title}</span>
              <span className="consent-row__desc">{o.desc}</span>
            </span>
            <span className="switch">
              <input
                type="checkbox"
                checked={values[o.id]}
                disabled={o.required}
                onChange={() => toggle(o.id)}
              />
              <span className="switch__track" />
            </span>
          </label>
        ))}
      </div>
    </Modal>
  )
}

export default ConsentModal