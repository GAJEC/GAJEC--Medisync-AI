import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import PatientSidebar from './PatientSidebar'

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

const PatientLayout = () => {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(false)
  const [activeId, setActiveId] = useState(1)
  const [user, setUser] = useState(USER)
  const [notifications, setNotifications] = useState(NOTIFICATIONS)

  const unreadCount = notifications.filter((n) => !n.read).length

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
  }

  const updateUser = (changes) => setUser((u) => ({ ...u, ...changes }))

  const openConversation = (id) => {
    setActiveId(id)
    navigate('/patient')
  }

  const newConversation = () => {
    setActiveId(null)
    navigate('/patient')
  }

  return (
    <div className="app-shell">
      <PatientSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        user={user}
        conversations={CONVERSATIONS}
        activeId={activeId}
        onNewConversation={newConversation}
        onSelectConversation={openConversation}
        darkMode={dark}
        onToggleDark={toggleDark}
        onLogout={() => console.log('logout')}
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