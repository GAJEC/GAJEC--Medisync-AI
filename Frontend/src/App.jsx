
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth, homeFor } from './auth/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import PatientRoutes from './routes/PatientRoutes'
import StaffRoutes from './routes/StaffRoutes'
import Login from './pages/auth/Authentication'

const LoginRoute = () => {
  const { session } = useAuth()

  if (session) {
    return <Navigate to={homeFor(session.role)} replace />
  }

  return <Login />
}

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />

          <Route
            path="/patient/*"
            element={
              <ProtectedRoute role="patient">
                <PatientRoutes />
              </ProtectedRoute>
            }
          />

          {StaffRoutes()}

          <Route
            path="*"
            element={<Navigate to="/login" replace />}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
