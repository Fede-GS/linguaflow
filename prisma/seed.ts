import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Avvio seed...')

  // Cancella dati esistenti
  await prisma.assignment.deleteMany()
  await prisma.exercise.deleteMany()
  await prisma.student.deleteMany()
  await prisma.teacher.deleteMany()

  // Crea insegnante demo
  const passwordHash = await bcrypt.hash('LinguaFlow2026!', 12)
  const teacher = await prisma.teacher.create({
    data: {
      email: 'teacher@linguaflow.demo',
      name: 'Marco Rossi',
      passwordHash,
      language: 'it',
    },
  })
  console.log('✅ Insegnante demo creato:', teacher.email)

  // Crea studenti demo
  const students = await Promise.all([
    prisma.student.create({
      data: {
        teacherId: teacher.id,
        name: 'Sofia Bianchi',
        email: 'sofia@example.com',
        nativeLanguage: 'it',
        targetLanguage: 'english',
        currentLevel: 'B1',
        targetLevel: 'B2',
        goal: 'Superare Cambridge FCE entro giugno',
        notes: 'Molto brava nella grammatica, da lavorare sulla speaking.',
      },
    }),
    prisma.student.create({
      data: {
        teacherId: teacher.id,
        name: 'Luca Ferrari',
        email: 'luca@example.com',
        nativeLanguage: 'it',
        targetLanguage: 'english',
        currentLevel: 'A2',
        targetLevel: 'B1',
        goal: 'Parlare con colleghi stranieri al lavoro',
        notes: 'Lavora in una multinazionale, si focalizza sul business English.',
      },
    }),
    prisma.student.create({
      data: {
        teacherId: teacher.id,
        name: 'Emma Conti',
        nativeLanguage: 'it',
        targetLanguage: 'english',
        currentLevel: 'C1',
        targetLevel: 'C2',
        goal: 'Ottenere certificazione IELTS 7.5 per università UK',
      },
    }),
    prisma.student.create({
      data: {
        teacherId: teacher.id,
        name: 'Ahmed Al-Rashid',
        nativeLanguage: 'ar',
        targetLanguage: 'italian',
        currentLevel: 'A1',
        targetLevel: 'A2',
        goal: 'Imparare l\'italiano per trasferirsi a Milano',
      },
    }),
  ])
  console.log(`✅ ${students.length} studenti creati`)

  // Crea esercizi demo
  const exercises = await Promise.all([
    prisma.exercise.create({
      data: {
        teacherId: teacher.id,
        title: 'Present Perfect vs Past Simple',
        description: 'Esercizio di riempimento per distinguere present perfect e past simple',
        type: 'FILL_BLANK',
        targetLanguage: 'english',
        cefrLevel: 'B1',
        skillFocus: 'GRAMMAR',
        topic: 'present perfect vs past simple',
        estimatedMinutes: 15,
        tags: ['grammar', 'tenses', 'B1'],
        aiGenerated: true,
        geminiModel: 'gemini-2.0-flash',
        content: {
          instructions: 'Fill in the blanks with the correct form of the verb in brackets.',
          text: 'I ___GAP_1___ (live) in London for three years. Last year, I ___GAP_2___ (visit) Paris for the first time. She ___GAP_3___ (already/see) that movie twice.',
          gaps: [
            { id: 'GAP_1', answer: 'have lived', alternatives: ['have been living'] },
            { id: 'GAP_2', answer: 'visited' },
            { id: 'GAP_3', answer: "has already seen", alternatives: ["has seen already"] },
          ],
        },
        answerKey: {
          GAP_1: 'have lived',
          GAP_2: 'visited',
          GAP_3: 'has already seen',
        },
      },
    }),
    prisma.exercise.create({
      data: {
        teacherId: teacher.id,
        title: 'Business Email Vocabulary',
        description: 'Scelta multipla sul vocabolario delle email formali',
        type: 'MULTIPLE_CHOICE',
        targetLanguage: 'english',
        cefrLevel: 'B2',
        skillFocus: 'VOCABULARY',
        topic: 'business emails',
        estimatedMinutes: 20,
        tags: ['vocabulary', 'business', 'B2'],
        aiGenerated: true,
        geminiModel: 'gemini-2.0-flash',
        content: {
          instructions: 'Choose the most appropriate word or phrase for each gap in a business email context.',
          questions: [
            {
              id: 'Q1',
              text: 'I am writing to ______ about the meeting scheduled for next week.',
              options: [
                { id: 'a', text: 'inquire' },
                { id: 'b', text: 'ask' },
                { id: 'c', text: 'wonder' },
                { id: 'd', text: 'question' },
              ],
              correctOptionId: 'a',
              explanation: '"Inquire" is the most formal and appropriate term for business correspondence.',
            },
            {
              id: 'Q2',
              text: 'Please find ______ the documents you requested.',
              options: [
                { id: 'a', text: 'attached' },
                { id: 'b', text: 'enclosed' },
                { id: 'c', text: 'included' },
                { id: 'd', text: 'joined' },
              ],
              correctOptionId: 'a',
              explanation: '"Attached" is used for email attachments, while "enclosed" is for physical mail.',
            },
          ],
        },
      },
    }),
    prisma.exercise.create({
      data: {
        teacherId: teacher.id,
        title: 'IELTS Reading: Technology and Society',
        description: 'Comprensione di un testo accademico stile IELTS',
        type: 'READING_COMP',
        targetLanguage: 'english',
        cefrLevel: 'C1',
        skillFocus: 'READING',
        topic: 'technology and society',
        estimatedMinutes: 30,
        tags: ['reading', 'IELTS', 'C1', 'academic'],
        aiGenerated: false,
        content: {
          instructions: 'Read the passage carefully and answer the following questions.',
          passage: `The rapid advancement of artificial intelligence has fundamentally transformed the way societies operate. From healthcare diagnostics to financial forecasting, AI systems now perform tasks that were once exclusively in the human domain. However, this technological revolution brings with it a series of complex ethical and social challenges that demand careful consideration.\n\nOne of the primary concerns is the displacement of workers across various sectors. While AI creates new employment opportunities in technology fields, it simultaneously renders obsolete many traditional roles. The speed of this transition poses significant challenges for education and training systems, which must adapt rapidly to prepare workers for an AI-integrated economy.`,
          questions: [
            {
              id: 'Q1',
              question: 'According to the passage, what is one of the primary concerns about AI advancement?',
              type: 'short_answer',
              correctAnswer: 'The displacement of workers across various sectors.',
            },
            {
              id: 'Q2',
              question: 'AI creates new employment opportunities while eliminating traditional roles.',
              type: 'true_false',
              correctAnswer: 'true',
            },
          ],
        },
      },
    }),
  ])
  console.log(`✅ ${exercises.length} esercizi creati`)

  // Crea un'assegnazione demo
  const assignment = await prisma.assignment.create({
    data: {
      exerciseId: exercises[0].id,
      studentId: students[0].id,
      status: 'SUBMITTED',
      assignedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      submittedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      timeSpentSeconds: 720,
      studentAnswers: {
        GAP_1: 'have lived',
        GAP_2: 'visited',
        GAP_3: 'has seen already',
      },
    },
  })
  console.log('✅ Assegnazione demo creata')

  console.log('\n🎉 Seed completato!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📧 Email:    teacher@linguaflow.demo')
  console.log('🔑 Password: LinguaFlow2026!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => {
    console.error('❌ Errore seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
