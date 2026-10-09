import React, { useEffect, useState } from 'react'
import Modal from '../../common/Modal'
import { authApi } from '../../../api/client'
import HistoryStyle from '../../../assets/styles/history.module.css'
import ModalStyle from '../../../assets/styles/modal.module.css'
import ProfileStyle from '../../../assets/styles/profile.module.css'
import ScheduleStyle from '../../../assets/styles/schedule.module.css'
import SidebarStyle from '../../../assets/styles/sidebar.module.css'

const MINUTE = 60 * 1000
const lastSeen = (iso) => {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 5 * MINUTE) return 'Active now'
  if (diff < 60 * MINUTE) return `Active ${Math.floor(diff / MINUTE)} min ago`
  return `Last active ${new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
}

const SessionsModal = ({ token, onClose, onDone }) => {
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    authApi
      .sessions(token)
      .then(({ sessions }) => !cancelled && setSessions(sessions))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [token])

  const hasOthers = Boolean(sessions?.some((s) => !s.current))

  const signOutOthers = async () => {
    setBusy(true)
    setError('')
    try {
      const { revoked } = await authApi.signOutOtherSessions(token)
      onDone(`Signed out ${revoked} other session${revoked === 1 ? '' : 's'}`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Active sessions"
      onClose={onClose}
      footer={
        <>
          <button className={SidebarStyle['btn-outline']} onClick={onClose}>Close</button>
          <button
            className={`${ProfileStyle['btn-primary']} ${ScheduleStyle['btn-primary']}`}
            disabled={!hasOthers || busy}
            onClick={signOutOthers}
          >
            {busy ? 'Signing out…' : 'Sign out other sessions'}
          </button>
        </>
      }
    >
      <p className={ModalStyle['modal__text']}>Devices that are currently signed in to your account.</p>
      {sessions && (
        <div className={ProfileStyle['session-list']}>
          {sessions.map((s) => (
            <div key={s.key} className={ProfileStyle['session-row']}>
              <div>
                <div className={ProfileStyle['session-row__title']}>{s.device}</div>
                <div className={ProfileStyle['session-row__meta']}>
                  {s.ip ? `${s.ip} · ` : ''}{s.current ? 'Active now' : lastSeen(s.lastSeenAt)}
                </div>
              </div>
              {s.current && <span className={`${HistoryStyle['pill']} ${HistoryStyle['pill--ok']}`}>This device</span>}
            </div>
          ))}
        </div>
      )}
      {!sessions && !error && <p className={ModalStyle['modal__text']}>Loading sessions…</p>}
      {sessions && !hasOthers && <p className={ModalStyle['modal__text']}>No other devices are signed in.</p>}
      {error && <p className={ProfileStyle['form-error']} role="alert">{error}</p>}
    </Modal>
  )
}

export default SessionsModal
