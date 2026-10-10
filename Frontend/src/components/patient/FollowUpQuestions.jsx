import HomeStyle from '../../assets/styles/home.module.css'
import { AssistantAvatar } from './AssistantTyping'
import { composeAnswer } from './followUps'

export default function FollowUpQuestions({ messageId, followUps, active, disabled, picked, typed, onPick, onSend }) {
  const closed = followUps.filter((q) => q.options.length)
  const hasOpen = closed.length < followUps.length
  const instant = followUps.length === 1 && closed.length === 1
  const pickedCount = Object.keys(picked).length

  const choose = (index, option) => {
    if (!active || disabled) return
    if (instant) {
      onSend(composeAnswer(followUps, { [index]: option }, typed))
      return
    }
    const next = { ...picked }
    if (next[index] === option) delete next[index]
    else next[index] = option
    onPick(next)
  }

  return (
    <>
      {followUps.map((q, i) => {
        const labelId = `followup-${messageId}-${i}`
        return (
          <div key={i} className={`${HomeStyle['followup']} ${HomeStyle['msg--enter']}`}>
            <div className={`${HomeStyle['msg']} ${HomeStyle['msg--ai']}`}>
              <AssistantAvatar />
              <div className={HomeStyle['bubble']} id={labelId}>
                <span className={HomeStyle['sr-only']}>Syncia asks: </span>
                {q.question}
              </div>
            </div>

            {active && q.options.length > 0 && (
              <div className={HomeStyle['choices']} role="group" aria-labelledby={labelId}>
                {q.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`${HomeStyle['choice']} ${picked[i] === option ? HomeStyle['choice--picked'] : ''}`}
                    aria-pressed={picked[i] === option}
                    onClick={() => choose(i, option)}
                    disabled={disabled}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            {active && q.options.length === 0 && (
              <p className={HomeStyle['followup__hint']}>Type your answer in the message box below.</p>
            )}
          </div>
        )
      })}

      {active && closed.length > 0 && !instant && (
        <div className={HomeStyle['followups__actions']}>
          <button
            type="button"
            className={HomeStyle['followups__send']}
            onClick={() => onSend(composeAnswer(followUps, picked, typed))}
            disabled={disabled || (!pickedCount && !typed.trim())}
          >
            {typed.trim() ? 'Submit answers and message' : 'Submit answers'}
          </button>
          <span className={HomeStyle['followups__count']}>
            {pickedCount} of {closed.length} answered{hasOpen ? ' · type the other answer below' : ''}
          </span>
        </div>
      )}
    </>
  )
}
