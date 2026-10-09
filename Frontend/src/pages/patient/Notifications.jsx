import React, { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { PngIcon, ChevronRightIcon } from '../../components/common/Icons'

import scheduleIcon from '../../assets/icons/schedule.png'
import profileIcon from '../../assets/icons/profile.png'
import hospitalIcon from '../../assets/icons/hospital.png'

import HomeStyle from '../../assets/styles/home.module.css'
import NotificationsStyle from '../../assets/styles/notifications.module.css'
import SidebarStyle from '../../assets/styles/sidebar.module.css'

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

const MINUTE = 60 * 1000
const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < MINUTE) return 'Just now'
  if (diff < 60 * MINUTE) return `${Math.floor(diff / MINUTE)} min ago`
  if (diff < 24 * 60 * MINUTE) {
    const h = Math.floor(diff / (60 * MINUTE))
    return `${h} hour${h === 1 ? '' : 's'} ago`
  }
  if (diff < 48 * 60 * MINUTE) return 'Yesterday'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const Notifications = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useOutletContext()
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')

  const shown = notifications.filter((n) => tab === 'all' || n.category === tab)
  const hasUnread = notifications.some((n) => !n.read)

  const markRead = (n) => {
    if (!n.read) markNotificationRead(n.id)
  }

  return (
    <div className={SidebarStyle['page']}>
      <div className={NotificationsStyle['notifs']}>
        <header className={SidebarStyle['page__header']}>
          <div>
            <p className={SidebarStyle['page__eyebrow']}>Stay informed</p>
            <h1 className={SidebarStyle['page__title']}>Notifications</h1>
            <p className={SidebarStyle['page__sub']}>Appointment updates without sensitive health details in previews.</p>
          </div>
          <div className={NotificationsStyle['notifs__actions']}>
            <button className={SidebarStyle['btn-outline']} onClick={() => navigate('/patient/profile')}>Preferences</button>
            <button className={SidebarStyle['btn-text']} onClick={markAllNotificationsRead} disabled={!hasUnread}>
              Mark all read
            </button>
          </div>
        </header>

        <div className={NotificationsStyle['tabs']} role="tablist" aria-label="Notification categories">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`${NotificationsStyle['tabs__btn']} ${tab === t.id ? NotificationsStyle['tabs__btn--active'] : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'all' && <span className={NotificationsStyle['tabs__count']}>{notifications.length}</span>}
            </button>
          ))}
        </div>

        <div className={NotificationsStyle['notifs__list']}>
          {shown.length === 0 ? (
            <p className={NotificationsStyle['notifs__empty']}>You're all caught up.</p>
          ) : (
            shown.map((n) => (
              <button
                key={n.id}
                className={`${NotificationsStyle['notif']} ${n.read ? '' : NotificationsStyle['notif--unread']}`}
                onClick={() => markRead(n)}
              >
                <span className={NotificationsStyle['notif__icon']}>
                  <PngIcon src={ICONS[n.type] || hospitalIcon} size={16} className={HomeStyle['icon-teal']} />
                </span>
                <span className={NotificationsStyle['notif__text']}>
                  <span className={NotificationsStyle['notif__title']}>{n.title}</span>
                  <span className={NotificationsStyle['notif__body']}>{n.body}</span>
                  <span className={NotificationsStyle['notif__meta']}>{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && <span className={NotificationsStyle['notif__dot']} aria-label="Unread" />}
                <ChevronRightIcon width={16} height={16} className={NotificationsStyle['notif__chevron']} />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Notifications