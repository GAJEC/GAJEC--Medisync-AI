import React from 'react'
import ProfileStyle from '../../../assets/styles/profile.module.css'

const Field = ({ label, htmlFor, full = false, children }) => {
  return (
    <div className={`${ProfileStyle['field']} ${full ? ProfileStyle['field--full'] : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  )
}

export default Field