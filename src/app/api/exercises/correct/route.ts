import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { geminiFlash } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assignmentId } = await req.json()

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId },
    include: {
      exercise: true,
      student: true,
    },
  })
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const prompt = `Sei un insegnante esperto che assiste nella correzione di esercizi di lingua.
Analizza le risposte dello studente e fornisci una valutazione dettagliata.

Esercizio: ${JSON.stringify(assignment.exercise.content)}
Risposte corrette: ${JSON.stringify(assignment.exercise.answerKey)}
Risposte dello studente: ${JSON.stringify(assignment.studentAnswers)}
Livello CEFR studente: ${assignment.student.currentLevel}
Obiettivo studente: ${assignment.student.goal || 'migliorare la lingua'}

Rispondi SOLO con questo JSON:
{
  "score": <numero 0-100>,
  "feedbackDraft": "<feedback personalizzato max 150 parole, tono incoraggiante>",
  "errors": [{"type": "<tipo errore>", "description": "<descrizione>", "example": "<esempio>"}],
  "suggestions": ["<suggerimento 1>", "<suggerimento 2>"]
}`

  const result = await geminiFlash.generateContent(prompt)
  const text = result.response.text()
  const aiResult = JSON.parse(text)

  // Salva nel DB
  await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      autoScore: aiResult.score,
      aiFeedbackDraft: aiResult.feedbackDraft,
    },
  })

  return NextResponse.json(aiResult)
}
