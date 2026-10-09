import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'

// Loads data for a staff page and reloads it whenever `deps` change.
//   const { data, error, loading, reload, token } = useStaffData((token) => staffApi.doctors(token), [])
// Responses that arrive after a newer request started are ignored.
export function useStaffData(load, deps = []) {
  const { session } = useAuth()
  const token = session?.token
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const requestId = useRef(0)
  // Latest loader; the request re-runs when the token or the serialized deps change.
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })
  const key = JSON.stringify(deps)

  const reload = useCallback(async () => {
    if (!token) {
      setLoading(false)
      setError('Sign in with a staff account to load this page.')
      return
    }
    const id = ++requestId.current
    setLoading(true)
    try {
      const result = await loadRef.current(token)
      if (id === requestId.current) {
        setData(result)
        setError('')
      }
    } catch (err) {
      if (id === requestId.current) setError(err.message)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
    // `key` stands in for the caller's deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, key])

  // Fetching is synchronizing with an external system (the API); reload only sets state
  // after awaiting, apart from the loading flag.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload()
  }, [reload])

  return { data, error, loading, reload, token }
}

// Delays a fast-changing value (e.g. search box) so the API is not called on every keystroke.
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export const formatDateTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

// Local "YYYY-MM-DD"
export const isoDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
