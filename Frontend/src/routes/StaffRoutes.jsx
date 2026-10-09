import { Routes, Route, Navigate } from 'react-router-dom'

import StaffLayout from '../components/staff/StaffLayout'

import Dashboard from '../pages/staff/Dashboard'
import Appointments from '../pages/staff/Appointments'
import Doctors from '../pages/staff/Doctors'
import Scheduling from '../pages/staff/Scheduling'
import Patients from '../pages/staff/Patients'
import Departments from '../pages/staff/Departments'
import Reports from '../pages/staff/Reports'

const StaffRoutes = () => (
  <Routes>
    <Route element={<StaffLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="appointments" element={<Appointments />} />
      <Route path="doctors" element={<Doctors />} />
      <Route path="scheduling" element={<Scheduling />} />
      <Route path="patients" element={<Patients />} />
      <Route path="departments" element={<Departments />} />
      <Route path="reports" element={<Reports />} />
      <Route path="*" element={<Navigate to="/staff/dashboard" replace />} />
    </Route>
  </Routes>
)

export default StaffRoutes
