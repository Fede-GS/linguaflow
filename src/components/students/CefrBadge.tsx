import { Badge } from '@/components/ui/badge'
import { cn, CEFR_DESCRIPTIONS, CEFR_BADGE_CLASS, type CefrLevel } from '@/lib/utils'

export function CefrBadge({ level, showLabel = false }: { level: string; showLabel?: boolean }) {
  const cls = CEFR_BADGE_CLASS[level as CefrLevel] ?? 'bg-gray-100 text-gray-800'
  return (
    <Badge variant="outline" className={cn('border-0 font-semibold text-xs', cls)}>
      {level}{showLabel && ` · ${CEFR_DESCRIPTIONS[level as CefrLevel]}`}
    </Badge>
  )
}
