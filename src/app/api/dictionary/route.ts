import { NextRequest, NextResponse } from 'next/server'
import { geminiFlash } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  const { word, sourceLanguage, targetLanguage } = await req.json()
  if (!word) return NextResponse.json({ error: 'Parola richiesta' }, { status: 400 })

  const prompt = `Sei un dizionario linguistico preciso.
Per la parola/frase "${word}" in ${sourceLanguage || 'inglese'}:
1. Traduzione in ${targetLanguage || 'italiano'}
2. Definizione semplice in ${targetLanguage || 'italiano'} (max 20 parole)
3. Esempio d'uso in una frase

Rispondi SOLO con questo JSON:
{
  "word": "${word}",
  "translation": "<traduzione>",
  "definition": "<definizione breve>",
  "example": "<frase esempio>",
  "partOfSpeech": "<sostantivo/verbo/aggettivo/etc>"
}`

  const result = await geminiFlash.generateContent(prompt)
  const text = result.response.text()
  return NextResponse.json(JSON.parse(text))
}
