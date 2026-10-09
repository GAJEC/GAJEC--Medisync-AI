import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/client'

const STORAGE_KEY = 'medisync.session'
const AuthContext = createContext(null)

const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

const saveSession = (session) => {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable: session lasts until refresh */
  }
}

const sessionFromUser = (user, token) => ({
  role: 'patient',
  email: user.email,
  name: `${user.firstname} ${user.lastname}`.trim(),
  user,
  token,
})

export const homeFor = (role) => (role === 'staff' ? '/staff' : '/patient')

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(readSession)

  // Local-only login (used by the demo staff shortcut; no backend token)
  const login = useCallback(({ role, email, name }) => {
    const next = { role, email, name }
    saveSession(next)
    setSession(next)
  }, [])

  const logout = useCallback(() => {
    saveSession(null)
    setSession(null)
  }, [])

  // Backend login: POST /api/auth/login
  const signIn = useCallback(async (email, password) => {
    const { token, user } = await authApi.login(email, password)
    const next = sessionFromUser(user, token)
    saveSession(next)
    setSession(next)
    return next
  }, [])

  // Backend register, then sign in with the same credentials
  const signUp = useCallback(async ({ firstname, lastname, email, password }) => {
    await authApi.register({ firstname, lastname, email, password })
    return signIn(email, password)
  }, [signIn])

  // On app load, make sure a stored token is still valid (it expires after JWT_EXPIRES_IN)
  const token = session?.token
  useEffect(() => {
    if (!token) return
    let cancelled = false
    authApi.me(token).then(
      ({ user }) => {
        if (cancelled) return
        setSession((prev) => {
          if (!prev || prev.token !== token) return prev
          const next = sessionFromUser(user, token)
          saveSession(next)
          return next
        })
      },
      (error) => {
        if (!cancelled && error.status === 401) logout()
      },
    )
    return () => {
      cancelled = true
    }
  }, [token, logout])

  const value = useMemo(
    () => ({ session, login, logout, signIn, signUp }),
    [session, login, logout, signIn, signUp],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
