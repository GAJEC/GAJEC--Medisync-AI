import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { evaluateRedFlags } from '../src/services/safetyRules.js'
import { applySafety } from '../src/services/safetyService.js'

const ids = (text) => evaluateRedFlags(text).map((h) => h.ruleId)

describe('red-flag rules: English', () => {
  const cases = [
    ['I have crushing chest pain going down my left arm', 'chest_pain'],
    ['There is pressure in my chest', 'chest_pain'],
    ["I can't breathe properly", 'breathing_difficulty'],
    ['My lips are turning blue', 'breathing_difficulty'],
    ['Her face is drooping and she has slurred speech', 'stroke_signs'],
    ['sudden weakness on one side of my body', 'stroke_signs'],
    ['My dad passed out and is unresponsive', 'unconscious_or_unresponsive'],
    ['He had a seizure an hour ago', 'seizure'],
    ['The cut is bleeding heavily and won\u2019t stop', 'severe_bleeding'],
    ['I have been vomiting blood', 'severe_bleeding'],
    ['I want to kill myself', 'self_harm'],
    ['My throat is swelling after eating peanuts', 'severe_allergic_reaction'],
    ['This is the worst headache of my life', 'thunderclap_headache'],
    ['My son swallowed bleach', 'poisoning_overdose'],
    ['I have a fever and a stiff neck', 'meningitis_signs'],
    ["I'm pregnant and I'm bleeding", 'pregnancy_bleeding_or_pain'],
    ['My 2 month old baby has a fever', 'infant_fever'],
    ['fever of 40.5 C since this morning', 'high_fever'],
  ]
  for (const [text, rule] of cases) {
    it(`detects ${rule}: "${text}"`, () => assert.ok(ids(text).includes(rule), `got ${ids(text)}`))
  }
})

describe('red-flag rules: Filipino / Taglish', () => {
  const cases = [
    ['Masakit ang dibdib ko at hindi ako makahinga', ['chest_pain', 'breathing_difficulty']],
    ['Nahihirapan akong huminga since kagabi', ['breathing_difficulty']],
    ['Sumasakit ang dibdib ko', ['chest_pain']],
    ['Nahimatay ang lola ko', ['unconscious_or_unresponsive']],
    ['Nangingisay ang anak ko', ['seizure']],
    ['Nagsusuka ng dugo si papa', ['severe_bleeding']],
    ['Gusto ko nang mamatay', ['self_harm']],
    ['Namamaga ang labi ko pagkatapos kumain ng hipon', ['severe_allergic_reaction']],
    ['Buntis ako at may dugo', ['pregnancy_bleeding_or_pain']],
    ['Tabingi ang mukha niya at bulol magsalita', ['stroke_signs']],
  ]
  for (const [text, rules] of cases) {
    it(`detects ${rules.join('+')}: "${text}"`, () => {
      const got = ids(text)
      for (const r of rules) assert.ok(got.includes(r), `missing ${r}; got ${got}`)
    })
  }
})

describe('red-flag rules: negation and false positives', () => {
  const none = [
    'I have no chest pain and no trouble breathing',
    'Mild sore throat for two days, no fever',
    'Walang sakit ang dibdib ko',
    'I am 40 years old and have a mild fever',
    'I had a stroke of luck today, just a runny nose',
    'Denies chest pain. Slight cough.',
  ]
  for (const text of none) {
    it(`no emergency for: "${text}"`, () => {
      const hits = evaluateRedFlags(text).filter((h) => h.urgency === 'emergency' && h.ruleId !== 'stroke_signs')
      assert.deepEqual(hits, [])
    })
  }

  it('negation does not cross a clause boundary', () => {
    assert.ok(ids('No fever, but I have chest pain').includes('chest_pain'))
    assert.ok(ids('Walang lagnat pero masakit ang dibdib ko').includes('chest_pain'))
  })
})

describe('applySafety', () => {
  const model = (over = {}) => ({
    reply: 'Model reply.',
    suggested_urgency: 'self_care',
    follow_up_questions: ['How long?'],
    possible_explanations: [{ condition: 'Muscle strain', likelihood: 'possible', rationale: '' }],
    red_flags_identified: [],
    ...over,
  })

  it('rule red flag overrides a lower model urgency and suppresses follow-ups', () => {
    const s = applySafety({ modelResult: model(), outputValid: true, patientText: 'I have chest pain' })
    assert.equal(s.finalUrgency, 'emergency')
    assert.equal(s.modelUrgency, 'self_care')
    assert.equal(s.safetyOverride, true)
    assert.equal(s.urgencySource, 'safety_rule')
    assert.deepEqual(s.followUpQuestions, [])
    assert.match(s.reply, /^Based on what you described, this could be an emergency/)
    assert.match(s.reply, /911/)
  })

  it('emergency message is in Filipino when requested', () => {
    const s = applySafety({ modelResult: model(), outputValid: true, patientText: 'hindi ako makahinga', language: 'fil' })
    assert.match(s.reply, /^Batay sa iyong inilarawan/)
  })

  it('model emergency is honoured (never downgraded) with emergency message first', () => {
    const s = applySafety({ modelResult: model({ suggested_urgency: 'emergency' }), outputValid: true, patientText: 'hmm' })
    assert.equal(s.finalUrgency, 'emergency')
    assert.equal(s.safetyOverride, false)
    assert.deepEqual(s.followUpQuestions, [])
    assert.match(s.reply, /emergency/)
  })

  it('model cannot lower rule-detected urgency', () => {
    const s = applySafety({ modelResult: model({ suggested_urgency: 'routine' }), outputValid: true, patientText: 'fever 41 C' })
    assert.equal(s.finalUrgency, 'urgent')
  })

  it('no red flags keeps the model urgency', () => {
    const s = applySafety({ modelResult: model(), outputValid: true, patientText: 'runny nose' })
    assert.equal(s.finalUrgency, 'self_care')
    assert.equal(s.urgencySource, 'model')
    assert.deepEqual(s.followUpQuestions, ['How long?'])
  })

  it('invalid model output yields no explanations and undetermined urgency', () => {
    const s = applySafety({ modelResult: model({ suggested_urgency: 'routine' }), outputValid: false, patientText: 'runny nose' })
    assert.equal(s.finalUrgency, 'undetermined')
    assert.deepEqual(s.possibleExplanations, [])
    assert.deepEqual(s.followUpQuestions, [])
  })

  it('invalid model output still triggers rule-based emergency', () => {
    const s = applySafety({ modelResult: model(), outputValid: false, patientText: 'I fainted and hit my head' })
    assert.equal(s.finalUrgency, 'emergency')
  })

  it('has no voice-emotion input', () => {
    // Structural guarantee: extra fields are ignored; urgency is determined only by text and model output.
    const s = applySafety({ modelResult: model(), outputValid: true, patientText: 'runny nose', voice: { top_label: 'fearful' } })
    assert.equal(s.finalUrgency, 'self_care')
  })
})
