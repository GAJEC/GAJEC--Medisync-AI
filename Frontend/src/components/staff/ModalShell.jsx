import { useEffect } from "react";
import StaffStyle from "../../assets/styles/Staff.module.css";

// Shared pop-up frame for staff pages. Closes on Escape and on backdrop click.
export default function ModalShell({ titleId, title, onClose, children, footer, as: Tag = "div", onSubmit }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={StaffStyle['st-overlay']} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <Tag className={StaffStyle['st-modal']} role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={onSubmit}>
        <header className={StaffStyle['st-modal__head']}>
          <div>
            <p className={StaffStyle['st-modal__brand']}>MediSync AI</p>
            <h2 id={titleId} className={StaffStyle['st-modal__title']}>{title}</h2>
          </div>
          <button type="button" className={StaffStyle['st-modal__close']} onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className={StaffStyle['st-modal__body']}>{children}</div>
        <footer className={StaffStyle['st-modal__foot']}>{footer}</footer>
      </Tag>
    </div>
  );
}
