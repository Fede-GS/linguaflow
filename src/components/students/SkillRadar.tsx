'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

type SkillScores = {
  readingScore: number
  writingScore: number
  listeningScore: number
  speakingScore: number
  grammarScore: number
  vocabularyScore: number
}

type Props = {
  scores: SkillScores
  currentScores?: SkillScores
  size?: number
}

const LABELS: Record<keyof SkillScores, string> = {
  readingScore: 'Lettura',
  writingScore: 'Scrittura',
  listeningScore: 'Ascolto',
  speakingScore: 'Parlato',
  grammarScore: 'Grammatica',
  vocabularyScore: 'Vocabolario',
}

export function SkillRadar({ scores, currentScores, size = 260 }: Props) {
  const hasData = Object.values(scores).some(v => v > 0) || (currentScores && Object.values(currentScores).some(v => v > 0))

  const data = (Object.keys(LABELS) as (keyof SkillScores)[]).map(key => ({
    skill: LABELS[key],
    iniziale: scores[key] ?? 0,
    ...(currentScores ? { attuale: currentScores[key] ?? 0 } : {}),
    fullMark: 10,
  }))

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
        <div className="w-28 h-28 rounded-full border-4 border-dashed border-cream-200 flex items-center justify-center">
          <span className="text-2xl">📊</span>
        </div>
        <p className="text-xs text-muted-foreground">Nessun punteggio iniziale inserito</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#e8dfd0" />
        <PolarAngleAxis
          dataKey="skill"
          tick={{ fontSize: 11, fill: '#4a5568', fontWeight: 500 }}
        />
        <Tooltip
          formatter={(value, name) => [`${Number(value)}/10`, name === 'iniziale' ? 'Livello iniziale' : 'Livello attuale']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e8dfd0' }}
        />
        {currentScores && <Legend formatter={(value) => value === 'iniziale' ? 'Iniziale' : 'Attuale'} />}
        <Radar
          name="iniziale"
          dataKey="iniziale"
          stroke="#94a3b8"
          fill="#94a3b8"
          fillOpacity={0.15}
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
        {currentScores && (
          <Radar
            name="attuale"
            dataKey="attuale"
            stroke="#f97316"
            fill="#f97316"
            fillOpacity={0.25}
            strokeWidth={2}
            dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
          />
        )}
      </RadarChart>
    </ResponsiveContainer>
  )
}
