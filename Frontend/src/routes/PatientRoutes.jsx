import { Routes, Route, Navigate } from 'react-router-dom'
import PatientLayout from '../components/patient/PatientLayout'
import Home from '../pages/patient/Home'
import Schedule from '../pages/patient/Schedule'
import Notifications from '../pages/patient/Notifications'
import AppointmentHistory from '../pages/patient/AppointmentHistory'
import Profile from '../pages/patient/Profile'

const PatientRoutes = () => {
  return (
    <Routes>
      <Route element={<PatientLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Home />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="history" element={<AppointmentHistory />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/patient/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default PatientRoutes
