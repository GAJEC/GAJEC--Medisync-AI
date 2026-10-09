import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import PatientLayout from '../components/patient/PatientLayout'
import Home from '../pages/patient/Home'
import Schedule from '../pages/patient/Schedule'

const PatientRoutes = () => {
  return (
    <Routes>
      <Route element={<PatientLayout />}>
        <Route index element={<Home />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="*" element={<Navigate to="/patient" replace />} />
      </Route>
    </Routes>
  )
}

export default PatientRoutes