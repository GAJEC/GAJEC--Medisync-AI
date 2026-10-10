import { useEffect, useRef, useState } from 'react'
import { PngIcon } from '../common/Icons'
import { patientApi } from '../../api/client'
import aiIcon from '../../assets/icons/ai.png'
import HomeStyle from '../../assets/styles/home.module.css'
import SidebarStyle from '../../assets/styles/sidebar.module.css'

const STAGE_LABELS = {
  waiting: 'Sending your message',
  preparing: 'Getting your message ready',
  queued: 'Waiting for Syncia to be free',
  reading: 'Reading your message',
  checking: 'Checking the reply',
  done: 'Almost done',
}
const IMAGE_STAGE_LABELS = {
  ...STAGE_LABELS,
  preparing: 'Preparing your photo',
  reading: 'Looking at your photo',
}

const SECTION_LABELS = {
  reply: 'Writing a reply',
  symptom_summary: 'Summarising your symptoms',
  follow_up_questions: 'Thinking of follow-up questions',
  possible_explanations: 'Considering possible causes',
  suggested_urgency: 'Judging how urgent this is',
  red_flags_identified: 'Checking for warning signs',
  recommended_specialties: 'Choosing the right specialist',
  care_advice: 'Writing care advice',
  needs_more_information: 'Finishing up',
  uncertainty_note: 'Finishing up',
  image_quality: 'Checking the photo quality',
  visual_observations: 'Describing what is visible in the photo',
  limitations: 'Noting what a photo cannot show',
}
const POLL_MS = 1000

function stageLabel(progress, withImage) {
  const labels = withImage ? IMAGE_STAGE_LABELS : STAGE_LABELS
  if (!progress) return labels.waiting
  if (progress.stage === 'writing') return SECTION_LABELS[progress.section] || 'Writing a reply'
  return labels[progress.stage] || labels.preparing
}

const WORD_MS = 45
const MAX_TYPING_MS = 6000
const MIN_WORD_MS = 12

export const AssistantAvatar = () => (
  <span className={HomeStyle['ai-avatar']} title="Syncia" aria-hidden="true">
    <PngIcon src={aiIcon} size={14} className={SidebarStyle['icon-white']} />
  </span>
)

export function AssistantThinking({ token, progressId, withImage = false, startedAt }) {
  const [start] = useState(() => startedAt ?? Date.now())
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - start) / 1000))
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(id)
  }, [start])

  useEffect(() => {
    if (!progressId) return undefined
    let cancelled = false
    let timer
    const poll = async () => {
      try {
        const next = await patientApi.replyProgress(token, progressId)
        if (!cancelled && next.stage !== 'waiting') setProgress(next)
      } catch { }
      if (!cancelled) timer = setTimeout(poll, POLL_MS)
    }
    timer = setTimeout(poll, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [token, progressId])

  const label = stageLabel(progress, withImage)
  const retrying = progress?.attempt > 1

  return (
    <div className={`${HomeStyle['msg']} ${HomeStyle['msg--ai']}`} role="status" aria-live="polite">
      <AssistantAvatar />
      <div className={`${HomeStyle['bubble']} ${HomeStyle['thinking']}`}>
        <span className={HomeStyle['typing-dots']} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span key={label} className={HomeStyle['thinking__label']}>
          <span className={HomeStyle['sr-only']}>Syncia: </span>
          {retrying && progress.stage !== 'done' ? 'Double-checking: ' : ''}
          {label}…
        </span>
        <span className={HomeStyle['thinking__time']} aria-hidden="true">
          {elapsed}s
        </span>
      </div>
    </div>
  )
}

export function TypewriterText({ text, onDone, onProgress }) {
  const tokens = text.match(/\S+\s*|\s+/g) || ['']
  const [count, setCount] = useState(0)
  const timerRef = useRef(null)
  const callbacks = useRef({ onDone, onProgress })

  useEffect(() => {
    callbacks.current = { onDone, onProgress }
  }, [onDone, onProgress])

  useEffect(() => {
    const total = tokens.length
    const delay = Math.max(MIN_WORD_MS, Math.min(WORD_MS, Math.floor(MAX_TYPING_MS / total)))
    let shown = 0
    timerRef.current = setInterval(() => {
      shown += 1
      setCount(shown)
      callbacks.current.onProgress?.()
      if (shown >= total) {
        clearInterval(timerRef.current)
        callbacks.current.onDone?.()
      }
    }, delay)
    return () => clearInterval(timerRef.current)
  }, [text])

  const typing = count < tokens.length

  const finish = () => {
    if (!typing) return
    clearInterval(timerRef.current)
    setCount(tokens.length)
    callbacks.current.onDone?.()
  }

  return (
    <span
      onClick={finish}
      className={typing ? HomeStyle['typewriter'] : undefined}
      title={typing ? 'Click to show the full reply' : undefined}
    >
      <span className={HomeStyle['sr-only']}>{text}</span>
      <span aria-hidden="true">
        {tokens.slice(0, count).join('')}
        {typing && <span className={HomeStyle['caret']} />}
      </span>
    </span>
  )
}
