/**
 * Combines validated model output with deterministic application safety rules.
 *
 * Policy:
 *  - Rule-detected red flags in patient text set a floor on urgency; the model can raise
 *    urgency but can never lower it below a rule-detected level.
 *  - A model-claimed "emergency" is honoured (more cautious), but marked as model-suggested.
 *  - Emergency results suppress routine follow-up questions so urgent guidance is not delayed.
 *  - Voice-emotion output is never an input to this function.
 *  - Unvalidated model output yields no possible explanations.
 */

import { evaluateRedFlags } from './safetyRules.js'

export const URGENCY_ORDER = ['undetermined', 'self_care', 'routine', 'soon', 'urgent', 'emergency']
const rank = (u) => Math.max(0, URGENCY_ORDER.indexOf(u))

export const DISCLAIMER =
  'This is preliminary information from an experimental AI prototype. It is not a diagnosis and does not replace ' +
  'evaluation by a qualified healthcare professional. If you think you may have an emergency, call 911 ' +
  '(Philippines) or your local emergency number, or go to the nearest emergency room now.'

const EMERGENCY_MESSAGE = {
  en:
    'Based on what you described, this could be an emergency. Please call 911 (Philippines) or your local ' +
    'emergency number, or go to the nearest emergency room now. Do not wait for further questions from this app.',
  fil:
    'Batay sa iyong inilarawan, maaaring ito ay emergency. Tumawag agad sa 911 o pumunta sa pinakamalapit na ' +
    'emergency room ngayon. Huwag nang hintayin ang iba pang tanong ng app na ito.',
}

const URGENT_MESSAGE = {
  en: 'Some of what you described should be checked by a healthcare professional today, in person if possible.',
  fil: 'Ang ilan sa iyong inilarawan ay dapat masuri ng isang healthcare professional ngayong araw.',
}

export const URGENCY_GUIDANCE = {
  emergency: 'Seek emergency care now.',
  urgent: 'Get medical attention today (urgent care or emergency department if no doctor is available).',
  soon: 'Arrange to see a doctor within 1-3 days.',
  routine: 'Book a routine appointment with a doctor.',
  self_care: 'Self-care at home may be reasonable; seek care if symptoms worsen or new symptoms appear.',
  undetermined: 'Not enough information to suggest a level of care yet. If you are worried, contact a healthcare professional.',
}

function pickLang(lang) {
  return lang === 'fil' ? 'fil' : 'en'
}

/**
 * @param {object} p
 * @param {object} p.modelResult  validated model result (ChatOutput / ImageOutput shape)
 * @param {boolean} p.outputValid
 * @param {string}  p.patientText  all patient-provided text for this turn (message, image description)
 * @param {string}  [p.language]   reply language hint ('en' | 'fil' | 'auto')
 */
export function applySafety({ modelResult, outputValid, patientText, language = 'auto' }) {
  const lang = pickLang(language)
  const ruleHits = evaluateRedFlags(patientText)
  const modelUrgency = outputValid ? modelResult.suggested_urgency ?? 'undetermined' : 'undetermined'

  const ruleUrgency = ruleHits.reduce((u, h) => (rank(h.urgency) > rank(u) ? h.urgency : u), 'undetermined')
  const safetyOverride = rank(ruleUrgency) > rank(modelUrgency)
  const finalUrgency = safetyOverride ? ruleUrgency : modelUrgency
  const urgencySource = safetyOverride ? 'safety_rule' : outputValid ? 'model' : 'none'

  const isEmergency = finalUrgency === 'emergency'
  let reply = modelResult.reply || ''
  if (isEmergency) {
    // Emergency guidance always comes first, whether a rule or the model raised it.
    reply = `${EMERGENCY_MESSAGE[lang]}${reply ? `\n\n${reply}` : ''}`
  } else if (finalUrgency === 'urgent' && safetyOverride) {
    reply = `${URGENT_MESSAGE[lang]}${reply ? `\n\n${reply}` : ''}`
  }

  const followUps = isEmergency ? [] : outputValid ? modelResult.follow_up_questions ?? [] : []

  return {
    finalUrgency,
    modelUrgency,
    safetyOverride,
    urgencySource,
    reply,
    followUpQuestions: followUps,
    possibleExplanations: outputValid ? modelResult.possible_explanations ?? [] : [],
    ruleRedFlags: ruleHits.map(({ ruleId, label, urgency }) => ({ rule_id: ruleId, label, urgency })),
    modelRedFlags: outputValid ? modelResult.red_flags_identified ?? [] : [],
    guidance: URGENCY_GUIDANCE[finalUrgency],
  }
}
