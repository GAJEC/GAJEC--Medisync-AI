import React, { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import PatientSidebar from './PatientSidebar'
import { MenuIcon } from '../common/Icons'
import { useAuth } from '../../auth/AuthContext'

const USER = { name: 'Sofia Reyes', initials: 'SR', role: 'Patient', id: 'P-20481' }

const CONVERSATIONS = [
  { id: 1, title: 'Recurring headache concern', group: 'Today' },
  { id: 2, title: 'General checkup request', group: 'Yesterday' },
  { id: 3, title: 'Follow-up appointment', group: 'Previous 7 days' },
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
  const [notifications, setNotifications] = useState(NOTIFICATIONS)
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const [menuOpen, setMenuOpen] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Track the mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = (e) => {
      setMobile(e.matches)
      if (!e.matches) setMenuOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Close the drawer after navigating
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Esc closes the drawer
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

  const openConversation = (id) => {
    setActiveId(id)
    setMenuOpen(false)
    navigate('/patient')
  }

  const newConversation = () => {
    setActiveId(null)
    setMenuOpen(false)
    navigate('/patient')
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <button
        className="mobile-menu"
        onClick={() => setMenuOpen(true)}
        aria-label="Open menu"
        aria-expanded={menuOpen}
      >
        <MenuIcon width={20} height={20} />
      </button>

      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      <PatientSidebar
        collapsed={collapsed && !mobile}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={menuOpen}
        onCloseMobile={() => setMenuOpen(false)}
        user={user}
        conversations={CONVERSATIONS}
        activeId={activeId}
        onNewConversation={newConversation}
        onSelectConversation={openConversation}
        darkMode={dark}
        onToggleDark={toggleDark}
        onLogout={handleLogout}
        unreadCount={unreadCount}
      />

      <div className="main">
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