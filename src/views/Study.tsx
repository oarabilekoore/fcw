import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Pencil, RotateCcw, X } from 'lucide-react'
import { actions, useLibrary } from '@/lib/store'
import { faceHasContent, isStudyable, TYPE_LABEL } from '@/lib/model'
import { isDue } from '@/lib/srs'
import { shuffle } from '@/lib/utils'
import type { Card as CardT, Result } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge, Card, Progress } from '@/components/ui/card'
import { FaceView } from '@/components/Rich'
import { CardBody } from '@/components/cardTypes'
import { VoiceAnswer, type Verdict } from '@/components/VoiceAnswer'
import { go } from '@/App'

const LABEL: Record<Result, string> = { correct: 'Correct', partial: 'Partly right', incorrect: 'Not quite' }

export function Study({ setId }: { setId: string }) {
  const lib = useLibrary()
  const set = lib.sets.find((s) => s.id === setId)
  const [queue, setQueue] = useState<CardT[] | null>(null)
  if (!set) return <div className="p-8">That set no longer exists. <a className="underline" href="#/">Back home</a></div>
  const ready = set.cards.filter(isStudyable)
  const due = ready.filter((c) => isDue(lib.progress[c.id]))
  const start = (cards: CardT[]) => setQueue(shuffle(cards))

  if (!queue) {
    return (
      <div className="mx-auto max-w-xl space-y-5 px-4 py-10">
        <h1 className="font-display text-3xl font-bold">{set.title}</h1>
        <p className="text-muted-foreground">{ready.length} ready card{ready.length === 1 ? '' : 's'}{set.cards.length > ready.length && ` (${set.cards.length - ready.length} unfinished cards skipped)`} · {due.length} due now</p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" disabled={!due.length} onClick={() => start(due)}>Study due cards ({due.length})</Button>
          <Button size="lg" variant="tonal" disabled={!ready.length} onClick={() => start(ready)}>Study all ({ready.length})</Button>
          <Button size="lg" variant="outline" onClick={() => go(`/set/${set.id}`)}><Pencil />Edit set</Button>
        </div>
      </div>
    )
  }
  return <Session key={queue.map((c) => c.id).join()} setId={set.id} title={set.title} cards={queue} onRestart={(c) => start(c)} />
}

function Session({ setId, title, cards, onRestart }: { setId: string; title: string; cards: CardT[]; onRestart: (c: CardT[]) => void }) {
  const [i, setI] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [voice, setVoice] = useState<Verdict | null>(null)
  const [tally, setTally] = useState<Record<Result, number>>({ correct: 0, partial: 0, incorrect: 0 })
  const [missed, setMissed] = useState<CardT[]>([])
  const next = useRef<HTMLButtonElement>(null)
  const card = cards[i]

  useEffect(() => { if (result) next.current?.focus() }, [result])

  function record(r: Result, v: Verdict | null) {
    setResult(r); setVoice(v)
    setTally((t) => ({ ...t, [r]: t[r] + 1 }))
    if (r !== 'correct') setMissed((m) => [...m, card])
    actions.recordReview(setId, card.id, r)
  }
  function override(r: Result) {
    if (!result || r === result) return
    setTally((t) => ({ ...t, [result]: t[result] - 1, [r]: t[r] + 1 }))
    setMissed((m) => (r === 'correct' ? m.filter((c) => c.id !== card.id) : m.some((c) => c.id === card.id) ? m : [...m, card]))
    setResult(r)
    actions.recordReview(setId, card.id, r)
  }
  const advance = () => { setResult(null); setVoice(null); setI((n) => n + 1) }

  if (i >= cards.length) {
    return (
      <div className="mx-auto max-w-xl space-y-5 px-4 py-10" role="status">
        <h1 className="font-display text-3xl font-bold">Session complete</h1>
        <p className="text-lg">{tally.correct} correct · {tally.partial} partly right · {tally.incorrect} missed</p>
        <div className="flex flex-wrap gap-3">
          {missed.length > 0 && <Button onClick={() => onRestart(missed)}><RotateCcw />Review {missed.length} missed</Button>}
          <Button variant="tonal" onClick={() => go('/')}>Back to my sets</Button>
          <Button variant="outline" onClick={() => go(`/duck/${setId}`)}>Talk it through with the duck</Button>
        </div>
      </div>
    )
  }

  const showBack = (card.type !== 'standard' || voice) && faceHasContent(card.back)
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-lg font-semibold">{title}</h1>
        <span className="text-sm text-muted-foreground">Card {i + 1} of {cards.length}</span>
      </div>
      <Progress value={i / cards.length} label="Session progress" />
      <Card className="space-y-5 p-6 sm:p-8">
        <Badge>{TYPE_LABEL[card.type]}</Badge>
        {(card.type !== 'fill-blank' || faceHasContent(card.front)) && <div className="text-xl"><FaceView face={card.front} /></div>}
        <CardBody key={card.id} card={card} locked={!!result} onResult={(r) => record(r, null)} />
      </Card>

      {!result && card.type !== 'flowchart' && <VoiceAnswer key={card.id} card={card} disabled={false} onVerdict={(v) => record(v.verdict, v)} />}

      <div aria-live="polite">
        {result && (
          <Card className="space-y-3 p-5">
            <p className="flex items-center gap-2 font-display text-lg font-semibold">{result === 'correct' ? <Check className="size-5" /> : result === 'incorrect' ? <X className="size-5" /> : null}{LABEL[result]}</p>
            {voice && (
              <div className="text-sm">
                <p>You said: “{voice.said}”</p>
                <p>{voice.feedback}</p>
                <p className="text-muted-foreground">{voice.source === 'model' ? 'Graded by your local model.' : 'Graded by simple word matching (the model could not be reached).'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Disagree with the grade?">
                  <span>Change grade:</span>
                  {(['correct', 'partial', 'incorrect'] as Result[]).map((r) => <Button key={r} size="sm" variant={r === result ? 'default' : 'outline'} aria-pressed={r === result} onClick={() => override(r)}>{LABEL[r]}</Button>)}
                </div>
              </div>
            )}
            {showBack && <div className="rounded-2xl bg-muted p-4"><p className="mb-1 text-sm font-medium text-muted-foreground">{card.type === 'standard' ? 'Answer' : 'Explanation'}</p><FaceView face={card.back} /></div>}
            <Button ref={next} onClick={advance}>{i + 1 < cards.length ? 'Next card' : 'Finish'}<ArrowRight /></Button>
          </Card>
        )}
      </div>
    </div>
  )
}
