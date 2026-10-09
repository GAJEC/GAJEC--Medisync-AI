import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, homeFor } from '../auth/AuthContext'

const ProtectedRoute = ({ role, children }) => {
  const { session } = useAuth()
  const location = useLocation()

  // Not signed in -> login
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />

  // Signed in but wrong area (e.g. a patient opening /staff) -> their own home
  if (role && session.role !== role) return <Navigate to={homeFor(session.role)} replace />

  return children
}

export default ProtectedRoute