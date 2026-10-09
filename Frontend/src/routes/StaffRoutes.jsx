
import { Route, Navigate } from 'react-router-dom'

import ProtectedRoute from './ProtectedRoute'
import StaffLayout from '../components/staff/StaffLayout'


import Dashboard from '../pages/staff/Dashboard'
import Appointments from '../pages/staff/Appointments'
import AiIntake from '../pages/staff/AiIntake'
import Doctors from '../pages/staff/Doctors'
import Scheduling from '../pages/staff/Scheduling'
import Patients from '../pages/staff/Patients'
import Departments from '../pages/staff/Departments'
import Reports from '../pages/staff/Reports'
import StaffPermissions from '../pages/staff/StaffPermissions'

const StaffRoutes = () => (
  <Route
    path="/staff"
    element={
      <ProtectedRoute role="staff">
        <StaffLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="appointments" element={<Appointments />} />
    <Route path="ai-intake" element={<AiIntake />} />
    <Route path="doctors" element={<Doctors />} />
    <Route path="scheduling" element={<Scheduling />} />
    <Route path="patients" element={<Patients />} />
    <Route path="departments" element={<Departments />} />
    <Route path="reports" element={<Reports />} />
    <Route path="permissions" element={<StaffPermissions />} />
  </Route>
)

export default StaffRoutes
