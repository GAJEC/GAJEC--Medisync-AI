import React, { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { PngIcon, ChatIcon, ChevronLeftIcon, MoreIcon, HelpIcon, CloseIcon } from '../common/Icons'

import heartIcon from '../../assets/icons/heart.png'
import scheduleIcon from '../../assets/icons/schedule.png'
import notificationIcon from '../../assets/icons/notification.png'
import historyIcon from '../../assets/icons/history.png'
import searchIcon from '../../assets/icons/search.png'
import moonIcon from '../../assets/icons/moon.png'
import logoutIcon from '../../assets/icons/logout.png'
import mediSyncLogo from '../../assets/images/medisync-logo.png'

import HomeStyle from '../../assets/styles/home.module.css'
import SidebarStyle from '../../assets/styles/sidebar.module.css'

const NAV_ITEMS = [
  { to: '/patient/schedule', label: 'Schedule', icon: scheduleIcon },
  { to: '/patient/notifications', label: 'Notifications', icon: notificationIcon, badge: true },
  { to: '/patient/history', label: 'Appointment history', icon: historyIcon },
]

const PatientSidebar = ({
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  user,
  conversations,
  activeId,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  darkMode,
  onToggleDark,
  onLogout,
  unreadCount = 0,
}) => {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const onProfile = useLocation().pathname.startsWith('/patient/profile')

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.trim().toLowerCase())
  )
  const groups = ['Today', 'Yesterday', 'Previous 7 days', 'Older']
    .map((label) => ({ label, items: filtered.filter((c) => c.group === label) }))
    .filter((g) => g.items.length > 0)

  return (
    <aside className={`${SidebarStyle['sidebar']} ${collapsed ? SidebarStyle['sidebar--collapsed'] : ''} ${mobileOpen ? SidebarStyle['sidebar--open'] : ''}`}>
      <div className={SidebarStyle['sidebar__brand']}>
        <span className={SidebarStyle['logo-mark']}>
          <PngIcon src={mediSyncLogo} size={25} className={SidebarStyle['icon-white']} />
        </span>
        <span className={`${SidebarStyle['sidebar__brand-name']} ${SidebarStyle['hide-collapsed']}`}>
          MediSync <span className={SidebarStyle['accent']}>AI</span>
        </span>
        <button
          className={`${SidebarStyle['icon-btn']} ${SidebarStyle['sidebar__collapse']}`}
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeftIcon />
        </button>
        <button className={`${SidebarStyle['icon-btn']} ${SidebarStyle['sidebar__close']}`} onClick={onCloseMobile} aria-label="Close menu">
          <CloseIcon width={18} height={18} />
        </button>
      </div>

      <button className={SidebarStyle['btn-new']} onClick={onNewConversation}>
        <ChatIcon />
        <span className={SidebarStyle['hide-collapsed']}>New conversation</span>
      </button>

      <nav className={SidebarStyle['sidebar__nav']} aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `${SidebarStyle['nav-item']} ${isActive ? SidebarStyle['nav-item--active'] : ''}`}
          >
            {({ isActive }) => (
              <>
                <PngIcon src={item.icon} className={isActive ? HomeStyle['icon-teal'] : SidebarStyle['icon-muted']} />
                <span className={SidebarStyle['hide-collapsed']}>{item.label}</span>
                {item.badge && unreadCount > 0 && <span className={SidebarStyle['badge']}>{unreadCount}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={`${SidebarStyle['sidebar__recent']} ${SidebarStyle['hide-collapsed']}`}>
        <h2 className={SidebarStyle['section-label']}>Recent conversations</h2>

        <label className={SidebarStyle['search']}>
          <PngIcon src={searchIcon} size={14} className={SidebarStyle['icon-muted']} />
          <input
            type="search"
            placeholder="Search conversations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className={SidebarStyle['convo-list']}>
          {conversations.length === 0 && (
            <h3 className={SidebarStyle['convo-group']}>No conversations yet</h3>
          )}
          {groups.map((g) => (
            <div key={g.label}>
              <h3 className={SidebarStyle['convo-group']}>{g.label}</h3>
              {g.items.map((c) => (
                <div
                  key={c.id}
                  className={`${SidebarStyle['convo']} ${c.id === activeId ? SidebarStyle['convo--active'] : ''}`}
                >
                  <button className={SidebarStyle['convo__title']} onClick={() => onSelectConversation(c.id)}>
                    {c.title}
                  </button>
                  <button
                    className={SidebarStyle['icon-btn']}
                    aria-label={`Delete conversation "${c.title}"`}
                    title="Delete conversation"
                    onClick={() => {
                      if (window.confirm(`Delete "${c.title}"? This cannot be undone.`)) onDeleteConversation(c.id)
                    }}
                  >
                    <CloseIcon width={14} height={14} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={SidebarStyle['sidebar__footer']}>
        <button
          className={`${SidebarStyle['profile']} ${SidebarStyle['profile--btn']} ${onProfile ? SidebarStyle['profile--active'] : ''}`}
          onClick={() => navigate('/patient/profile')}
          aria-label="Open profile and settings"
        >
          <span className={SidebarStyle['avatar']}>{user.initials}</span>
          <span className={`${SidebarStyle['profile__text']} ${SidebarStyle['hide-collapsed']}`}>
            <span className={SidebarStyle['profile__name']}>{user.name}</span>
            <span className={SidebarStyle['profile__meta']}>
              {user.role} · {user.code}
            </span>
          </span>
          <MoreIcon className={`${SidebarStyle['profile__more']} ${SidebarStyle['hide-collapsed']}`} />
        </button>

        <div className={SidebarStyle['footer-row']}>
          <button className={`${SidebarStyle['nav-item']} ${SidebarStyle['nav-item--small']}`} onClick={onToggleDark}>
            <PngIcon src={moonIcon} size={15} className={SidebarStyle['icon-muted']} />
            <span className={SidebarStyle['hide-collapsed']}>{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <span className={`${SidebarStyle['footer-row__actions']} ${SidebarStyle['hide-collapsed']}`}>
            <button className={SidebarStyle['icon-btn']} aria-label="Help">
              <HelpIcon />
            </button>
            <button className={SidebarStyle['icon-btn']} aria-label="Log out" onClick={onLogout}>
              <PngIcon src={logoutIcon} size={15} className={SidebarStyle['icon-muted']} />
            </button>
          </span>
        </div>
      </div>
    </aside>
  )
}

export default PatientSidebar