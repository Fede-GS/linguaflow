'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Message = { role: 'ai' | 'student'; text: string }

type Props = {
  content: Record<string, unknown>
  cefrLevel?: string
  /** Called on every new exchange so the parent can persist the conversation */
  onUpdate?: (messages: Message[]) => void
  /** Initial messages (for readonly / already-submitted view) */
  initialMessages?: Message[]
  readonly?: boolean
}

export function ConversationSimChat({ content, cefrLevel, onUpdate, initialMessages, readonly = false }: Props) {
  const scenario = (content.scenario as string) ?? ''
  const aiRole = (content.role as string) ?? 'A'
  const studentRole = (content.studentRole as string) ?? 'Student'
  const starterLine = (content.starterLine as string) ?? ''
  const targetVocabulary = (content.targetVocabulary as string[] | undefined) ?? []
  const targetGrammar = content.targetGrammar as string | undefined

  const [messages, setMessages] = useState<Message[]>(() => {
    if (initialMessages?.length) return initialMessages
    if (starterLine) return [{ role: 'ai', text: starterLine }]
    return []
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const updated: Message[] = [...messages, { role: 'student', text }]
    setMessages(updated)
    setLoading(true)

    try {
      const res = await fetch('/api/conversation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          role: aiRole,
          studentRole,
          targetVocabulary,
          targetGrammar,
          cefrLevel,
          history: updated.slice(0, -1), // exclude last student message (sent separately)
          studentMessage: text,
        }),
      })
      const data = await res.json()
      if (data.reply) {
        const final: Message[] = [...updated, { role: 'ai', text: data.reply }]
        setMessages(final)
        onUpdate?.(final)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Scenario */}
      <div className="bg-edu-blue-50 border border-edu-blue-100 rounded-xl p-3 space-y-1">
        <p className="text-xs font-semibold text-edu-blue-700 uppercase tracking-wide">Scenario</p>
        <p className="text-sm text-navy-700">{scenario}</p>
        {!!studentRole && (
          <p className="text-xs text-muted-foreground mt-1">
            Il tuo ruolo: <span className="font-medium text-navy-700">{studentRole}</span>
          </p>
        )}
      </div>

      {/* Chat history */}
      <div className="flex flex-col gap-2 min-h-[120px] max-h-72 overflow-y-auto px-1">
        {messages.map((msg, i) => {
          const isAI = msg.role === 'ai'
          return (
            <div key={i} className={cn('flex gap-2 items-end', isAI ? '' : 'flex-row-reverse')}>
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                isAI ? 'bg-edu-blue-500 text-white' : 'bg-coral-500 text-white',
              )}>
                {isAI ? aiRole.charAt(0).toUpperCase() : 'S'}
              </div>
              <div className={cn(
                'text-sm px-3 py-2 rounded-2xl max-w-[80%] leading-relaxed',
                isAI
                  ? 'bg-cream-50 border border-cream-200 text-navy-700 rounded-bl-sm'
                  : 'bg-coral-500 text-white rounded-br-sm',
              )}>
                {msg.text}
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-2 items-end">
            <div className="w-6 h-6 rounded-full bg-edu-blue-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
              {aiRole.charAt(0).toUpperCase()}
            </div>
            <div className="bg-cream-50 border border-cream-200 rounded-2xl rounded-bl-sm px-3 py-2">
              <span className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-navy-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-navy-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-navy-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Target vocabulary */}
      {targetVocabulary.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-muted-foreground">Vocabolario:</span>
          {targetVocabulary.map((w, i) => (
            <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">{w}</span>
          ))}
        </div>
      )}

      {/* Input */}
      {!readonly && (
        <div className="flex gap-2 items-end border-t border-cream-200 pt-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
            placeholder={`Rispondi come ${studentRole}…`}
            rows={2}
            className="flex-1 resize-none border border-cream-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-400 bg-white"
          />
          <button
            type="button"
            onClick={send}
            disabled={loading || !input.trim()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-coral-500 text-white hover:bg-coral-600 disabled:opacity-40 transition-colors flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  )
}
