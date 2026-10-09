import { useState } from 'react'
import Modal from '../common/Modal'
import ModalStyle from '../../assets/styles/modal.module.css'
import ProfileStyle from '../../assets/styles/profile.module.css'
import SidebarStyle from '../../assets/styles/sidebar.module.css'

const DeleteConversationModal = ({ conversation, onConfirm, onClose }) => {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const confirm = async () => {
    setDeleting(true)
    setError('')
    try {
      await onConfirm(conversation.id)
      onClose()
    } catch (err) {
      setError(err.message || 'The conversation could not be deleted. Please try again.')
      setDeleting(false)
    }
  }

  const close = () => {
    if (!deleting) onClose()
  }

  return (
    <Modal
      title="Delete conversation?"
      onClose={close}
      footer={
        <>
          <button className={SidebarStyle['btn-outline']} onClick={close} disabled={deleting}>
            Cancel
          </button>
          <button className={ModalStyle['btn-danger']} onClick={confirm} disabled={deleting} autoFocus>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </>
      }
    >
      <div className={ModalStyle['modal__summary-plain']}>
        <span className={ModalStyle['modal__label']}>Conversation</span>
        <span className={ModalStyle['modal__value']}>{conversation.title}</span>
      </div>
      <p className={ModalStyle['modal__text']}>
        This permanently deletes the conversation and all of its messages, including Syncia's replies. It
        cannot be undone. To hide it without deleting, use Archive instead.
      </p>
      {error && (
        <p className={ProfileStyle['form-error']} role="alert">
          {error}
        </p>
      )}
    </Modal>
  )
}

export default DeleteConversationModal
