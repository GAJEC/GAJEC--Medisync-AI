import React, { useEffect, useState } from 'react'
import { CloseIcon, ShieldCheckIcon } from '../common/Icons'
import HistoryStyle from '../../assets/styles/history.module.css'
import ModalStyle from '../../assets/styles/modal.module.css'
import ProfileStyle from '../../assets/styles/profile.module.css'
import ScheduleStyle from '../../assets/styles/schedule.module.css'
import SidebarStyle from '../../assets/styles/sidebar.module.css'

const PILL = {
  Completed: HistoryStyle['pill--ok'],
  Cancelled: HistoryStyle['pill--cancel'],
  Scheduled: HistoryStyle['pill--scheduled'],
}

const AppointmentModal = ({ appointment, onClose, onBookAgain, onCancel }) => {
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!appointment) return null

  const date = new Date(appointment.date)
  const dateText = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timeText = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const canCancel = onCancel && appointment.status === 'Scheduled' && date > new Date()

  const cancel = async () => {
    if (!window.confirm(`Cancel appointment ${appointment.ref}?`)) return
    setCancelling(true)
    setError('')
    try {
      await onCancel(appointment)
    } catch (err) {
      setError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className={ModalStyle['modal-overlay']} onMouseDown={onClose}>
      <div
        className={ModalStyle['modal']}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={ModalStyle['modal__head']}>
          <div>
            <p className={ModalStyle['modal__eyebrow']}>MediSync AI</p>
            <h2 id="modal-title" className={ModalStyle['modal__title']}>{appointment.ref}</h2>
          </div>
          <button className={SidebarStyle['icon-btn']} onClick={onClose} aria-label="Close">
            <CloseIcon width={18} height={18} />
          </button>
        </header>

        <div className={ModalStyle['modal__body']}>
          <div className={ModalStyle['modal__summary']}>
            <span className={`${HistoryStyle['pill']} ${PILL[appointment.status] || ''}`}>{appointment.status}</span>
            <h3 className={ModalStyle['modal__doctor']}>{appointment.doctor || 'Doctor to be assigned'}</h3>
            <p className={ModalStyle['modal__meta']}>
              {appointment.specialty ? `${appointment.specialty} · ` : ''}{dateText} at {timeText} · {appointment.mode}
            </p>
            <p className={ModalStyle['modal__meta']}>{appointment.reason}</p>
          </div>

          <div className={ModalStyle['modal__notice']}>
            <ShieldCheckIcon width={15} height={15} />
            Previous information won't be reused without asking you to verify it.
          </div>

          {error && <p className={ProfileStyle['form-error']} role="alert">{error}</p>}
        </div>

        <footer className={ModalStyle['modal__foot']}>
          {canCancel ? (
            <button className={SidebarStyle['btn-outline']} onClick={cancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel appointment'}
            </button>
          ) : (
            <button className={SidebarStyle['btn-outline']} onClick={onClose}>Close</button>
          )}
          <button className={`${ScheduleStyle['btn-primary']} ${ProfileStyle['btn-primary']}`} onClick={onBookAgain}>Book again</button>
        </footer>
      </div>
    </div>
  )
}

export default AppointmentModal
