// ─── TIPI JSON PER OGNI ExerciseType ──────────────────────────────────────────
// Questi sono i tipi che Gemini deve rispettare nel campo Exercise.content

export type FillBlankContent = {
  instructions: string
  text: string
  gaps: Array<{
    id: string
    answer: string
    alternatives?: string[]
    hint?: string
  }>
}

export type MultipleChoiceContent = {
  instructions: string
  questions: Array<{
    id: string
    text: string
    options: Array<{ id: string; text: string }>
    correctOptionId: string
    explanation?: string
  }>
}

export type MatchingContent = {
  instructions: string
  pairs: Array<{
    id: string
    left: string
    right: string
  }>
}

export type ReorderContent = {
  instructions: string
  sentences: Array<{
    id: string
    words: string[]
    correctOrder: number[]
    hint?: string
  }>
}

export type TrueFalseContent = {
  instructions: string
  text?: string
  statements: Array<{
    id: string
    statement: string
    answer: 'true' | 'false' | 'not_given'
    justification?: string
  }>
}

export type ShortAnswerContent = {
  instructions: string
  questions: Array<{
    id: string
    question: string
    sampleAnswer: string
    keywords: string[]
    maxWords?: number
  }>
}

export type EssayContent = {
  instructions: string
  prompt: string
  minWords?: number
  maxWords?: number
  rubric: {
    content: string
    grammar: string
    vocabulary: string
    structure: string
  }
}

export type ReadingCompContent = {
  instructions: string
  passage: string
  questions: Array<{
    id: string
    question: string
    type: 'multiple_choice' | 'short_answer' | 'true_false'
    options?: Array<{ id: string; text: string }>
    correctAnswer: string
  }>
}

export type ErrorCorrectionContent = {
  instructions: string
  sentences: Array<{
    id: string
    incorrect: string
    correct: string
    errorType: string
  }>
}

export type WordFormationContent = {
  instructions: string
  context?: string
  items: Array<{
    id: string
    sentence: string
    baseWord: string
    answer: string
  }>
}

export type TranslationContent = {
  instructions: string
  direction: 'it_to_en' | 'en_to_it'
  items: Array<{
    id: string
    source: string
    target: string
    notes?: string
  }>
}

export type DialogueContent = {
  instructions: string
  scenario: string
  dialogue: Array<{
    id: string
    speaker: string
    text: string
    isGap: boolean
    answer?: string
    options?: string[]
  }>
}

export type ClozeContent = {
  instructions: string
  passage: string
  gaps: Array<{
    id: string
    answer: string
    position: number
  }>
  wordBank?: string[]
}

export type DictationContent = {
  instructions: string
  text: string
  hint?: string
  focusPoints: string[]
}

export type ConversationSimContent = {
  instructions: string
  scenario: string
  role: string
  studentRole: string
  targetVocabulary: string[]
  targetGrammar: string
  turnsExpected: number
  starterLine: string
}

export type ListeningCompContent = {
  instructions: string
  transcript: string
  questions: Array<{
    id: string
    question: string
    type: 'multiple_choice' | 'short_answer'
    options?: Array<{ id: string; text: string }>
    correctAnswer: string
  }>
}

export type ExerciseContent =
  | FillBlankContent
  | MultipleChoiceContent
  | MatchingContent
  | ReorderContent
  | TrueFalseContent
  | ShortAnswerContent
  | EssayContent
  | ReadingCompContent
  | ErrorCorrectionContent
  | WordFormationContent
  | TranslationContent
  | DialogueContent
  | ClozeContent
  | DictationContent
  | ConversationSimContent
  | ListeningCompContent

// Risposta AI per correzione
export type AICorrectionResult = {
  score: number
  feedbackDraft: string
  errors: Array<{ type: string; description: string; example: string }>
  suggestions: string[]
}

// Risposta API dizionario
export type DictionaryResult = {
  word: string
  translation: string
  definition: string
  example: string
  partOfSpeech: string
}
