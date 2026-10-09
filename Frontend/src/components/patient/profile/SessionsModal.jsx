import React from 'react'
import Modal from '../../common/Modal'
import HistoryStyle from '../../../assets/styles/history.module.css'
import ModalStyle from '../../../assets/styles/modal.module.css'
import ProfileStyle from '../../../assets/styles/profile.module.css'
import ScheduleStyle from '../../../assets/styles/schedule.module.css'
import SidebarStyle from '../../../assets/styles/sidebar.module.css'

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
          <button className={SidebarStyle['btn-outline']} onClick={onClose}>Close</button>
          <button className={`${ProfileStyle['btn-primary']} ${ScheduleStyle['btn-primary']}`} disabled={!hasOthers}>Sign out other sessions</button>
        </>
      }
    >
      <p className={ModalStyle['modal__text']}>Devices that are currently signed in to your account.</p>
      <div className={ProfileStyle['session-list']}>
        {SESSIONS.map((s) => (
          <div key={s.id} className={ProfileStyle['session-row']}>
            <div>
              <div className={ProfileStyle['session-row__title']}>{s.device}</div>
              <div className={ProfileStyle['session-row__meta']}>{s.place} · {s.when}</div>
            </div>
            {s.current && <span className={`${HistoryStyle['pill']} ${HistoryStyle['pill--ok']}`}>This device</span>}
          </div>
        ))}
      </div>
      {!hasOthers && <p className={ModalStyle['modal__text']}>No other devices are signed in.</p>}
    </Modal>
  )
}

export default SessionsModal