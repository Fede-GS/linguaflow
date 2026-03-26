'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { CEFR_LEVELS, CEFR_DESCRIPTIONS } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Nome richiesto'),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  nativeLanguage: z.string(),
  targetLanguage: z.string(),
  currentLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  targetLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  goal: z.string().optional(),
  notes: z.string().optional(),
  previousExperience: z.string().optional(),
  learningStyle: z.string().optional(),
  studyHoursPerWeek: z.number().min(0).max(40).optional(),
  // Competenze 0-10
  readingScore: z.number().min(0).max(10).optional(),
  writingScore: z.number().min(0).max(10).optional(),
  listeningScore: z.number().min(0).max(10).optional(),
  speakingScore: z.number().min(0).max(10).optional(),
  grammarScore: z.number().min(0).max(10).optional(),
  vocabularyScore: z.number().min(0).max(10).optional(),
})

export type StudentFormData = z.infer<typeof schema>

type Props = {
  defaultValues?: Partial<StudentFormData>
  onSubmit: (data: StudentFormData) => Promise<void>
  submitLabel?: string
}

const SKILLS = [
  { key: 'readingScore', label: 'Lettura', emoji: '📖' },
  { key: 'writingScore', label: 'Scrittura', emoji: '✍️' },
  { key: 'listeningScore', label: 'Ascolto', emoji: '🎧' },
  { key: 'speakingScore', label: 'Parlato', emoji: '🗣️' },
  { key: 'grammarScore', label: 'Grammatica', emoji: '📐' },
  { key: 'vocabularyScore', label: 'Vocabolario', emoji: '📚' },
] as const

export function StudentForm({ defaultValues, onSubmit, submitLabel = 'Aggiungi' }: Props) {
  const { register, handleSubmit, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<StudentFormData, unknown, StudentFormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      nativeLanguage: 'it',
      targetLanguage: 'english',
      currentLevel: 'B1',
      targetLevel: 'B2',
      readingScore: 0,
      writingScore: 0,
      listeningScore: 0,
      speakingScore: 0,
      grammarScore: 0,
      vocabularyScore: 0,
      studyHoursPerWeek: 3,
      ...defaultValues,
    },
  })

  const scores = watch(['readingScore', 'writingScore', 'listeningScore', 'speakingScore', 'grammarScore', 'vocabularyScore'])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Anagrafica */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dati personali</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label>Nome completo <span className="text-red-500">*</span></Label>
            <Input placeholder="es. Sofia Bianchi" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Email <span className="text-muted-foreground text-xs">(opz.)</span></Label>
            <Input type="email" placeholder="studente@email.com" {...register('email')} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefono <span className="text-muted-foreground text-xs">(opz.)</span></Label>
            <Input type="tel" placeholder="+39 333..." {...register('phone')} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Profilo linguistico */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Profilo linguistico</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Lingua madre</Label>
            <Select defaultValue={defaultValues?.nativeLanguage ?? 'it'} onValueChange={v => setValue('nativeLanguage', v || 'it')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="it">🇮🇹 Italiano</SelectItem>
                <SelectItem value="en">🇬🇧 Inglese</SelectItem>
                <SelectItem value="es">🇪🇸 Spagnolo</SelectItem>
                <SelectItem value="fr">🇫🇷 Francese</SelectItem>
                <SelectItem value="de">🇩🇪 Tedesco</SelectItem>
                <SelectItem value="ar">🇸🇦 Arabo</SelectItem>
                <SelectItem value="zh">🇨🇳 Cinese</SelectItem>
                <SelectItem value="pt">🇵🇹 Portoghese</SelectItem>
                <SelectItem value="ru">🇷🇺 Russo</SelectItem>
                <SelectItem value="other">Altra</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Lingua studiata</Label>
            <Select defaultValue={defaultValues?.targetLanguage ?? 'english'} onValueChange={v => setValue('targetLanguage', v || 'english')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="english">🇬🇧 Inglese</SelectItem>
                <SelectItem value="italian">🇮🇹 Italiano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Livello attuale</Label>
            <Select defaultValue={defaultValues?.currentLevel ?? 'B1'} onValueChange={v => setValue('currentLevel', v as StudentFormData['currentLevel'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CEFR_LEVELS.map(l => (
                  <SelectItem key={l} value={l}>{l} — {CEFR_DESCRIPTIONS[l]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Livello obiettivo</Label>
            <Select defaultValue={defaultValues?.targetLevel ?? 'B2'} onValueChange={v => setValue('targetLevel', v as StudentFormData['targetLevel'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CEFR_LEVELS.map(l => (
                  <SelectItem key={l} value={l}>{l} — {CEFR_DESCRIPTIONS[l]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Obiettivo principale</Label>
            <Textarea placeholder="es. Superare Cambridge FCE, parlare con colleghi stranieri..." rows={2} {...register('goal')} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Stile apprendimento */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Profilo apprendimento</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Stile di apprendimento</Label>
            <Select defaultValue={defaultValues?.learningStyle ?? ''} onValueChange={v => setValue('learningStyle', v || undefined)}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="visual">👁️ Visivo</SelectItem>
                <SelectItem value="auditory">👂 Uditivo</SelectItem>
                <SelectItem value="kinesthetic">🤲 Cinestetico</SelectItem>
                <SelectItem value="reading">📝 Lettura/Scrittura</SelectItem>
                <SelectItem value="mixed">🔀 Misto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ore di studio / settimana</Label>
            <Input type="number" min={0} max={40} placeholder="es. 3" {...register('studyHoursPerWeek', { valueAsNumber: true })} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Esperienza precedente</Label>
            <Textarea placeholder="es. Ha studiato 2 anni alle medie, ha vissuto 6 mesi all'estero..." rows={2} {...register('previousExperience')} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Valutazione iniziale competenze */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Valutazione iniziale competenze</p>
        <p className="text-xs text-muted-foreground mb-3">Indica il livello iniziale su ogni competenza (0 = nessuna, 10 = ottima)</p>
        <div className="space-y-3">
          {SKILLS.map(({ key, label, emoji }) => {
            const idx = ['readingScore', 'writingScore', 'listeningScore', 'speakingScore', 'grammarScore', 'vocabularyScore'].indexOf(key)
            const currentVal = scores[idx] ?? 0
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-base w-6 flex-shrink-0">{emoji}</span>
                <span className="text-sm font-medium text-navy-700 w-24 flex-shrink-0">{label}</span>
                <Controller
                  name={key}
                  control={control}
                  render={({ field }) => (
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      className="flex-1 accent-coral-500"
                      value={field.value ?? 0}
                      onChange={e => field.onChange(Number(e.target.value))}
                    />
                  )}
                />
                <span className="text-sm font-bold text-coral-500 w-8 text-right flex-shrink-0">
                  {currentVal}/10
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Note private */}
      <div className="space-y-1.5">
        <Label>Note private <span className="text-muted-foreground text-xs">(solo tu le vedi)</span></Label>
        <Textarea placeholder="Punti di forza, difficoltà particolari, note di lavoro..." rows={2} {...register('notes')} />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full bg-coral-500 hover:bg-coral-600 text-white">
        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvataggio...</> : submitLabel}
      </Button>
    </form>
  )
}
