import React, { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import PatientSidebar from './PatientSidebar'
import { MenuIcon } from '../common/Icons'
import { useAuth } from '../../auth/AuthContext'
import HomeStyle from '../../assets/styles/home.module.css'
import SidebarStyle from '../../assets/styles/sidebar.module.css'

const USER = { name: 'Sofia Reyes', initials: 'SR', role: 'Patient', id: 'P-20481' }

const INITIAL_CONVERSATIONS = [
  { id: 1, title: 'Recurring headache concern', group: 'Today', pinned: false, archived: false },
  { id: 2, title: 'General checkup request', group: 'Yesterday', pinned: false, archived: false },
  { id: 3, title: 'Follow-up appointment', group: 'Previous 7 days', pinned: false, archived: false },
]

// Mock data. Replace with your backend later.
const NOTIFICATIONS = [
  {
    id: 1, category: 'appointments', type: 'reminder', read: false, time: 'Just now',
    title: 'Upcoming appointment reminder',
    body: 'Your annual checkup is tomorrow at 10:30 AM.',
  },
  {
    id: 2, category: 'appointments', type: 'profile', read: false, time: '2 hours ago',
    title: 'Complete your patient profile',
    body: 'Add an emergency contact before your next hospital visit.',
  },
  {
    id: 3, category: 'hospital', type: 'hospital', read: true, time: 'Yesterday',
    title: 'Hospital hours update',
    body: 'Outpatient services will follow adjusted hours this Friday.',
  },
]

const MOBILE_QUERY = '(max-width: 800px)'

const PatientLayout = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(false)
  const [activeId, setActiveId] = useState(1)
  const [user, setUser] = useState(USER)
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS)
  const [notifications, setNotifications] = useState(NOTIFICATIONS)
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const [menuOpen, setMenuOpen] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = (e) => {
      setMobile(e.matches)
      if (!e.matches) setMenuOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
  }

  const updateUser = (changes) => setUser((u) => ({ ...u, ...changes }))

  const updateConversation = (id, changes) => {
    setConversations((current) => current.map((conversation) =>
      conversation.id === id ? { ...conversation, ...changes } : conversation
    ))
  }

  const openConversation = (id) => {
    setActiveId(id)
    setMenuOpen(false)
    navigate('/patient/dashboard')
  }

  const newConversation = () => {
    setActiveId(null)
    setMenuOpen(false)
    navigate('/patient/dashboard')
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={HomeStyle['app-shell']}>
      <button
        className={SidebarStyle['mobile-menu']}
        onClick={() => setMenuOpen(true)}
        aria-label="Open menu"
        aria-expanded={menuOpen}
      >
        <MenuIcon width={20} height={20} />
      </button>

      {menuOpen && <div className={SidebarStyle['sidebar-backdrop']} onClick={() => setMenuOpen(false)} />}

      <PatientSidebar
        collapsed={collapsed && !mobile}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={menuOpen}
        onCloseMobile={() => setMenuOpen(false)}
        user={user}
        conversations={conversations}
        activeId={activeId}
        onNewConversation={newConversation}
        onSelectConversation={openConversation}
        onUpdateConversation={updateConversation}
        darkMode={dark}
        onToggleDark={toggleDark}
        onLogout={handleLogout}
        unreadCount={unreadCount}
      />

      <div className={HomeStyle['main']}>
        <Outlet
          context={{
            user,
            updateUser,
            notifications,
            setNotifications,
            darkMode: dark,
            toggleDark,
          }}
        />
      </div>
    </div>
  )
}

export default PatientLayout
