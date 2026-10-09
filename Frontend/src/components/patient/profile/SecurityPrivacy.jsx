import React, { useState } from 'react'
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
import ProfileStyle from '../../../assets/styles/profile.module.css'

const ROWS = [
  { id: 'password', Icon: LockIcon, title: 'Change password', sub: 'Last changed 3 months ago' },
  { id: 'consent', Icon: ShieldCheckIcon, title: 'Consent & data use', sub: 'Review how submitted information is used' },
  { id: 'sessions', Icon: UsersIcon, title: 'Active sessions', sub: '1 current session' },
  { id: 'data', Icon: FileTextIcon, title: 'Access or delete eligible data', sub: 'Requests are subject to retention requirements' },
]

const SecurityPrivacy = ({ onNotify }) => {
  const [open, setOpen] = useState(null)

  const close = () => setOpen(null)
  const done = (message) => {
    setOpen(null)
    onNotify(message)
  }

  return (
    <>
      <SectionCard title="Security & privacy" subtitle="Control your account and data choices." flush>
        {ROWS.map(({ id, Icon, title, sub }) => (
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

      {open === 'password' && <ChangePasswordModal onClose={close} onDone={done} />}
      {open === 'consent' && <ConsentModal onClose={close} onDone={done} />}
      {open === 'sessions' && <SessionsModal onClose={close} onDone={done} />}
      {open === 'data' && <DataRequestModal onClose={close} />}
    </>
  )
}

export default SecurityPrivacy