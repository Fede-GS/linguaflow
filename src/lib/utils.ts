import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'dd MMM yyyy', { locale: it })
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: it })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type CefrLevel = (typeof CEFR_LEVELS)[number]

export const CEFR_DESCRIPTIONS: Record<CefrLevel, string> = {
  A1: 'Principiante',
  A2: 'Elementare',
  B1: 'Intermedio',
  B2: 'Intermedio superiore',
  C1: 'Avanzato',
  C2: 'Padronanza',
}

export const CEFR_BADGE_CLASS: Record<CefrLevel, string> = {
  A1: 'badge-a1',
  A2: 'badge-a2',
  B1: 'badge-b1',
  B2: 'badge-b2',
  C1: 'badge-c1',
  C2: 'badge-c2',
}

export const EXERCISE_TYPE_LABELS: Record<string, string> = {
  FILL_BLANK: 'Riempi i buchi',
  MULTIPLE_CHOICE: 'Scelta multipla',
  MATCHING: 'Abbinamento',
  REORDER: 'Riordina',
  CLOZE: 'Cloze test',
  TRUE_FALSE: 'Vero/Falso',
  SHORT_ANSWER: 'Risposta breve',
  ESSAY: 'Tema / Testo libero',
  READING_COMP: 'Comprensione scritta',
  LISTENING_COMP: 'Comprensione orale',
  DIALOGUE_COMPLETE: 'Completa il dialogo',
  ERROR_CORRECTION: 'Correggi gli errori',
  WORD_FORMATION: 'Formazione parole',
  TRANSLATION: 'Traduzione',
  DICTATION: 'Dettato',
  CONVERSATION_SIM: 'Simulazione conversazione',
}

export const SKILL_FOCUS_LABELS: Record<string, string> = {
  READING: 'Lettura',
  WRITING: 'Scrittura',
  LISTENING: 'Ascolto',
  SPEAKING: 'Parlato',
  GRAMMAR: 'Grammatica',
  VOCABULARY: 'Vocabolario',
}

export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Assegnato',
  IN_PROGRESS: 'In corso',
  SUBMITTED: 'Consegnato',
  GRADED: 'Corretto',
  RETURNED: 'Restituito',
}

