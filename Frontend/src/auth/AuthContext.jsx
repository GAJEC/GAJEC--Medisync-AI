import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/client'

const TOKEN_KEY = 'medisync.token'
const LEGACY_SESSION_KEY = 'medisync.session'

const storage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch { }
  },
}

try {
  localStorage.removeItem(LEGACY_SESSION_KEY)
} catch {
  /* ignore */
}

const toSession = (user, token) => ({
  role: user.role,
  email: user.email,
  name: `${user.firstname} ${user.lastname}`.trim(),
  user,
  token,
})

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  // 'loading' while a stored token is being checked, then 'ready'
  const [status, setStatus] = useState(() => (storage.get() ? 'loading' : 'ready'))

  const logout = useCallback(() => {
    const token = storage.get()
    // Revoke the session server-side; sign out locally even if that fails
    if (token) authApi.logout(token).catch(() => {})
    storage.set(null)
    setSession(null)
  }, [])

  // Replace the cached user after a profile edit (e.g. name or email changed)
  const updateSessionUser = useCallback((changes) => {
    setSession((current) => (current ? toSession({ ...current.user, ...changes }, current.token) : current))
  }, [])

  useEffect(() => {
    const token = storage.get()
    if (!token) return
    let cancelled = false
    authApi
      .me(token)
      .then(({ user }) => {
        if (!cancelled) setSession(toSession(user, token))
      })
      .catch((error) => {
        if (!cancelled && (error.status === 401 || error.status === 404)) storage.set(null)
      })
      .finally(() => {
        if (!cancelled) setStatus('ready')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Backend login: POST /api/auth/login
  const signIn = useCallback(async (email, password) => {
    const { token, user } = await authApi.login(email, password)
    storage.set(token)
    const next = toSession(user, token)
    setSession(next)
    return next
  }, [])

  // Backend register, then sign in with the same credentials
  const signUp = useCallback(
    async ({ firstname, lastname, email, password }) => {
      await authApi.register({ firstname, lastname, email, password })
      return signIn(email, password)
    },
    [signIn],
  )

  const value = useMemo(
    () => ({ session, status, logout, signIn, signUp, updateSessionUser }),
    [session, status, logout, signIn, signUp, updateSessionUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
