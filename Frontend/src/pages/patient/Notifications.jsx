import React, { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { PngIcon, ChevronRightIcon } from '../../components/common/Icons'

import scheduleIcon from '../../assets/icons/schedule.png'
import profileIcon from '../../assets/icons/profile.png'
import hospitalIcon from '../../assets/icons/hospital.png'

import '../../assets/styles/notifications.css'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'hospital', label: 'Hospital' },
]

const ICONS = {
  reminder: scheduleIcon,
  profile: profileIcon,
  hospital: hospitalIcon,
}

const Notifications = () => {
  const { notifications, setNotifications } = useOutletContext()
  const [tab, setTab] = useState('all')

  const shown = notifications.filter((n) => tab === 'all' || n.category === tab)

  const markRead = (id) => {
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllRead = () => {
    setNotifications((list) => list.map((n) => ({ ...n, read: true })))
  }

  return (
    <div className="page">
      <div className="notifs">
        <header className="page__header">
          <div>
            <p className="page__eyebrow">Stay informed</p>
            <h1 className="page__title">Notifications</h1>
            <p className="page__sub">Appointment updates without sensitive health details in previews.</p>
          </div>
          <div className="notifs__actions">
            <button className="btn-outline">Preferences</button>
            <button className="btn-text" onClick={markAllRead}>
              Mark all read
            </button>
          </div>
        </header>

        <div className="tabs" role="tablist" aria-label="Notification categories">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`tabs__btn ${tab === t.id ? 'tabs__btn--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'all' && <span className="tabs__count">{notifications.length}</span>}
            </button>
          ))}
        </div>

        <div className="notifs__list">
          {shown.length === 0 ? (
            <p className="notifs__empty">You're all caught up.</p>
          ) : (
            shown.map((n) => (
              <button
                key={n.id}
                className={`notif ${n.read ? '' : 'notif--unread'}`}
                onClick={() => markRead(n.id)}
              >
                <span className="notif__icon">
                  <PngIcon src={ICONS[n.type]} size={16} className="icon-teal" />
                </span>
                <span className="notif__text">
                  <span className="notif__title">{n.title}</span>
                  <span className="notif__body">{n.body}</span>
                  <span className="notif__meta">{n.time} · Asia/Manila</span>
                </span>
                {!n.read && <span className="notif__dot" aria-label="Unread" />}
                <ChevronRightIcon width={16} height={16} className="notif__chevron" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Notifications