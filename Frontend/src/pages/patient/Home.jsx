import React, { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  PngIcon,
  ShieldCheckIcon,
  PaperclipIcon,
  SendIcon,
  UploadIcon,
  MicIcon,
  StopIcon,
  CloseIcon,
  FileTextIcon,
} from '../../components/common/Icons'

import heartIcon from '../../assets/icons/heart.png'
import heartBeatIcon from '../../assets/icons/heart-beat.png'
import stetIcon from '../../assets/icons/stet.png'
import scheduleIcon from '../../assets/icons/schedule.png'
import nextIcon from '../../assets/icons/next.png'
import aiIcon from '../../assets/icons/ai.png'

import '../../assets/styles/home.css'

const SUGGESTIONS = [
  { icon: heartBeatIcon, text: 'I have a headache.' },
  { icon: heartIcon, text: "I've been experiencing stomach pain." },
  { icon: stetIcon, text: "I'd like a general checkup." },
  { icon: scheduleIcon, text: 'I want to book a follow-up appointment.' },
]

const MAX_FILES = 5
const MAX_MB = 10
const MAX_RECORD_S = 120

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const Home = () => {
  const { user } = useOutletContext()
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')

  const menuRef = useRef(null)
  const fileRef = useRef(null)
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const discardRef = useRef(false)
  const attachmentsRef = useRef([])
  attachmentsRef.current = attachments

  // Close the attach menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // Auto-stop long recordings
  useEffect(() => {
    if (recording && seconds >= MAX_RECORD_S) stopRecording()
  }, [recording, seconds])

  // Cleanup on leaving the page
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      discardRef.current = true
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.url))
    }
  }, [])

  const addFiles = (fileList) => {
    const room = MAX_FILES - attachmentsRef.current.length
    const next = []
    let problem = ''

    for (const file of Array.from(fileList)) {
      if (next.length >= room) {
        problem = `You can attach up to ${MAX_FILES} files.`
        break
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        problem = `${file.name} is larger than ${MAX_MB} MB.`
        continue
      }
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        kind: file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'file',
        url: URL.createObjectURL(file),
      })
    }

    setError(problem)
    if (next.length) setAttachments((list) => [...list, ...next])
  }

  const removeAttachment = (id) => {
    setAttachments((list) => {
      const target = list.find((a) => a.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return list.filter((a) => a.id !== id)
    })
    setError('')
  }

  const onPickFiles = (e) => {
    addFiles(e.target.files)
    e.target.value = '' // allow picking the same file again
  }

  const startRecording = async () => {
    setMenuOpen(false)
    setError('')

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Audio recording is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      discardRef.current = false

      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        if (discardRef.current) return
        const type = recorder.mimeType || 'audio/webm'
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
        addFiles([new File(chunksRef.current, `voice-note-${Date.now()}.${ext}`, { type })])
      }

      recorder.start()
      setSeconds(0)
      setRecording(true)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      setError('Microphone access was blocked. Allow it in your browser settings and try again.')
    }
  }

  const stopRecording = () => {
    clearInterval(timerRef.current)
    setRecording(false)
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const cancelRecording = () => {
    discardRef.current = true
    stopRecording()
  }

  const send = (text) => {
    const value = text.trim()
    if (!value && attachments.length === 0) return
    // TODO: connect to the AI / backend endpoint.
    // Upload attachments with FormData, e.g. attachments.forEach((a) => form.append('files', a.file))
    console.log('send:', value, attachments.map((a) => a.file.name))
    setMessage('')
    attachments.forEach((a) => URL.revokeObjectURL(a.url))
    setAttachments([])
    setError('')
  }

  return (
    <>
      <header className="topbar">
        <span className="topbar__icon">
          <PngIcon src={aiIcon} size={16} className="icon-teal" />
        </span>
        <div className="topbar__text">
          <div className="topbar__title">Your Health, Guided by Syncia</div>
          <div className="topbar__sub">Secure symptom intake and hospital appointment routing</div>
        </div>
        <span className="secure-pill">
          <ShieldCheckIcon width={13} height={13} />
          Your information is handled securely
        </span>
      </header>

      <main className="hero">
        <div className="hero__logo">
          <PngIcon src={heartIcon} size={26} className="icon-white" />
          <span className="hero__badge">
            <PngIcon src={aiIcon} size={9} className="icon-white" />
          </span>
        </div>

        <p className="hero__eyebrow">Your care companion</p>
        <h1 className="hero__title">Hi {user.name.split(' ')[0]}, how are you feeling?</h1>
        <p className="hero__lead">
          I'm your MediSync AI assistant. I can help you find appropriate care at your
          hospital and arrange a visit.
        </p>

        <div className="privacy">
          <ShieldCheckIcon width={15} height={15} />
          <div>
            <strong>Your privacy matters.</strong>
            <span>
              Your answers are used to route your appointment and can be reviewed by authorized
              hospital staff.
            </span>
          </div>
        </div>

        <p className="hero__try">Try telling me...</p>
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s.text} className="suggestion" onClick={() => setMessage(s.text)}>
              <span className="suggestion__icon">
                <PngIcon src={s.icon} size={16} className="icon-teal" />
              </span>
              <span className="suggestion__text">{s.text}</span>
              <PngIcon src={nextIcon} size={12} className="icon-muted" />
            </button>
          ))}
        </div>
      </main>

      <footer className="composer-wrap">
        {attachments.length > 0 && (
          <ul className="attachments" aria-label="Attachments">
            {attachments.map((a) => (
              <li key={a.id} className="chip">
                {a.kind === 'image' ? (
                  <img src={a.url} alt="" className="chip__thumb" />
                ) : (
                  <span className="chip__icon">
                    {a.kind === 'audio' ? <MicIcon width={15} height={15} /> : <FileTextIcon width={15} height={15} />}
                  </span>
                )}
                <span className="chip__name">{a.file.name}</span>
                <button
                  className="icon-btn"
                  onClick={() => removeAttachment(a.id)}
                  aria-label={`Remove ${a.file.name}`}
                >
                  <CloseIcon width={14} height={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="composer__error" role="alert">{error}</p>}

        <div className="composer">
          {recording ? (
            <>
              <span className="rec-dot" aria-hidden="true" />
              <span className="rec-time" role="timer">Recording {formatTime(seconds)}</span>
              <button className="icon-btn" onClick={cancelRecording} aria-label="Discard recording">
                <CloseIcon width={18} height={18} />
              </button>
              <button
                className="composer__send composer__send--stop"
                onClick={stopRecording}
                aria-label="Stop and attach recording"
              >
                <StopIcon width={16} height={16} />
              </button>
            </>
          ) : (
            <>
              <div className="attach" ref={menuRef}>
                <button
                  className="icon-btn"
                  aria-label="Attach"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((o) => !o)}
                >
                  <PaperclipIcon width={18} height={18} />
                </button>

                {menuOpen && (
                  <div className="attach__menu" role="menu">
                    <button
                      role="menuitem"
                      className="attach__item"
                      onClick={() => {
                        setMenuOpen(false)
                        fileRef.current?.click()
                      }}
                    >
                      <span className="attach__icon"><UploadIcon width={17} height={17} /></span>
                      <span>
                        <span className="attach__title">Upload files or images</span>
                        <span className="attach__sub">JPG, PNG, PDF · up to {MAX_MB} MB</span>
                      </span>
                    </button>
                    <button role="menuitem" className="attach__item" onClick={startRecording}>
                      <span className="attach__icon"><MicIcon width={17} height={17} /></span>
                      <span>
                        <span className="attach__title">Record audio</span>
                        <span className="attach__sub">Add a voice note, up to 2 minutes</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send(message)}
                placeholder="Describe your symptoms or ask about an appointment…"
              />
              <button className="composer__send" onClick={() => send(message)} aria-label="Send">
                <SendIcon width={16} height={16} />
              </button>
            </>
          )}
        </div>

        <input ref={fileRef} type="file" hidden multiple accept="image/*,.pdf" onChange={onPickFiles} />
        <p className="disclaimer">AI guidance does not replace professional medical advice.</p>
      </footer>
    </>
  )
}

export default Home