import React, { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { PngIcon, ChatIcon, ChevronLeftIcon, MoreIcon, HelpIcon, CloseIcon } from '../common/Icons'
import DeleteConversationModal from './DeleteConversationModal'

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
  onUpdateConversation,
  onDeleteConversation,
  conversationError = '',
  darkMode,
  onToggleDark,
  onLogout,
  unreadCount = 0,
}) => {
  const [query, setQuery] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [showArchived, setShowArchived] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const navigate = useNavigate()
  const onProfile = useLocation().pathname.startsWith('/patient/profile')

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.trim().toLowerCase())
  )
  const pinned = filtered.filter((c) => c.pinned && !c.archived)
  const recent = filtered.filter((c) => !c.pinned && !c.archived)
  const archived = filtered.filter((c) => c.archived)
  const groups = ['Today', 'Yesterday', 'Previous 7 days', 'Older']
    .map((label) => ({ label, items: recent.filter((c) => c.group === label) }))
    .filter((g) => g.items.length > 0)

  const closeMenu = () => setOpenMenuId(null)
  const toggleMenu = (event, conversationId) => {
    if (openMenuId === conversationId) {
      closeMenu()
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const menuHeight = 128
    const menuWidth = 156
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow >= menuHeight + 8
      ? rect.bottom + 6
      : Math.max(8, rect.top - menuHeight - 6)
    const left = Math.min(
      window.innerWidth - menuWidth - 8,
      Math.max(8, rect.right - menuWidth)
    )

    setMenuPosition({ top, left })
    setOpenMenuId(conversationId)
  }
  const togglePinned = (conversation) => {
    onUpdateConversation(conversation.id, { pinned: !conversation.pinned, archived: false })
    closeMenu()
  }
  const toggleArchived = (conversation) => {
    onUpdateConversation(conversation.id, { archived: !conversation.archived, pinned: false })
    closeMenu()
  }
  const deleteConversation = (conversation) => {
    closeMenu()
    setPendingDelete(conversation)
  }

  const renderConversation = (conversation) => (
    <div
      key={conversation.id}
      className={`${SidebarStyle['convo']} ${conversation.id === activeId ? SidebarStyle['convo--active'] : ''}`}
    >
      <button className={SidebarStyle['convo__title']} onClick={() => onSelectConversation(conversation.id)}>
        {conversation.title}
      </button>
      <div className={SidebarStyle['convo__actions']}>
        <button
          className={SidebarStyle['icon-btn']}
          aria-label={`Options for ${conversation.title}`}
          aria-haspopup="menu"
          aria-expanded={openMenuId === conversation.id}
          onClick={(event) => toggleMenu(event, conversation.id)}
        >
          <MoreIcon />
        </button>
        {openMenuId === conversation.id && (
          <>
            <button className={SidebarStyle['convo-menu__backdrop']} aria-label="Close conversation options" onClick={closeMenu} />
            <div
              className={SidebarStyle['convo-menu']}
              role="menu"
              style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left }}
            >
              {!conversation.archived && (
                <button role="menuitem" onClick={() => togglePinned(conversation)}>
                  <span aria-hidden="true">📌</span>
                  {conversation.pinned ? 'Unpin' : 'Pin'}
                </button>
              )}
              <button role="menuitem" onClick={() => toggleArchived(conversation)}>
                <span aria-hidden="true">▣</span>
                {conversation.archived ? 'Unarchive' : 'Archive'}
              </button>
              <button role="menuitem" onClick={() => deleteConversation(conversation)}>
                <CloseIcon width={12} height={12} aria-hidden="true" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
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
        <h2 className={SidebarStyle['section-label']}>Conversations</h2>
        <label className={SidebarStyle['search']}>
          <PngIcon src={searchIcon} size={14} className={SidebarStyle['icon-muted']} />
          <input
            type="search"
            placeholder="Search conversations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        {pinned.length > 0 && (
          <section className={SidebarStyle['convo-section']} aria-label="Pinned conversations">
            <h3 className={SidebarStyle['convo-group']}><span aria-hidden="true">📌</span> Pinned</h3>
            <div className={SidebarStyle['convo-list']}>
              {pinned.map(renderConversation)}
            </div>
          </section>
        )}

        <div className={SidebarStyle['convo-list']}>
          {groups.map((group) => (
            <div key={group.label}>
              <h3 className={SidebarStyle['convo-group']}>{group.label}</h3>
              {group.items.map(renderConversation)}
            </div>
          ))}
          {recent.length === 0 && pinned.length === 0 && (
            <p className={SidebarStyle['convo-empty']}>
              {conversations.length === 0 ? 'No conversations yet.' : 'No conversations found.'}
            </p>
          )}
        </div>

        {archived.length > 0 && (
          <section className={SidebarStyle['convo-section']} aria-label="Archived conversations">
            <button
              className={SidebarStyle['convo-archive-toggle']}
              onClick={() => setShowArchived((v) => !v)}
              aria-expanded={showArchived}
            >
              <span aria-hidden="true">▣</span>
              Archived ({archived.length})
              <span aria-hidden="true" className={SidebarStyle['convo-archive-caret']}>{showArchived ? '▾' : '▸'}</span>
            </button>
            {showArchived && <div className={SidebarStyle['convo-list']}>{archived.map(renderConversation)}</div>}
          </section>
        )}

        {conversationError && (
          <p className={SidebarStyle['convo-error']} role="alert">{conversationError}</p>
        )}
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
          <button
            className={`${SidebarStyle['nav-item']} ${SidebarStyle['nav-item--small']}`}
            onClick={onToggleDark}
            aria-pressed={darkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
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

    {pendingDelete && (
      <DeleteConversationModal
        conversation={pendingDelete}
        onConfirm={onDeleteConversation}
        onClose={() => setPendingDelete(null)}
      />
    )}
    </>
  )
}

export default PatientSidebar
