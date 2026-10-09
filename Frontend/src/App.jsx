import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import Login from './pages/auth/Authentication'

const PatientRoutes = lazy(() => import('./routes/PatientRoutes'))
const StaffRoutes = lazy(() => import('./routes/StaffRoutes'))

const loading = (
  <div role="status" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: '#687b78' }}>
    Loading…
  </div>
)

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={loading}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/patient/*" element={<PatientRoutes />} />
              <Route path="/staff/*" element={<StaffRoutes />} />
              <Route path="*" element={null} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
