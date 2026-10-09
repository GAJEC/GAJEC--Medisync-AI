import React, { useEffect } from 'react'
import { CloseIcon, ShieldCheckIcon } from '../common/Icons'

const AppointmentModal = ({ appointment, onClose, onBookAgain }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!appointment) return null

  const date = new Date(appointment.date)
  const dateText = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timeText = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const completed = appointment.status === 'Completed'

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <div>
            <p className="modal__eyebrow">HealthLocal AI</p>
            <h2 id="modal-title" className="modal__title">{appointment.ref}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon width={18} height={18} />
          </button>
        </header>

        <div className="modal__body">
          <div className="modal__summary">
            <span className={`pill ${completed ? 'pill--ok' : 'pill--cancel'}`}>{appointment.status}</span>
            <h3 className="modal__doctor">{appointment.doctor}</h3>
            <p className="modal__meta">
              {appointment.specialty} · {dateText} at {timeText}
            </p>
          </div>

          <div className="modal__notice">
            <ShieldCheckIcon width={15} height={15} />
            Previous information won't be reused without asking you to verify it.
          </div>
        </div>

        <footer className="modal__foot">
          <button className="btn-outline" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={onBookAgain}>Book again</button>
        </footer>
      </div>
    </div>
  )
}

export default AppointmentModal