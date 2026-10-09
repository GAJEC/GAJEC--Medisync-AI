import React, { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { PngIcon, ChatIcon, ChevronLeftIcon, MoreIcon, HelpIcon } from '../common/Icons'

import heartIcon from '../../assets/icons/heart.png'
import scheduleIcon from '../../assets/icons/schedule.png'
import notificationIcon from '../../assets/icons/notification.png'
import historyIcon from '../../assets/icons/history.png'
import searchIcon from '../../assets/icons/search.png'
import moonIcon from '../../assets/icons/moon.png'
import logoutIcon from '../../assets/icons/logout.png'

import '../../assets/styles/sidebar.css'

const NAV_ITEMS = [
  { to: '/patient/schedule', label: 'Schedule', icon: scheduleIcon },
  { to: '/patient/notifications', label: 'Notifications', icon: notificationIcon, badge: true },
  { to: '/patient/history', label: 'Appointment history', icon: historyIcon },
]

const PatientSidebar = ({
  collapsed,
  onToggleCollapse,
  user,
  conversations,
  activeId,
  onNewConversation,
  onSelectConversation,
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
  const groups = ['Today', 'Yesterday', 'Previous 7 days']
    .map((label) => ({ label, items: filtered.filter((c) => c.group === label) }))
    .filter((g) => g.items.length > 0)

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <span className="logo-mark">
          <PngIcon src={heartIcon} size={16} className="icon-white" />
        </span>
        <span className="sidebar__brand-name hide-collapsed">
          MediSync <span className="accent">AI</span>
        </span>
        <button
          className="icon-btn sidebar__collapse"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeftIcon />
        </button>
      </div>

      <button className="btn-new" onClick={onNewConversation}>
        <ChatIcon />
        <span className="hide-collapsed">New conversation</span>
      </button>

      <nav className="sidebar__nav" aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <PngIcon src={item.icon} className={isActive ? 'icon-teal' : 'icon-muted'} />
                <span className="hide-collapsed">{item.label}</span>
                {item.badge && unreadCount > 0 && <span className="badge">{unreadCount}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__recent hide-collapsed">
        <h2 className="section-label">Recent conversations</h2>

        <label className="search">
          <PngIcon src={searchIcon} size={14} className="icon-muted" />
          <input
            type="search"
            placeholder="Search conversations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="convo-list">
          {groups.map((g) => (
            <div key={g.label}>
              <h3 className="convo-group">{g.label}</h3>
              {g.items.map((c) => (
                <div
                  key={c.id}
                  className={`convo ${c.id === activeId ? 'convo--active' : ''}`}
                >
                  <button className="convo__title" onClick={() => onSelectConversation(c.id)}>
                    {c.title}
                  </button>
                  <button className="icon-btn convo__more" aria-label="Conversation options">
                    <MoreIcon />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar__footer">
        <button
          className={`profile profile--btn ${onProfile ? 'profile--active' : ''}`}
          onClick={() => navigate('/patient/profile')}
          aria-label="Open profile and settings"
        >
          <span className="avatar">{user.initials}</span>
          <span className="profile__text hide-collapsed">
            <span className="profile__name">{user.name}</span>
            <span className="profile__meta">
              {user.role} · {user.id}
            </span>
          </span>
          <MoreIcon className="profile__more hide-collapsed" />
        </button>

        <div className="footer-row">
          <button className="nav-item nav-item--small" onClick={onToggleDark}>
            <PngIcon src={moonIcon} size={15} className="icon-muted" />
            <span className="hide-collapsed">{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <span className="footer-row__actions hide-collapsed">
            <button className="icon-btn" aria-label="Help">
              <HelpIcon />
            </button>
            <button className="icon-btn" aria-label="Log out" onClick={onLogout}>
              <PngIcon src={logoutIcon} size={15} className="icon-muted" />
            </button>
          </span>
        </div>
      </div>
    </aside>
  )
}

export default PatientSidebar