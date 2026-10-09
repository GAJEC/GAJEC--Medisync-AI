import React, { useEffect, useId } from 'react'
import { CloseIcon } from './Icons'

import ModalStyle from '../../assets/styles/modal.module.css'
import SidebarStyle from '../../assets/styles/sidebar.module.css'

const Modal = ({ eyebrow = 'MediSync AI', title, onClose, footer, children }) => {
  const titleId = useId()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={ModalStyle['modal-overlay']} onMouseDown={onClose}>
      <div
        className={ModalStyle['modal']}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={ModalStyle['modal__head']}>
          <div>
            <p className={ModalStyle['modal__eyebrow']}>{eyebrow}</p>
            <h2 id={titleId} className={ModalStyle['modal__title']}>{title}</h2>
          </div>
          <button className={SidebarStyle['icon-btn']} onClick={onClose} aria-label="Close">
            <CloseIcon width={18} height={18} />
          </button>
        </header>

        <div className={`${ModalStyle['modal__body']} ${ModalStyle['modal__stack']}`}>{children}</div>

        {footer && <footer className={ModalStyle['modal__foot']}>{footer}</footer>}
      </div>
    </div>
  )
}

export default Modal