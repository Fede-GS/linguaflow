import { NextRequest, NextResponse } from 'next/server'
import { geminiFlash } from '@/lib/gemini'

type Message = { role: 'ai' | 'student'; text: string }

export async function POST(req: NextRequest) {
  const {
    scenario,
    role,
    studentRole,
    targetVocabulary,
    targetGrammar,
    cefrLevel,
    history,
    studentMessage,
  }: {
    scenario: string
    role: string
    studentRole: string
    targetVocabulary?: string[]
    targetGrammar?: string
    cefrLevel?: string
    history: Message[]
    studentMessage: string
  } = await req.json()

  const vocabHint = targetVocabulary?.length
    ? `Target vocabulary to naturally incorporate when appropriate: ${targetVocabulary.join(', ')}.`
    : ''

  const grammarHint = targetGrammar
    ? `Target grammar structure: ${targetGrammar}. Use it naturally in your replies.`
    : ''

  const historyText = history
    .map(m => `${m.role === 'ai' ? role : studentRole}: ${m.text}`)
    .join('\n')

  const prompt = `You are roleplaying as "${role}" in an English conversation exercise.
Student level: ${cefrLevel || 'B1'}.
Scenario: ${scenario}
The student is playing: ${studentRole}.
${vocabHint}
${grammarHint}

RULES:
- Stay in character as "${role}" at all times.
- Reply in English only, naturally and conversationally.
- Keep your reply to 2-4 sentences — do not be overly long.
- Match vocabulary complexity to level ${cefrLevel || 'B1'}.
- Do NOT correct the student's grammar — just respond naturally.
- Do NOT break character or mention you are an AI.

Conversation so far:
${historyText}
${studentRole}: ${studentMessage}
${role}:`

  try {
    const result = await geminiFlash.generateContent(prompt)
    const reply = result.response.text().trim()
    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json({ error: 'Errore nella risposta AI' }, { status: 500 })
  }
}
