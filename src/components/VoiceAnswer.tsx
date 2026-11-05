import { useRef, useState } from 'react'
import { Mic, Send, Square } from 'lucide-react'
import type { Card, Result } from '@/lib/types'
import { evaluateAnswer } from '@/lib/ai'
import { listen, sttMode, type Listening } from '@/lib/speech'
import { settingsStore } from '@/lib/store'
import { Button } from './ui/button'
import { Input } from './ui/field'

export type Verdict = { verdict: Result; feedback: string; source: 'model' | 'fallback'; said: string }

/** Answer by voice (or type) and have the small model judge it against the card. */
export function VoiceAnswer({ card, disabled, onVerdict }: { card: Card; disabled: boolean; onVerdict: (v: Verdict) => void }) {
  const s = settingsStore.use()
  const [state, setState] = useState<'idle' | 'listening' | 'grading'>('idle')
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const handle = useRef<Listening | null>(null)
  const mode = sttMode(s)

  async function grade(said: string) {
    setState('grading')
    const v = await evaluateAnswer(card, said, s)
    setState('idle')
    onVerdict({ ...v, said })
  }
  async function start() {
    setErr(''); setText(''); setState('listening')
    try {
      handle.current = listen(s, setText)
      const said = await handle.current.result
      if (!said) { setState('idle'); setErr('I did not hear anything. Try again, or type your answer.'); return }
      setText(said)
      await grade(said)
    } catch (e) { setState('idle'); setErr(e instanceof Error ? e.message : String(e)) }
  }

  return (
    <section aria-label="Answer with your voice" className="space-y-3 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center gap-3">
        {state === 'listening' ? (
          <Button variant="destructive" onClick={() => handle.current?.stop()}><Square />Stop listening</Button>
        ) : (
          <Button variant="tonal" disabled={disabled || state === 'grading' || mode === 'none'} onClick={start}><Mic />Answer by voice</Button>
        )}
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {state === 'listening' ? 'Listening…' : state === 'grading' ? 'Checking your answer…' : mode === 'none' ? 'Voice input needs a browser with speech recognition or a Whisper server (Settings).' : 'Say your answer out loud.'}
        </p>
      </div>
      {(text || state !== 'idle') && <p className="rounded-md bg-muted p-3 text-sm" aria-live="polite">“{text || '…'}”</p>}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim() && !disabled) void grade(text.trim()) }}>
        <Input aria-label="Or type your answer" placeholder="Or type your answer to have it graded" value={text} disabled={disabled || state !== 'idle'} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" size="icon" aria-label="Grade my answer" disabled={disabled || !text.trim() || state !== 'idle'}><Send /></Button>
      </form>
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
    </section>
  )
}
