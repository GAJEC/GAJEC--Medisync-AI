import React, { useEffect } from 'react'
import { CloseIcon, ShieldCheckIcon } from '../common/Icons'
import HistoryStyle from '../../assets/styles/history.module.css'
import ModalStyle from '../../assets/styles/modal.module.css'
import ProfileStyle from '../../assets/styles/profile.module.css'
import ScheduleStyle from '../../assets/styles/schedule.module.css'
import SidebarStyle from '../../assets/styles/sidebar.module.css'

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
            <p className={ModalStyle['modal__eyebrow']}>HealthLocal AI</p>
            <h2 id="modal-title" className={ModalStyle['modal__title']}>{appointment.ref}</h2>
          </div>
          <button className={SidebarStyle['icon-btn']} onClick={onClose} aria-label="Close">
            <CloseIcon width={18} height={18} />
          </button>
        </header>

        <div className={ModalStyle['modal__body']}>
          <div className={ModalStyle['modal__summary']}>
            <span className={`${HistoryStyle['pill']} ${completed ? HistoryStyle['pill--ok'] : HistoryStyle['pill--cancel']}`}>{appointment.status}</span>
            <h3 className={ModalStyle['modal__doctor']}>{appointment.doctor}</h3>
            <p className={ModalStyle['modal__meta']}>
              {appointment.specialty} · {dateText} at {timeText}
            </p>
          </div>

          <div className={ModalStyle['modal__notice']}>
            <ShieldCheckIcon width={15} height={15} />
            Previous information won't be reused without asking you to verify it.
          </div>
        </div>

        <footer className={ModalStyle['modal__foot']}>
          <button className={SidebarStyle['btn-outline']} onClick={onClose}>Close</button>
          <button className={`${ScheduleStyle['btn-primary']} ${ProfileStyle['btn-primary']}`} onClick={onBookAgain}>Book again</button>
        </footer>
      </div>
    </div>
  )
}

export default AppointmentModal