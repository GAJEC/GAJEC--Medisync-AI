import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { hasHome, homeFor, isPublicPath, rolesFor } from '../auth/roles'

const ProtectedRoute = () => {
  const { session, status } = useAuth()
  const { pathname } = useLocation()

  // Development only: skip auth and role checks so /login, /patient/* and /staff/*
  // are all directly reachable. Vite sets DEV to false in production builds.
  if (import.meta.env.DEV && (isPublicPath(pathname) || rolesFor(pathname))) {
    return <Outlet />
  }

  if (status === 'loading') {
    return (
      <div role="status" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: '#687b78' }}>
        Loading…
      </div>
    )
  }

  const signedIn = session && hasHome(session.role)

  if (isPublicPath(pathname)) {
    return signedIn ? <Navigate to={homeFor(session.role)} replace /> : <Outlet />
  }

  if (!signedIn) return <Navigate to="/login" replace />

  const allowed = rolesFor(pathname)
  if (!allowed || !allowed.includes(session.role)) {
    return <Navigate to={homeFor(session.role)} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
