import React from 'react'
import Modal from '../../common/Modal'

const SESSIONS = [
  { id: 1, device: 'Chrome on Windows', place: 'Manila, Philippines', when: 'Active now', current: true },
]

const SessionsModal = ({ onClose }) => {
  const hasOthers = SESSIONS.some((s) => !s.current)

  return (
    <Modal
      title="Active sessions"
      onClose={onClose}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Close</button>
          <button className="btn-primary" disabled={!hasOthers}>Sign out other sessions</button>
        </>
      }
    >
      <p className="modal__text">Devices that are currently signed in to your account.</p>
      <div className="session-list">
        {SESSIONS.map((s) => (
          <div key={s.id} className="session-row">
            <div>
              <div className="session-row__title">{s.device}</div>
              <div className="session-row__meta">{s.place} · {s.when}</div>
            </div>
            {s.current && <span className="pill pill--ok">This device</span>}
          </div>
        ))}
      </div>
      {!hasOthers && <p className="modal__text">No other devices are signed in.</p>}
    </Modal>
  )
}

export default SessionsModal