import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export const geminiFlash = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.7,
    responseMimeType: 'application/json',
  },
})

export async function generateJSON<T>(prompt: string): Promise<T> {
  const result = await geminiFlash.generateContent(prompt)
  const text = result.response.text()
  return JSON.parse(text) as T
}
