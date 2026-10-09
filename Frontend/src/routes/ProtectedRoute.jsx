import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { hasHome, homeFor, isPublicPath, rolesFor } from '../auth/roles'

const ProtectedRoute = () => {
  const { session, status } = useAuth()
  const { pathname } = useLocation()

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
