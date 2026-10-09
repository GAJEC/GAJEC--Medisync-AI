import React from 'react'

// Inline SVGs for icons that are not in assets/icons, plus a helper for the PNG icons.
const svgProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const ChatIcon = (props) => {
  return (
    <svg {...svgProps} {...props}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z" />
    </svg>
  )
}

export const ChevronLeftIcon = (props) => {
  return (
    <svg {...svgProps} {...props}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

export const MoreIcon = (props) => {
  return (
    <svg {...svgProps} {...props} fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  )
}

export const HelpIcon = (props) => {
  return (
    <svg {...svgProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7" />
      <path d="M12 17h.01" />
    </svg>
  )
}

export const ShieldCheckIcon = (props) => {
  return (
    <svg {...svgProps} {...props}>
      <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export const PaperclipIcon = (props) => {
  return (
    <svg {...svgProps} {...props}>
      <path d="m21 11-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8" />
    </svg>
  )
}

export const SendIcon = (props) => {
  return (
    <svg {...svgProps} {...props}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  )
}

// PNG icon from src/assets/icons. Usage: <PngIcon src={scheduleIcon} size={16} />
export const PngIcon = ({ src, size = 16, className = '', alt = '' }) => {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`png-icon ${className}`}
      draggable="false"
    />
  )
}

export const ChevronRightIcon = (props) => {
  return (
    <svg {...svgProps} {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export const PlusIcon = (props) => {
  return (
    <svg {...svgProps} {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export const CloseIcon = (props) => {
  return (
    <svg {...svgProps} {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

export const LockIcon = (props) => {
  return (
    <svg {...svgProps} {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export const UsersIcon = (props) => {
  return (
    <svg {...svgProps} {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6" />
      <path d="M18 14.3c1.8.8 3 2.5 3 4.7" />
    </svg>
  )
}

export const FileTextIcon = (props) => {
  return (
    <svg {...svgProps} {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  )
}