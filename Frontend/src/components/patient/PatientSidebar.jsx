import React, { useState } from 'react'
import { PngIcon, ChatIcon, ChevronLeftIcon, MoreIcon, HelpIcon } from '../common/Icons'

import heartIcon from '../../assets/icons/heart.png'
import scheduleIcon from '../../assets/icons/schedule.png'
import notificationIcon from '../../assets/icons/notification.png'
import historyIcon from '../../assets/icons/history.png'
import searchIcon from '../../assets/icons/search.png'
import moonIcon from '../../assets/icons/moon.png'
import logoutIcon from '../../assets/icons/logout.png'

import '../../assets/styles/sidebar.css'

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
          HealthLocal <span className="accent">AI</span>
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
        <button className="nav-item">
          <PngIcon src={scheduleIcon} className="icon-muted" />
          <span className="hide-collapsed">Schedule</span>
        </button>
        <button className="nav-item">
          <PngIcon src={notificationIcon} className="icon-muted" />
          <span className="hide-collapsed">Notifications</span>
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </button>
        <button className="nav-item">
          <PngIcon src={historyIcon} className="icon-muted" />
          <span className="hide-collapsed">Appointment history</span>
        </button>
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
        <div className="profile">
          <span className="avatar">{user.initials}</span>
          <div className="profile__text hide-collapsed">
            <div className="profile__name">{user.name}</div>
            <div className="profile__meta">
              {user.role} · {user.id}
            </div>
          </div>
          <button className="icon-btn hide-collapsed" aria-label="Account options">
            <MoreIcon />
          </button>
        </div>

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