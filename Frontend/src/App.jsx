import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PatientRoutes from './routes/PatientRoutes'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/patient/*" element={<PatientRoutes />} />
        <Route path="*" element={<Navigate to="/patient" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App