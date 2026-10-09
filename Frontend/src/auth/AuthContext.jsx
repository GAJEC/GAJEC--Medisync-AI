import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { authApi } from '../api/client'
import { applyTheme, animateTheme } from './theme'

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
  theme: user.theme === 'dark' ? 'dark' : 'light',
  user,
  token,
})

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  // Latest session for callbacks that must not change identity (setTheme).
  const sessionRef = useRef(null)
  useEffect(() => {
    sessionRef.current = session
  }, [session])
  // 'loading' while a stored token is being checked, then 'ready'
  const [status, setStatus] = useState(() => (storage.get() ? 'loading' : 'ready'))

  const logout = useCallback(() => {
    const token = storage.get()
    // Revoke the session server-side; sign out locally even if that fails
    if (token) authApi.logout(token).catch(() => {})
    storage.set(null)
    setSession(null)
    applyTheme('light')
  }, [])

  // Apply the account's saved appearance whenever the signed-in user changes.
  useEffect(() => {
    if (session) applyTheme(session.theme)
  }, [session])

  // Switches light / dark right away (animated from `origin`, the clicked button) and saves it to the
  // account. Reverts if saving fails.
  const setTheme = useCallback(async (theme, origin) => {
    const current = sessionRef.current
    if (!current) return
    const previous = current.theme
    // The session update must happen inside the view transition (flushSync makes React commit
    // synchronously there); otherwise the re-render applies the theme before the "old" snapshot.
    const commitTheme = (t) => () =>
      flushSync(() => setSession((s) => (s ? { ...s, theme: t, user: { ...s.user, theme: t } } : s)))
    animateTheme(theme, origin, commitTheme(theme))
    try {
      await authApi.updateTheme(current.token, theme)
    } catch (error) {
      animateTheme(previous, undefined, commitTheme(previous))
      throw error
    }
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
    () => ({ session, status, logout, signIn, signUp, updateSessionUser, setTheme }),
    [session, status, logout, signIn, signUp, updateSessionUser, setTheme],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
