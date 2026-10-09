import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import PatientSidebar from './PatientSidebar'

const USER = { name: 'Sofia Reyes', initials: 'SR', role: 'Patient', id: 'P-20481' }

const CONVERSATIONS = [
  { id: 1, title: 'Recurring headache concern', group: 'Today' },
  { id: 2, title: 'General checkup request', group: 'Yesterday' },
  { id: 3, title: 'Follow-up appointment', group: 'Previous 7 days' },
]

const PatientLayout = () => {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(false)
  const [activeId, setActiveId] = useState(1)

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
  }

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
        user={USER}
        conversations={CONVERSATIONS}
        activeId={activeId}
        onNewConversation={newConversation}
        onSelectConversation={openConversation}
        darkMode={dark}
        onToggleDark={toggleDark}
        onLogout={() => console.log('logout')}
        unreadCount={3}
      />

      <div className="main">
        <Outlet context={{ user: USER }} />
      </div>
    </div>
  )
}

export default PatientLayout