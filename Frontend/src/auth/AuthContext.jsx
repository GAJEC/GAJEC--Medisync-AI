import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

const STORAGE_KEY = 'medisync.session'
const AuthContext = createContext(null)

const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

export const homeFor = (role) => (role === 'staff' ? '/staff' : '/patient')

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(readSession)

  const login = useCallback(({ role, email, name }) => {
    const next = { role, email, name }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* storage unavailable: session lasts until refresh */
    }
    setSession(next)
  }, [])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setSession(null)
  }, [])

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}