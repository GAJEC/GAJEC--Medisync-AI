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

import { patientApi } from '../../api/client'
import { AssistantAvatar, AssistantThinking, TypewriterText } from '../../components/patient/AssistantTyping'

import HomeStyle from '../../assets/styles/home.module.css'
import SidebarStyle from '../../assets/styles/sidebar.module.css'

const SUGGESTIONS = [
  { icon: heartBeatIcon, text: 'I have a headache.' },
  { icon: heartIcon, text: "I've been experiencing stomach pain." },
  { icon: stetIcon, text: "I'd like a general checkup." },
  { icon: scheduleIcon, text: 'I want to book a follow-up appointment.' },
]

// Limits match the AI service (AI/app/media.py, AI/app/config.py):
// MedGemma analyses one JPEG/PNG/WebP photo up to 10 MB; Whisper takes up to 120 s of audio.
const MAX_FILES = 1
const MAX_MB = 10
const MAX_RECORD_S = 120
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const Home = () => {
  const { token, user, activeConversationId, setActiveConversationId, reloadConversations } = useOutletContext()
  const [message, setMessage] = useState('')
  const [loaded, setLoaded] = useState({ id: null, messages: [] })
  const [sending, setSending] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [triage, setTriage] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [sentFiles, setSentFiles] = useState({})
  const [menuOpen, setMenuOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pendingImage, setPendingImage] = useState(null)
  const [transcribing, setTranscribing] = useState(false)
  const [typingId, setTypingId] = useState(null)

  const threadRef = useRef(null)
  const stickRef = useRef(true)
  const menuRef = useRef(null)
  const fileRef = useRef(null)
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const discardRef = useRef(false)
  const attachmentsRef = useRef([])
  attachmentsRef.current = attachments
  const sentFilesRef = useRef({})
  useEffect(() => {
    sentFilesRef.current = sentFiles
  }, [sentFiles])

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

  useEffect(() => {
    if (recording && seconds >= MAX_RECORD_S) stopRecording()
  }, [recording, seconds])

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      discardRef.current = true
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.url))
      Object.values(sentFilesRef.current).flat().forEach((a) => URL.revokeObjectURL(a.url))
    }
  }, [])

  const addFiles = (fileList) => {
    const room = MAX_FILES - attachmentsRef.current.length
    const next = []
    let problem = ''

    for (const file of Array.from(fileList)) {
      if (next.length >= room) {
        problem = 'You can attach one photo per message.'
        break
      }
      if (!IMAGE_TYPES.includes(file.type)) {
        problem = `${file.name} is not a JPEG, PNG or WebP photo.`
        continue
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
    e.target.value = ''
  }

  const transcribeRecording = async (audio) => {
    setTranscribing(true)
    setError('')
    try {
      const { text, warnings } = await patientApi.transcribe(token, audio)
      if (!text.trim()) {
        setError(warnings?.[warnings.length - 1] || 'No speech was recognised. Please try again.')
        return
      }
      setMessage((current) => [current.trim(), text.trim()].filter(Boolean).join(' ').slice(0, 4000))
      setNotice('Check the transcript before sending. Speech recognition can mishear words.')
    } catch (err) {
      setError(err.message)
    } finally {
      setTranscribing(false)
    }
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
        transcribeRecording(new File(chunksRef.current, `voice-note-${Date.now()}.${ext}`, { type }))
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

  const thread = activeConversationId && loaded.id === activeConversationId ? loaded.messages : []

  const onThreadScroll = () => {
    const el = threadRef.current
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const scrollToBottom = (smooth = false) => {
    const el = threadRef.current
    if (el && stickRef.current) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }

  useEffect(() => {
    const el = threadRef.current
    if (el && stickRef.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [thread.length, thinking, loaded.id])

  useEffect(() => {
    if (!activeConversationId) return
    let cancelled = false
    patientApi
      .conversation(token, activeConversationId)
      .then(({ conversation }) => !cancelled && setLoaded({ id: conversation.id, messages: conversation.messages }))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [token, activeConversationId])

  const askAssistant = async (conversationId, image) => {
    const progressId = crypto.randomUUID()
    setThinking(progressId)
    setError('')
    try {
      const { message: reply, triage: result } = await patientApi.requestReply(token, conversationId, image, progressId)
      setTypingId(reply.id)
      setLoaded((l) => (l.id === conversationId ? { ...l, messages: [...l.messages, reply] } : l))
      setTriage({ conversationId, ...result })
      setPendingImage(null)
      reloadConversations()
    } catch (err) {
      setError(err.message)
    } finally {
      setThinking(false)
    }
  }

  const send = async (text) => {
    const value = text.trim()
    if (sending || thinking || transcribing) return
    if (!value) {
      if (attachments.length) setError('Describe what the photo shows or how you feel, then send.')
      return
    }
    const image = attachments.find((a) => a.kind === 'image')?.file || null
    setSending(true)
    setError('')
    setNotice('')
    stickRef.current = true
    let conversationId = activeConversationId
    let savedId
    try {
      if (conversationId) {
        const { message: saved } = await patientApi.sendMessage(token, conversationId, value)
        savedId = saved.id
        setLoaded((l) => ({ ...l, messages: [...l.messages, saved] }))
      } else {
        const { conversation } = await patientApi.startConversation(token, value)
        conversationId = conversation.id
        savedId = conversation.messages[conversation.messages.length - 1]?.id
        setLoaded({ id: conversation.id, messages: conversation.messages })
        setActiveConversationId(conversation.id)
      }
      reloadConversations()
      setMessage('')
      if (attachments.length && savedId != null) {
        const files = attachments.map(({ id, kind, url, file }) => ({ id, kind, url, name: file.name }))
        setSentFiles((map) => ({ ...map, [savedId]: files }))
      } else {
        attachments.forEach((a) => URL.revokeObjectURL(a.url))
      }
      setAttachments([])
    } catch (err) {
      setError(err.message)
      setSending(false)
      return
    }
    setSending(false)
    setPendingImage(image ? { conversationId, file: image } : null)
    await askAssistant(conversationId, image)
  }

  const retryReply = () => {
    const image = pendingImage?.conversationId === activeConversationId ? pendingImage.file : null
    askAssistant(activeConversationId, image)
  }

  const awaitingReply = thread.length > 0 && thread[thread.length - 1].sender === 'patient'
  const shownTriage = triage && triage.conversationId === activeConversationId ? triage : null

  return (
    <>
      <header className={HomeStyle['topbar']}>
        <span className={HomeStyle['topbar__icon']}>
          <PngIcon src={aiIcon} size={16} className={HomeStyle['icon-teal']} />
        </span>
        <div className={HomeStyle['topbar__text']}>
          <div className={HomeStyle['topbar__title']}>Your Health, Guided by Syncia</div>
          <div className={HomeStyle['topbar__sub']}>Secure symptom intake and hospital appointment routing</div>
        </div>
        <span className={HomeStyle['secure-pill']}>
          <ShieldCheckIcon width={13} height={13} />
          Your information is handled securely
        </span>
      </header>

      {thread.length > 0 ? (
        <main className={HomeStyle['thread']} ref={threadRef} onScroll={onThreadScroll} aria-live="polite">
          {thread.map((m) => {
            const files = sentFiles[m.id]
            const mine = m.sender === 'patient'
            if (!mine) {
              return (
                <div key={m.id} className={`${HomeStyle['msg']} ${HomeStyle['msg--ai']} ${HomeStyle['msg--enter']}`}>
                  <AssistantAvatar />
                  <div className={HomeStyle['bubble']}>
                    <span className={HomeStyle['sr-only']}>Syncia: </span>
                    {m.id === typingId ? (
                      <TypewriterText text={m.body} onProgress={scrollToBottom} onDone={() => setTypingId(null)} />
                    ) : (
                      m.body
                    )}
                  </div>
                </div>
              )
            }
            return (
              <div key={m.id} className={`${HomeStyle['msg']} ${HomeStyle['msg--me']} ${HomeStyle['msg--enter']}`}>
                {files?.length > 0 && (
                  <div className={HomeStyle['msg__files']}>
                    {files.map((f) =>
                      f.kind === 'image' ? (
                        <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className={HomeStyle['msg__image']}>
                          <img src={f.url} alt={f.name} />
                        </a>
                      ) : f.kind === 'audio' ? (
                        <audio key={f.id} src={f.url} controls className={HomeStyle['msg__audio']} />
                      ) : (
                        <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className={HomeStyle['msg__file']}>
                          <FileTextIcon width={15} height={15} />
                          <span>{f.name}</span>
                        </a>
                      ),
                    )}
                  </div>
                )}
                <div className={`${HomeStyle['bubble']} ${mine ? HomeStyle['bubble--me'] : ''}`}>{m.body}</div>
              </div>
            )
          })}

          {shownTriage?.urgency === 'emergency' && !typingId && (
            <div className={HomeStyle['triage-alert']} role="alert">
              <strong>This may be an emergency.</strong>
              <span>
                Contact your local emergency services or go to the nearest emergency department now.
                {shownTriage.redFlags?.length > 0 && ` Warning signs: ${shownTriage.redFlags.join(', ')}.`}
              </span>
            </div>
          )}

          {thinking && (
            <AssistantThinking key={thinking} token={token} progressId={thinking} withImage={Boolean(pendingImage)} />
          )}

          {!thinking && !sending && awaitingReply && (
            <button className={HomeStyle['thread__retry']} onClick={retryReply}>
              Get Syncia's reply
            </button>
          )}

          <p className={HomeStyle['thread__note']}>
            Syncia gives preliminary guidance only. It is not a diagnosis.
          </p>
        </main>
      ) : (
      <main className={HomeStyle['hero']}>
        <div className={HomeStyle['hero__logo']}>
          <PngIcon src={heartIcon} size={26} className={SidebarStyle['icon-white']} />
          <span className={HomeStyle['hero__badge']}>
            <PngIcon src={aiIcon} size={9} className={SidebarStyle['icon-white']} />
          </span>
        </div>

        <p className={HomeStyle['hero__eyebrow']} >Syncia · Your care companion</p>
        <h1 className={HomeStyle['hero__title']}>Hi {user.name.split(' ')[0] || 'there'}, how are you feeling?</h1>
        <p className={HomeStyle['hero__lead']}>
          I'm Syncia, the MediSync AI care assistant. I can help you find appropriate care at your
          hospital and arrange a visit.
        </p>

        <div className={HomeStyle['privacy']}>
          <ShieldCheckIcon width={15} height={15} />
          <div>
            <strong>Your privacy matters.</strong>
            <span>
              Your answers are used to route your appointment and can be reviewed by authorized
              hospital staff.
            </span>
          </div>
        </div>

        <div className={HomeStyle['suggestions']}>
          {SUGGESTIONS.map((s) => (
            <button key={s.text} className={HomeStyle['suggestion']} onClick={() => setMessage(s.text)}>
              <span className={HomeStyle['suggestion__icon']}>
                <PngIcon src={s.icon} size={16} className={HomeStyle['icon-teal']} />
              </span>
              <span className={HomeStyle['suggestion__text']}>{s.text}</span>
              <PngIcon src={nextIcon} size={12} className={SidebarStyle['icon-muted']} />
            </button>
          ))}
        </div>
      </main>
      )}

      <footer className={HomeStyle['composer-wrap']}>
        {error && <p className={HomeStyle['composer__error']} role="alert">{error}</p>}
        {!error && notice && <p className={HomeStyle['composer__notice']} role="status">{notice}</p>}

        <div className={HomeStyle['composer-box']}>
        {attachments.length > 0 && (
          <ul className={HomeStyle['attachments']} aria-label="Attachments">
            {attachments.map((a) =>
              a.kind === 'image' ? (
                <li key={a.id} className={HomeStyle['preview']}>
                  <img src={a.url} alt={a.file.name} className={HomeStyle['preview__img']} />
                  <button
                    className={HomeStyle['preview__remove']}
                    onClick={() => removeAttachment(a.id)}
                    aria-label={`Remove ${a.file.name}`}
                  >
                    <CloseIcon width={12} height={12} />
                  </button>
                </li>
              ) : (
                <li key={a.id} className={`${HomeStyle['preview']} ${HomeStyle['preview--file']}`}>
                  <span className={HomeStyle['chip__icon']}>
                    {a.kind === 'audio' ? <MicIcon width={15} height={15} /> : <FileTextIcon width={15} height={15} />}
                  </span>
                  <span className={HomeStyle['chip__name']}>{a.file.name}</span>
                  <button
                    className={HomeStyle['preview__remove']}
                    onClick={() => removeAttachment(a.id)}
                    aria-label={`Remove ${a.file.name}`}
                  >
                    <CloseIcon width={12} height={12} />
                  </button>
                </li>
              ),
            )}
          </ul>
        )}

        <div className={HomeStyle['composer']}>
          {recording ? (
            <>
              <span className={HomeStyle['rec-dot']} aria-hidden="true" />
              <span className={HomeStyle['rec-time']} role="timer">Recording {formatTime(seconds)}</span>
              <button className={SidebarStyle['icon-btn']} onClick={cancelRecording} aria-label="Discard recording">
                <CloseIcon width={18} height={18} />
              </button>
              <button
                className={`${HomeStyle['composer__send']} ${HomeStyle['composer__send--stop']}`}
                onClick={stopRecording}
                aria-label="Stop and transcribe recording"
              >
                <StopIcon width={16} height={16} />
              </button>
            </>
          ) : transcribing ? (
            <>
              <span className={HomeStyle['rec-time']} role="status">Transcribing your voice note…</span>
            </>
          ) : (
            <>
              <div className={HomeStyle['attach']} ref={menuRef}>
                <button
                  className={SidebarStyle['icon-btn']}
                  aria-label="Attach"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((o) => !o)}
                >
                  <PaperclipIcon width={18} height={18} />
                </button>

                {menuOpen && (
                  <div className={HomeStyle['attach__menu']} role="menu">
                    <button
                      role="menuitem"
                      className={HomeStyle['attach__item']}
                      onClick={() => {
                        setMenuOpen(false)
                        fileRef.current?.click()
                      }}
                    >
                      <span className={HomeStyle['attach__icon']}><UploadIcon width={17} height={17} /></span>
                      <span>
                        <span className={HomeStyle['attach__title']}>Add a photo</span>
                        <span className={HomeStyle['attach__sub']}>JPG, PNG, WebP · up to {MAX_MB} MB · Syncia will look at it</span>
                      </span>
                    </button>
                    <button role="menuitem" className={HomeStyle['attach__item']} onClick={startRecording}>
                      <span className={HomeStyle['attach__icon']}><MicIcon width={17} height={17} /></span>
                      <span>
                        <span className={HomeStyle['attach__title']}>Speak your message</span>
                        <span className={HomeStyle['attach__sub']}>Up to 2 minutes · turned into text you can edit</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send(message)}
                placeholder={thinking ? 'Syncia is replying…' : 'Tell Syncia your symptoms or ask about an appointment…'}
                maxLength={4000}
                disabled={sending || thinking}
              />
              <button
                className={`${HomeStyle['composer__send']} ${message.trim() && !sending && !thinking ? HomeStyle['composer__send--ready'] : ''}`}
                onClick={() => send(message)}
                aria-label={thinking ? 'Waiting for Syncia' : 'Send'}
                aria-busy={Boolean(sending || thinking)}
                disabled={sending || thinking || transcribing}
              >
                {sending || thinking ? <span className={HomeStyle['spinner']} aria-hidden="true" /> : <SendIcon width={16} height={16} />}
              </button>
            </>
          )}
        </div>
        </div>

        <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={onPickFiles} />
        <p className={HomeStyle['disclaimer']}>Syncia's guidance does not replace professional medical advice.</p>
      </footer>
    </>
  )
}

export default Home