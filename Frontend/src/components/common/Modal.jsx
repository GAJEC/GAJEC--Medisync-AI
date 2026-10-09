import React, { useEffect, useId } from 'react'
import { CloseIcon } from './Icons'

import '../../assets/styles/modal.css'

const Modal = ({ eyebrow = 'HealthLocal AI', title, onClose, footer, children }) => {
  const titleId = useId()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <div>
            <p className="modal__eyebrow">{eyebrow}</p>
            <h2 id={titleId} className="modal__title">{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon width={18} height={18} />
          </button>
        </header>

        <div className="modal__body modal__stack">{children}</div>

        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  )
}

export default Modal