/**
 * Deterministic red-flag rules (English + Filipino/Taglish).
 *
 * These are conservative keyword/phrase screens for a decision-support prototype.
 * They are NOT a validated clinical triage instrument. They exist so that emergency
 * guidance never depends solely on the language model following its prompt.
 *
 * Each rule: id, urgency ('emergency' | 'urgent'), label, patterns (RegExp on normalized text),
 * optional `requires` (all must also match), optional `when(context)` predicate.
 */

// Pattern helpers operate on normalized text: lowercase, no diacritics, straight apostrophes,
// single spaces. Word boundaries use \b.
const r = (s) => new RegExp(s, 'u')

const BREATH = "(breath|breathe|breathing)"
const CANT = "(can'?t|cannot|can not|unable to|not able to|struggling to|hard to|difficult(y)? to|trouble|difficulty|hardly)"

export const RULES = [
  {
    id: 'breathing_difficulty',
    urgency: 'emergency',
    label: 'Severe difficulty breathing',
    patterns: [
      r(`\\b${CANT} ${BREATH}\\b`),
      r(`\\b(trouble|difficulty|struggling) ${BREATH}\\b`),
      r('\\b(short(ness)? of breath|gasping|choking|suffocating|lips? (are |is )?(turning |going )?(blue|purple))\\b'),
      r('\\b(hindi|di) (ako )?(makahinga|maka hinga)\\b'),
      r('\\b(hirap|nahihirapan(g)?) (akong )?(huminga|sa paghinga|makahinga)\\b'),
      r('\\b(kinakapos|hinihingal|naninikip) (ang )?(hininga|paghinga)\\b'),
      r('\\bnasasakal\\b'),
    ],
  },
  {
    id: 'chest_pain',
    urgency: 'emergency',
    label: 'Chest pain or pressure',
    patterns: [
      r('\\bchest (pain|pressure|tightness|heaviness|hurts?|is hurting|discomfort)\\b'),
      r('\\b(pain|pressure|tightness|heaviness) (in|on) (my |the )?chest\\b'),
      r('\\b(heart attack)\\b'),
      r('\\b(masakit|sumasakit|kumikirot|naninikip|mabigat) (ang |sa )?(aking |ang )?dibdib\\b'),
      r('\\b(sakit|paninikip|pananakit|kirot) (ng |sa )?dibdib\\b'),
      r('\\bdibdib (ko )?(ay )?(masakit|sumasakit|naninikip|mabigat)\\b'),
      r('\\batake sa puso\\b'),
    ],
  },
  {
    id: 'stroke_signs',
    urgency: 'emergency',
    label: 'Possible stroke signs (face drooping, arm weakness, speech difficulty)',
    patterns: [
      r('\\b(face|mouth|smile) (is )?(droop(ing|y|s)?|uneven|crooked)\\b'),
      r('\\bdroop(ing|y)? (face|mouth|smile)\\b'),
      r('\\bslurred (speech|words)\\b|\\bslurring\\b'),
      r("\\b(can'?t|cannot|unable to|trouble) (speak|talk|move (my )?(arm|leg|one side))\\b"),
      r('\\b(sudden )?(weakness|numbness) (on|in|of) (one|the (left|right)) side\\b'),
      r('\\b(one|left|right) side of (my |the )?(body|face) (is )?(weak|numb|paralyzed)\\b'),
      r('\\bstroke\\b'),
      r('\\b(ngiwi|tabingi|baluktot) ang (mukha|bibig)\\b'),
      r('\\b(bulol|utal) (magsalita|ang pananalita)\\b|\\bhindi (makapagsalita|maigalaw)\\b'),
      r('\\b(manhid|namamanhid|mahina) ang (kalahati|isang bahagi|kaliwang|kanang)\\b'),
      r('\\b(na-?stroke|istrok)\\b'),
    ],
  },
  {
    id: 'unconscious_or_unresponsive',
    urgency: 'emergency',
    label: 'Loss of consciousness or unresponsiveness',
    patterns: [
      r('\\b(passed out|fainted|unconscious|unresponsive|blacked out|lost consciousness|not waking up|won\'?t wake up)\\b'),
      r('\\b(nawalan ng malay|nahimatay|hinimatay|walang malay|hindi magising|ayaw magising)\\b'),
    ],
  },
  {
    id: 'seizure',
    urgency: 'emergency',
    label: 'Seizure or convulsion',
    patterns: [
      r('\\b(seizure|seizing|convulsion|convulsing|fitting)\\b'),
      r('\\b(kombulsyon|kumbulsyon|nangingisay|nanginig ang buong katawan|sinumpong ng epilepsy)\\b'),
    ],
  },
  {
    id: 'severe_bleeding',
    urgency: 'emergency',
    label: 'Severe or uncontrolled bleeding / vomiting or coughing up blood',
    patterns: [
      r("\\b(bleeding (heavily|a lot|badly|profusely|won'?t stop|that won'?t stop|nonstop|non-stop)|heavy bleeding|severe bleeding|uncontrolled bleeding|lots of blood|soaked (in|with) blood)\\b"),
      r("\\b(bleeding|blood) (that )?(won'?t|will not|doesn'?t|does not) stop\\b"),
      r('\\b(vomiting|throwing up|coughing up|spitting up) (blood|bright red blood)\\b'),
      r('\\b(black|tarry) (tarry )?stools?\\b'),
      r('\\b(malakas|matinding|tuloy-?tuloy) na (pagdurugo|pagdudugo)\\b'),
      r('\\b(ayaw|hindi) (tumigil|huminto) (ang )?(pagdurugo|dugo|pagdudugo)\\b'),
      r('\\bmaraming dugo\\b'),
      r('\\b(nagsusuka|sumusuka|umuubo|inuubo) ng dugo\\b'),
      r('\\b(itim na dumi|dumi(ng)? may dugo|dumudumi ng dugo)\\b'),
    ],
  },
  {
    id: 'self_harm',
    urgency: 'emergency',
    label: 'Thoughts of suicide or self-harm',
    patterns: [
      r('\\b(suicid(e|al)|kill (my ?self|myself)|end (my|it) (life|all)|want to die|wanna die|hurt(ing)? myself|self[- ]harm|cut(ting)? myself)\\b'),
      r('\\b(magpakamatay|nagpapakamatay|wakasan ang (aking )?buhay|gusto ko (nang )?mamatay|ayoko nang mabuhay|saktan ang sarili)\\b'),
    ],
  },
  {
    id: 'severe_allergic_reaction',
    urgency: 'emergency',
    label: 'Possible severe allergic reaction (swelling of face/throat/tongue)',
    patterns: [
      r('\\b(throat|tongue|lips?|face) (is |are )?(swelling|swollen|closing)\\b'),
      r('\\b(swelling|swollen) (of )?(my )?(throat|tongue|lips?|face)\\b'),
      r('\\banaphyla(xis|ctic)\\b'),
      r('\\b(namamaga|maga) ang (lalamunan|dila|labi|mukha)\\b'),
    ],
  },
  {
    id: 'thunderclap_headache',
    urgency: 'emergency',
    label: 'Sudden severe ("worst ever") headache',
    patterns: [
      r('\\b(worst headache|sudden (severe|intense|extreme) headache|thunderclap)\\b'),
      r('\\b(pinakamatinding|biglang matinding) sakit ng ulo\\b'),
    ],
  },
  {
    id: 'poisoning_overdose',
    urgency: 'emergency',
    label: 'Possible poisoning or overdose',
    patterns: [
      r('\\b(overdos(e|ed)|poison(ed|ing)|swallowed (bleach|poison|chemicals?|pills))\\b'),
      r('\\b(nalason|nakainom ng lason|nakalunok ng lason|sobrang dami ng gamot na nainom)\\b'),
    ],
  },
  {
    id: 'major_trauma',
    urgency: 'emergency',
    label: 'Serious injury (major accident, head injury, broken bone through skin)',
    patterns: [
      r('\\b(car|motorcycle|road|traffic) (accident|crash)\\b'),
      r('\\b(hit by a (car|vehicle|truck)|fell from (a )?(height|roof|ladder)|head injury|bone (is )?(sticking|poking) out)\\b'),
      r('\\b(nasagasaan|naaksidente|nahulog mula sa (bubong|mataas)|nabagok ang ulo)\\b'),
    ],
  },
  {
    id: 'meningitis_signs',
    urgency: 'emergency',
    label: 'Fever with stiff neck',
    patterns: [r('\\b(stiff neck|neck stiffness|matigas ang leeg|naninigas ang leeg)\\b')],
    requires: [r('\\b(fever|febrile|lagnat|nilalagnat|mainit)\\b')],
  },
  {
    id: 'pregnancy_bleeding_or_pain',
    urgency: 'emergency',
    label: 'Bleeding or severe abdominal pain during pregnancy',
    patterns: [r('\\b(bleeding|blood|dugo|nagdurugo|nagdudugo|severe (abdominal|stomach|belly) pain|matinding sakit ng tiyan)\\b')],
    requires: [r('\\b(pregnan(t|cy)|buntis|nagbubuntis)\\b')],
  },
  {
    id: 'infant_fever',
    urgency: 'emergency',
    label: 'Fever in a baby under 3 months',
    patterns: [r('\\b(fever|lagnat|nilalagnat)\\b')],
    requires: [r('\\b(newborn|new born|(\\d|one|two) (week|month)s? old|bagong (silang|panganak)|sanggol)\\b')],
  },
  {
    id: 'confusion',
    urgency: 'urgent',
    label: 'New confusion or disorientation',
    patterns: [
      r('\\b(confused|confusion|disoriented|not making sense)\\b'),
      r('\\b(nalilito|wala sa sarili|hindi makilala ang)\\b'),
    ],
  },
  {
    id: 'severe_dehydration',
    urgency: 'urgent',
    label: 'Signs of significant dehydration',
    patterns: [
      r("\\b(no urine|not urinat(ing|ed)|haven'?t (peed|urinated)|can'?t keep (any )?(fluids|water|anything) down)\\b"),
      r('\\b(hindi (na )?(maka(ihi|inom))|hindi umiihi|sinusuka lahat ng iniinom)\\b'),
    ],
  },
  {
    id: 'severe_abdominal_pain',
    urgency: 'urgent',
    label: 'Severe abdominal pain',
    patterns: [
      r('\\b(severe|extreme|unbearable|excruciating) (abdominal|stomach|belly) pain\\b'),
      r('\\b(abdominal|stomach|belly) pain (is )?(severe|extreme|unbearable|excruciating)\\b'),
      r('\\b(matindi|sobrang) (ang )?(sakit|pananakit) (ng|sa) tiyan\\b'),
    ],
  },
  {
    id: 'high_fever',
    urgency: 'urgent',
    label: 'Very high fever (40 °C / 104 °F or above)',
    patterns: [
      r('\\b4[0-2](\\.\\d)? ?(°|deg(rees)?)? ?(c|celsius)\\b'),
      r('\\b10[4-9](\\.\\d)? ?(°|deg(rees)?)? ?(f|fahrenheit)\\b'),
      r('\\b(temp(erature)?|lagnat|fever)( is| of| ay|:)? (4[0-2](\\.\\d)?|10[4-9](\\.\\d)?)\\b'),
    ],
    requires: [r('\\b(fever|temp(erature)?|lagnat|nilalagnat|init)\\b')],
  },
]

const NEGATORS = new Set([
  'no', 'not', 'never', 'without', 'denies', 'deny', 'denied', "don't", 'dont', "doesn't", 'doesnt', "didn't",
  'didnt', 'none', 'walang', 'wala', 'hindi', 'di',
])
const NEGATION_WINDOW = 3
const CLAUSE_BREAK = /[.,;:!?()\n]|\b(but|pero|kaso|however|although|subalit)\b/u

/** Lowercase, strip diacritics, normalize quotes/whitespace. */
export function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u02bc`]/g, "'")
    .toLowerCase()
    .replace(/[ \t]+/g, ' ')
}

/** True if the match at `index` is preceded within the same clause by a negator. */
function isNegated(text, index) {
  const before = text.slice(Math.max(0, index - 60), index)
  const parts = before.split(CLAUSE_BREAK)
  const clause = parts[parts.length - 1] ?? ''
  const words = clause.trim().split(/\s+/).filter(Boolean).slice(-NEGATION_WINDOW)
  return words.some((w) => NEGATORS.has(w))
}

function firstUnnegatedMatch(text, patterns) {
  for (const p of patterns) {
    const g = new RegExp(p.source, p.flags.includes('g') ? p.flags : p.flags + 'g')
    for (const m of text.matchAll(g)) {
      if (!isNegated(text, m.index)) return m[0]
    }
  }
  return null
}

/**
 * Evaluate red-flag rules on free text.
 * @returns {{ruleId:string, urgency:'emergency'|'urgent', label:string, matched:string}[]}
 */
export function evaluateRedFlags(text) {
  const norm = normalizeText(text)
  if (!norm.trim()) return []
  const hits = []
  for (const rule of RULES) {
    const matched = firstUnnegatedMatch(norm, rule.patterns)
    if (!matched) continue
    if (rule.requires && !rule.requires.every((req) => firstUnnegatedMatch(norm, [req]))) continue
    hits.push({ ruleId: rule.id, urgency: rule.urgency, label: rule.label, matched })
  }
  return hits
}
