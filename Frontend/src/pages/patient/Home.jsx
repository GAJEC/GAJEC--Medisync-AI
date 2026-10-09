import React, { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  PngIcon,
  ShieldCheckIcon,
  PaperclipIcon,
  SendIcon,
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

const Home = () => {
  const { user } = useOutletContext()
  const [message, setMessage] = useState('')

  const send = (text) => {
    const value = text.trim()
    if (!value) return
    // TODO: connect to the AI / backend endpoint.
    console.log('send:', value)
    setMessage('')
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
          I'm your HealthLocal AI assistant. I can help you find appropriate care at your
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
        <div className="composer">
          <button className="icon-btn" aria-label="Attach a file">
            <PaperclipIcon width={18} height={18} />
          </button>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(message)}
            placeholder="Describe your symptoms or ask about an appointment…"
          />
          <button className="composer__send" onClick={() => send(message)} aria-label="Send">
            <SendIcon width={16} height={16} />
          </button>
        </div>
        <p className="disclaimer">AI guidance does not replace professional medical advice.</p>
      </footer>
    </>
  )
}

export default Home