import React, { useCallback, useEffect, useState } from 'react'
import SectionCard from './SectionCard'
import {
  ChevronRightIcon,
  ShieldCheckIcon,
  LockIcon,
  UsersIcon,
  FileTextIcon,
} from '../../common/Icons'
import ChangePasswordModal from './ChangePasswordModal'
import ConsentModal from './ConsentModal'
import SessionsModal from './SessionsModal'
import DataRequestModal from './DataRequestModal'
import { useAuth } from '../../../auth/AuthContext'
import { authApi } from '../../../api/client'
import ProfileStyle from '../../../assets/styles/profile.module.css'

const DAY_MS = 24 * 60 * 60 * 1000
const changedAgo = (iso) => {
  if (!iso) return 'Never changed'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS)
  if (days < 1) return 'Last changed today'
  if (days < 30) return `Last changed ${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `Last changed ${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(days / 365)
  return `Last changed ${years} year${years === 1 ? '' : 's'} ago`
}

const SecurityPrivacy = ({ token, onNotify }) => {
  const { session, updateSessionUser } = useAuth()
  const [open, setOpen] = useState(null)
  const [sessionCount, setSessionCount] = useState(null)

  const loadSessionCount = useCallback(() => {
    authApi
      .sessions(token)
      .then(({ sessions }) => setSessionCount(sessions.length))
      .catch(() => setSessionCount(null))
  }, [token])

  useEffect(() => {
    loadSessionCount()
  }, [loadSessionCount])

  const rows = [
    { id: 'password', Icon: LockIcon, title: 'Change password', sub: changedAgo(session.user.password_changed_at) },
    { id: 'consent', Icon: ShieldCheckIcon, title: 'Consent & data use', sub: 'Review how submitted information is used' },
    {
      id: 'sessions', Icon: UsersIcon, title: 'Active sessions',
      sub: sessionCount === null ? 'Devices signed in to your account' : `${sessionCount} active session${sessionCount === 1 ? '' : 's'}`,
    },
    { id: 'data', Icon: FileTextIcon, title: 'Access or delete eligible data', sub: 'Requests are subject to retention requirements' },
  ]

  const close = () => setOpen(null)
  const done = (message) => {
    setOpen(null)
    onNotify(message)
  }

  const passwordChanged = (message) => {
    updateSessionUser({ password_changed_at: new Date().toISOString() })
    loadSessionCount()
    done(message)
  }

  const sessionsChanged = (message) => {
    loadSessionCount()
    done(message)
  }

  return (
    <>
      <SectionCard title="Security & privacy" subtitle="Control your account and data choices." flush>
        {rows.map(({ id, Icon, title, sub }) => (
          <button key={id} className={ProfileStyle['sec-row']} onClick={() => setOpen(id)}>
            <span className={ProfileStyle['sec-row__icon']}>
              <Icon width={16} height={16} />
            </span>
            <span className={ProfileStyle['sec-row__text']}>
              <span className={ProfileStyle['sec-row__title']}>{title}</span>
              <span className={ProfileStyle['sec-row__sub']}>{sub}</span>
            </span>
            <ChevronRightIcon width={16} height={16} />
          </button>
        ))}

        <div className={ProfileStyle['sec-notice']}>
          <ShieldCheckIcon width={15} height={15} />
          <span>
            Privacy controls support responsible data handling; interface notices alone do not
            constitute legal compliance with the Philippine Data Privacy Act of 2012.
          </span>
        </div>
      </SectionCard>

      {open === 'password' && <ChangePasswordModal token={token} onClose={close} onDone={passwordChanged} />}
      {open === 'consent' && <ConsentModal token={token} onClose={close} onDone={done} />}
      {open === 'sessions' && <SessionsModal token={token} onClose={close} onDone={sessionsChanged} />}
      {open === 'data' && <DataRequestModal token={token} onClose={close} />}
    </>
  )
}

export default SecurityPrivacy
