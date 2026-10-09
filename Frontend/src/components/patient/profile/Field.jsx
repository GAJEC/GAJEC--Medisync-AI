import React from 'react'

const Field = ({ label, htmlFor, full = false, children }) => {
  return (
    <div className={`field ${full ? 'field--full' : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  )
}

export default Field