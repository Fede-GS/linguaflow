import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { geminiFlash } from '@/lib/gemini'
import { EXERCISE_SCHEMAS } from '@/lib/exercise-schemas'

function extractJSON(text: string): unknown {
  const t = text.trim()

  // 1. Direct parse
  try { return JSON.parse(t) } catch {}

  // 2. Strip single markdown fence
  const stripped = t
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()
  try { return JSON.parse(stripped) } catch {}

  // 3. Find first { ... last }
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(t.slice(start, end + 1)) } catch {}
  }

  throw new Error('Could not extract JSON from Gemini response')
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    type, targetLanguage, cefrLevel, skillFocus,
    topic, count, minutes, teacherNotes,
    studentGoal, studentNativeLanguage, difficulty,
  } = await req.json()

  const schema = EXERCISE_SCHEMAS[type as keyof typeof EXERCISE_SCHEMAS]
  if (!schema) return NextResponse.json({ error: 'Tipo esercizio non valido' }, { status: 400 })

  const langLabel = targetLanguage === 'english' ? 'inglese' : 'italiano'

  const itemCount = count || 5

  // Types that have no item array — count instruction would confuse the AI
  const noArrayTypes = new Set(['ESSAY', 'DICTATION', 'CONVERSATION_SIM'])
  const countInstruction = noArrayTypes.has(type)
    ? ''
    : `\n- Numero esatto di domande/item da generare: ${itemCount} (OBBLIGATORIO — genera esattamente ${itemCount} elementi nell'array)`

  // For listening exercises that don't natively have a transcript, require one
  const listeningTextNote = skillFocus === 'LISTENING' && (type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE')
    ? `\n- IMPORTANTE (focus ASCOLTO): aggiungi un campo "text" con un brano/monologo/dialogo autentico in ${langLabel} (minimo 100 parole) che lo studente deve ascoltare. Le domande devono basarsi ESCLUSIVAMENTE su questo testo.`
    : ''

  const distractorNote = (type === 'FILL_BLANK' || type === 'CLOZE') && difficulty === 'hard'
    ? `\n- wordBank (FILL_BLANK/CLOZE): includi TUTTE le risposte corrette PIÙ ${Math.max(2, Math.ceil(itemCount * 0.4))} parole distrattore aggiuntive (plausibili ma errate). Mescola in ordine casuale.`
    : (type === 'FILL_BLANK' || type === 'CLOZE')
      ? `\n- wordBank (FILL_BLANK/CLOZE): includi TUTTE le risposte corrette in ordine casuale (nessun distrattore aggiuntivo).`
      : ''

  const prompt = `Sei un esperto insegnante di lingue certificato CEFR con 20 anni di esperienza.
Generi esercizi pedagogicamente corretti, coinvolgenti e appropriati al livello richiesto.
REGOLA ASSOLUTA: rispondi SOLO con JSON valido. Zero testo fuori dal JSON. Zero blocchi markdown. Zero commenti.

PARAMETRI ESERCIZIO:
- Tipo: ${type}
- Lingua target: ${langLabel}
- Livello CEFR: ${cefrLevel}
- Focus didattico: ${skillFocus}
- Argomento/Tema: ${topic || 'generale'}${countInstruction}
- Difficoltà: ${difficulty || 'medium'}
- Tempo stimato: ${minutes || 15} minuti
${teacherNotes ? `- Note insegnante: ${teacherNotes}` : ''}
${studentGoal ? `- Obiettivo studente: ${studentGoal}` : ''}
${studentNativeLanguage ? `- Lingua madre studente: ${studentNativeLanguage}` : ''}${distractorNote}${listeningTextNote}

ISTRUZIONI DI QUALITÀ:
- Il contenuto deve essere AUTENTICO e PEDAGOGICAMENTE VALIDO per il livello ${cefrLevel}
- Le frasi devono essere naturali, non artificiali o banali
- Ogni esercizio deve avere istruzioni chiare in italiano
- Il campo "title" deve essere descrittivo e in ${langLabel}
- Per esercizi in ${langLabel}: il contenuto dell'esercizio (domande, testi, opzioni) deve essere in ${langLabel}; le istruzioni possono essere in italiano

Segui ESATTAMENTE questo schema JSON — sostituisci ogni valore di esempio con contenuto REALE e appropriato:
${JSON.stringify(schema, null, 2)}`

  try {
    const result = await geminiFlash.generateContent(prompt)
    const text = result.response.text()
    const parsed = extractJSON(text)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[generate] Errore parsing JSON da Gemini:', err)
    return NextResponse.json(
      { error: 'Errore nella generazione. Riprova o cambia i parametri.' },
      { status: 500 }
    )
  }
}
