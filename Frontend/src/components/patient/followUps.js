export function stripFollowUps(body, followUps) {
  if (!followUps?.length) return body
  const block = followUps.map((q) => `• ${q.question}`).join('\n')
  if (body === block) return ''
  return body.endsWith(`\n\n${block}`) ? body.slice(0, -(block.length + 2)) : body
}

export function composeAnswer(followUps, picked, typed) {
  const lines = (followUps || [])
    .map((q, i) => (picked[i] ? `${q.question} ${picked[i]}` : null))
    .filter(Boolean)
  const extra = typed.trim()
  if (extra) lines.push(extra)
  return lines.join('\n')
}
