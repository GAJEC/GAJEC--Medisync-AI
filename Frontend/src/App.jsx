import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import PatientRoutes from './routes/PatientRoutes'
import StaffRoutes from './routes/StaffRoutes'
import Login from './pages/auth/Authentication'

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/patient/*" element={<PatientRoutes />} />
            {StaffRoutes()}
            <Route path="*" element={null} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
