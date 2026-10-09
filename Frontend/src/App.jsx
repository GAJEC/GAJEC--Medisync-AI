import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth, homeFor } from './auth/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import PatientRoutes from './routes/PatientRoutes'
import Login from './pages/auth/Login'


const LoginRoute = () => {
  const { session, login } = useAuth()

  if (session) return <Navigate to={homeFor(session.role)} replace />

  return (
    <Login
      onLogin={({ role, email }) => login({ role, email })}
      onSignup={({ fullName, email }) => login({ role: 'patient', email, name: fullName })}
    />
  )
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


          {/* Anything else (including "/") -> login, which forwards signed-in users home */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App