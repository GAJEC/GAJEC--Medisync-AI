import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import PatientSidebar from './PatientSidebar'
import { MenuIcon } from '../common/Icons'
import { useAuth } from '../../auth/AuthContext'
import { patientApi } from '../../api/client'
import HomeStyle from '../../assets/styles/home.module.css'
import SidebarStyle from '../../assets/styles/sidebar.module.css'

<<<<<<< HEAD
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

=======
>>>>>>> 1936436307949cccdd901a1cc6c35d360653ae72
const MOBILE_QUERY = '(max-width: 800px)'

const initialsOf = (name) =>
  name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'

// Display id, e.g. user 7 -> P-00007
const patientCode = (id) => `P-${String(id).padStart(5, '0')}`

const DAY_MS = 24 * 60 * 60 * 1000
const groupOf = (iso) => {
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  const t = new Date(iso).getTime()
  if (t >= startOfToday) return 'Today'
  if (t >= startOfToday - DAY_MS) return 'Yesterday'
  if (t >= startOfToday - 7 * DAY_MS) return 'Previous 7 days'
  return 'Older'
}

// ProtectedRoute skips auth in dev, but patient pages load real data and need a
// signed-in patient. Wait for the stored token check, then require a patient session.
const PatientLayout = () => {
  const { session, status } = useAuth()

  if (status === 'loading') {
    return (
      <div role="status" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: '#687b78' }}>
        Loading…
      </div>
    )
  }
  if (session?.role !== 'patient') return <Navigate to="/login" replace />

  return <PatientShell session={session} />
}

const PatientShell = ({ session }) => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { logout, updateSessionUser } = useAuth()
  const token = session.token
  const [collapsed, setCollapsed] = useState(false)
<<<<<<< HEAD
  const [dark, setDark] = useState(false)
  const [activeId, setActiveId] = useState(1)
  const [user, setUser] = useState(USER)
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS)
  const [notifications, setNotifications] = useState(NOTIFICATIONS)
=======
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark')
  const [activeId, setActiveId] = useState(null)
  const [conversations, setConversations] = useState([])
  const [notifications, setNotifications] = useState([])
>>>>>>> 1936436307949cccdd901a1cc6c35d360653ae72
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const [menuOpen, setMenuOpen] = useState(false)

  const user = useMemo(
    () => ({
      id: session.user.id,
      code: patientCode(session.user.id),
      name: session.name,
      initials: initialsOf(session.name),
      email: session.email,
      role: 'Patient',
    }),
    [session],
  )

  const unreadCount = notifications.filter((n) => !n.read).length

<<<<<<< HEAD
=======
  // Session was signed out elsewhere or expired: send the user back to login
  const onLoadError = useCallback(
    (err) => {
      if (err.status !== 401) return
      logout()
      navigate('/login', { replace: true })
    },
    [logout, navigate],
  )

  // Both loaders return a promise and only set state once the request finishes
  const loadConversations = useCallback(
    () =>
      patientApi
        .conversations(token)
        .then(({ conversations }) =>
          setConversations(conversations.map((c) => ({ ...c, group: groupOf(c.updatedAt) }))),
        )
        .catch(onLoadError),
    [token, onLoadError],
  )

  const loadNotifications = useCallback(
    () =>
      patientApi
        .notifications(token)
        .then(({ notifications }) => setNotifications(notifications))
        .catch(onLoadError),
    [token, onLoadError],
  )

  useEffect(() => {
    let cancelled = false
    patientApi
      .conversations(token)
      .then(({ conversations }) =>
        !cancelled && setConversations(conversations.map((c) => ({ ...c, group: groupOf(c.updatedAt) }))),
      )
      .catch((err) => !cancelled && onLoadError(err))
    patientApi
      .notifications(token)
      .then(({ notifications }) => !cancelled && setNotifications(notifications))
      .catch((err) => !cancelled && onLoadError(err))
    return () => {
      cancelled = true
    }
  }, [token, onLoadError])

  // Optimistic: update the UI first, then sync and reload on failure
  const markNotificationRead = useCallback(
    (id) => {
      setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)))
      patientApi.markNotificationRead(token, id).catch(loadNotifications)
    },
    [token, loadNotifications],
  )

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((list) => list.map((n) => ({ ...n, read: true })))
    patientApi.markAllNotificationsRead(token).catch(loadNotifications)
  }, [token, loadNotifications])

  // Track the mobile breakpoint
>>>>>>> 1936436307949cccdd901a1cc6c35d360653ae72
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

<<<<<<< HEAD
  const updateUser = (changes) => setUser((u) => ({ ...u, ...changes }))

  const updateConversation = (id, changes) => {
    setConversations((current) => current.map((conversation) =>
      conversation.id === id ? { ...conversation, ...changes } : conversation
    ))
  }

=======
>>>>>>> 1936436307949cccdd901a1cc6c35d360653ae72
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

  const deleteConversation = async (id) => {
    try {
      await patientApi.deleteConversation(token, id)
      if (id === activeId) setActiveId(null)
      setConversations((list) => list.filter((c) => c.id !== id))
    } catch {
      loadConversations()
    }
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
<<<<<<< HEAD
        onUpdateConversation={updateConversation}
=======
        onDeleteConversation={deleteConversation}
>>>>>>> 1936436307949cccdd901a1cc6c35d360653ae72
        darkMode={dark}
        onToggleDark={toggleDark}
        onLogout={handleLogout}
        unreadCount={unreadCount}
      />

      <div className={HomeStyle['main']}>
        <Outlet
          context={{
            token,
            user,
            updateSessionUser,
            notifications,
            markNotificationRead,
            markAllNotificationsRead,
            activeConversationId: activeId,
            setActiveConversationId: setActiveId,
            reloadConversations: loadConversations,
            darkMode: dark,
            toggleDark,
          }}
        />
      </div>
    </div>
  )
}

export default PatientLayout
