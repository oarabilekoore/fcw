import { useMemo, useState } from 'react'
import { Check, Diamond, GripVertical, RotateCcw, X } from 'lucide-react'
import type { Card, FlowStep, Result } from '@/lib/types'
import { parseBlanks } from '@/lib/model'
import { cn, seededShuffle } from '@/lib/utils'
import { Button } from './ui/button'
import { FaceView } from './Rich'

export interface CardProps { card: Card; locked: boolean; onResult: (r: Result) => void }

const good = 'border-transparent bg-md-tertiary-container text-md-on-tertiary-container'
const bad = 'border-transparent bg-md-error-container text-md-on-error-container'
const Mark = ({ ok }: { ok: boolean }) => (ok ? <><Check className="size-4" /><span>Correct</span></> : <><X className="size-4" /><span>Not quite</span></>)

/* ---------- Fact given ---------- */
export function StandardCard({ card, locked, onResult }: CardProps) {
  const [shown, setShown] = useState(false)
  return (
    <div className="space-y-4" aria-live="polite">
      {!shown ? <Button onClick={() => setShown(true)}>Show answer</Button> : (
        <>
          <section aria-label="Answer" className="rounded-md bg-muted p-4"><FaceView face={card.back} /></section>
          <div role="group" aria-label="How did you do?" className="flex flex-wrap gap-2">
            <Button variant="destructive" disabled={locked} onClick={() => onResult('incorrect')}><X />Missed it</Button>
            <Button variant="tonal" disabled={locked} onClick={() => onResult('partial')}>Almost</Button>
            <Button disabled={locked} onClick={() => onResult('correct')}><Check />Got it</Button>
          </div>
        </>
      )}
    </div>
  )
}

/* ---------- True or false ---------- */
export function TrueFalseCard({ card, locked, onResult }: CardProps) {
  const [pick, setPick] = useState<boolean | null>(null)
  const choose = (v: boolean) => { if (locked || pick !== null) return; setPick(v); onResult(v === card.answerBool ? 'correct' : 'incorrect') }
  return (
    <div role="group" aria-label="True or false" className="grid gap-3 sm:grid-cols-2">
      {[true, false].map((v) => {
        const done = pick !== null
        const cls = done ? (v === card.answerBool ? good : pick === v ? bad : 'opacity-60') : ''
        return (
          <Button key={String(v)} size="lg" variant="outline" aria-pressed={pick === v} disabled={locked && !done} onClick={() => choose(v)} className={cn('h-16 text-lg', cls)}>
            {v ? 'True' : 'False'}
            {done && v === card.answerBool && <span className="text-sm">(correct answer)</span>}
            {done && pick === v && v !== card.answerBool && <span className="text-sm">(your answer)</span>}
          </Button>
        )
      })}
    </div>
  )
}

/* ---------- Multiple choice ---------- */
export function MultipleChoiceCard({ card, locked, onResult }: CardProps) {
  const choices = card.choices.filter((c) => c.text.trim())
  const multi = card.correct.length > 1
  const [sel, setSel] = useState<string[]>([])
  const [checked, setChecked] = useState(false)
  const toggle = (id: string) => setSel((s) => (multi ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]))
  function check() {
    const right = sel.filter((id) => card.correct.includes(id)).length
    const wrong = sel.length - right
    setChecked(true)
    onResult(right === card.correct.length && wrong === 0 ? 'correct' : right > 0 && wrong === 0 ? 'partial' : 'incorrect')
  }
  return (
    <fieldset className="space-y-3" disabled={locked || checked}>
      <legend className="mb-2 text-sm font-medium text-muted-foreground">{multi ? 'Select all that apply' : 'Choose one answer'}</legend>
      {choices.map((c, i) => {
        const isRight = card.correct.includes(c.id), picked = sel.includes(c.id)
        return (
          <label key={c.id} className={cn('flex cursor-pointer items-center gap-3 rounded-md border border-border p-3', picked && !checked && 'border-primary bg-secondary', checked && isRight && good, checked && picked && !isRight && bad)}>
            <input type={multi ? 'checkbox' : 'radio'} name={card.id} checked={picked} onChange={() => toggle(c.id)} className="size-5 accent-primary" />
            <span className="font-medium">{String.fromCharCode(65 + i)}.</span>
            <span className="flex-1">{c.text}</span>
            {checked && isRight && <span className="text-sm">Correct answer</span>}
            {checked && picked && !isRight && <span className="text-sm">Your pick, not correct</span>}
          </label>
        )
      })}
      {!checked && <Button type="button" disabled={!sel.length} onClick={check}>Check answer</Button>}
    </fieldset>
  )
}

/* ---------- Fill in the blank ---------- */
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
export function FillBlankCard({ card, locked, onResult }: CardProps) {
  const segs = useMemo(() => parseBlanks(card.blankText), [card.blankText])
  const total = segs.filter((s) => typeof s !== 'string').length
  const [vals, setVals] = useState<string[]>(() => Array(total).fill(''))
  const [marks, setMarks] = useState<boolean[] | null>(null)
  function check() {
    const answers = segs.filter((s): s is { answers: string[] } => typeof s !== 'string')
    const m = answers.map((a, i) => a.answers.map(norm).includes(norm(vals[i])))
    setMarks(m)
    const n = m.filter(Boolean).length
    onResult(n === total ? 'correct' : n > 0 ? 'partial' : 'incorrect')
  }
  let b = -1
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!marks && !locked) check() }} className="space-y-4">
      <p className="text-lg leading-10">
        {segs.map((s, i) => {
          if (typeof s === 'string') return <span key={i}>{s}</span>
          const k = ++b
          return (
            <span key={i} className="mx-1 inline-block align-middle">
              <input aria-label={`Blank ${k + 1} of ${total}`} value={vals[k]} disabled={!!marks || locked} size={Math.max(8, s.answers[0].length + 2)}
                onChange={(e) => setVals((v) => v.map((x, j) => (j === k ? e.target.value : x)))}
                className={cn('h-9 rounded-sm border-2 border-input bg-background px-2 text-base', marks && (marks[k] ? good : bad))} />
              {marks && <span className="ml-1 text-sm">{marks[k] ? <span className="inline-flex items-center gap-1"><Check className="size-4" />Correct</span> : <span className="inline-flex items-center gap-1"><X className="size-4" />Answer: {s.answers[0]}</span>}</span>}
            </span>
          )
        })}
      </p>
      {!marks && <Button type="submit" disabled={locked || vals.every((v) => !v.trim())}>Check answers</Button>}
    </form>
  )
}

/* ---------- Flow chart ---------- */
type Status = 'ok' | 'linked' | 'wrong' | 'empty'
const shapeCls = (s: FlowStep['shape']) => (s === 'terminal' ? 'rounded-md' : s === 'decision' ? 'rounded-sm border-dashed' : 'rounded-md')

export function FlowchartCard({ card, locked, onResult }: CardProps) {
  const steps = useMemo(() => card.steps.filter((s) => s.label.trim()), [card.steps])
  const byId = useMemo(() => Object.fromEntries(steps.map((s) => [s.id, s])), [steps])
  const ids = steps.map((s) => s.id)
  const order = useMemo(() => {
    let o = seededShuffle(ids, card.id)
    if (o.join() === ids.join() && o.length > 1) o = [...o.slice(1), o[0]]
    return o
  }, [card.id, ids.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const [slots, setSlots] = useState<(string | null)[]>(() => ids.map(() => null))
  const [sel, setSel] = useState<string | null>(null)
  const [check, setCheck] = useState<{ status: Status[]; links: boolean[] } | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [finished, setFinished] = useState(false)
  const frozen = locked || finished
  const bank = order.filter((id) => !slots.includes(id))

  const place = (id: string, i: number) => { if (frozen) return; setCheck(null); setSlots((p) => { const n = p.map((x) => (x === id ? null : x)); n[i] = id; return n }) }
  const unplace = (id: string) => { if (frozen) return; setCheck(null); setSlots((p) => p.map((x) => (x === id ? null : x))) }
  const slotClick = (i: number) => {
    if (frozen) return
    if (sel) { place(sel, i); setSel(null) }
    else if (slots[i]) { setSel(slots[i]); setCheck(null); setSlots((p) => p.map((x, j) => (j === i ? null : x))) }
  }

  function validate() {
    const status: Status[] = slots.map((id, i) => (id === null ? 'empty' : id === ids[i] ? 'ok' : 'wrong'))
    const links = slots.slice(0, -1).map((id, i) => !!id && !!slots[i + 1] && ids.indexOf(slots[i + 1]!) === ids.indexOf(id) + 1)
    status.forEach((s, i) => { if (s === 'wrong' && (links[i - 1] || links[i])) status[i] = 'linked' })
    setCheck({ status, links })
    setAttempts((a) => a + 1)
    const ok = status.filter((s) => s === 'ok').length
    if (ok === ids.length) { setFinished(true); onResult(attempts === 0 ? 'correct' : 'partial') }
  }
  const finish = () => { if (!check) return; const ok = check.status.filter((s) => s === 'ok').length; setFinished(true); onResult(ok >= 2 ? 'partial' : 'incorrect') }
  const fixErrors = () => { if (!check) return; setSlots((p) => p.map((id, i) => (check.status[i] === 'ok' ? id : null))); setCheck(null) }

  // Describe contiguous regions: "Steps 1–2 are correct. Step 3 needs another look."
  const regions = useMemo(() => {
    if (!check) return []
    const out: { from: number; to: number; ok: boolean }[] = []
    check.status.forEach((s, i) => { const ok = s === 'ok'; const l = out[out.length - 1]; if (l && l.ok === ok) l.to = i; else out.push({ from: i, to: i, ok }) })
    return out
  }, [check])
  const piece = (id: string, extra = '') => {
    const st = byId[id]
    return (
      <span className={cn('flex min-h-11 items-center gap-2 border-2 border-border bg-background px-4 py-2 text-sm font-medium', shapeCls(st.shape), extra)}>
        {st.shape === 'decision' && <Diamond className="size-4" aria-label="Decision" />}{st.label}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Drag pieces into the chart, or select a piece and then select a slot. Select a placed piece to pick it up again.
      </p>
      <div className="grid gap-6 md:grid-cols-[minmax(0,14rem)_1fr]">
        <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData('text/plain'); if (id) unplace(id) }}
          className="space-y-2 rounded-md bg-muted p-3" role="group" aria-label="Pieces to place">
          <p className="text-sm font-medium">Pieces ({bank.length})</p>
          {bank.length === 0 && <p className="text-sm text-muted-foreground">All pieces placed.</p>}
          {bank.map((id) => (
            <button key={id} type="button" draggable={!frozen} disabled={frozen} aria-pressed={sel === id} onDragStart={(e) => e.dataTransfer.setData('text/plain', id)}
              onClick={() => setSel(sel === id ? null : id)} className={cn('flex w-full items-center gap-1 text-left', sel === id && 'ring-2 ring-primary rounded-md')}>
              <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />{piece(id, 'flex-1')}
            </button>
          ))}
        </div>

        <ol aria-label="Flow chart" className="flex flex-col items-center gap-0">
          {slots.map((id, i) => {
            const st = check?.status[i]
            const cls = st === 'ok' ? good : st === 'wrong' ? bad : st === 'linked' ? 'border-transparent bg-md-secondary-container text-md-on-secondary-container' : ''
            return (
              <li key={i} className="flex w-full max-w-md flex-col items-center">
                <button type="button" onClick={() => slotClick(i)} disabled={frozen && !id}
                  onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const d = e.dataTransfer.getData('text/plain'); if (d) place(d, i) }}
                  draggable={!!id && !frozen} onDragStart={(e) => id && e.dataTransfer.setData('text/plain', id)}
                  aria-label={id ? `Step ${i + 1}: ${byId[id].label}${st ? `, ${st === 'ok' ? 'correct' : st === 'linked' ? 'right order but wrong position' : 'wrong'}` : ''}` : `Step ${i + 1}: empty slot`}
                  className={cn('flex min-h-14 w-full items-center justify-center rounded-md border-2 border-dashed border-input p-1 text-sm', id && 'border-solid border-transparent p-0', sel && !id && 'bg-secondary')}>
                  {id ? piece(id, cn('w-full justify-center', cls)) : <span className="text-muted-foreground">Step {i + 1}</span>}
                </button>
                {st && st !== 'empty' && (
                  <span className="mt-1 flex items-center gap-1 text-xs" aria-hidden>
                    {st === 'ok' ? <><Check className="size-3" />Correct</> : st === 'linked' ? <>Right order, wrong place</> : <><X className="size-3" />Wrong</>}
                  </span>
                )}
                {i < slots.length - 1 && (
                  <span className="flex flex-col items-center py-1" aria-hidden>
                    <span className={cn('h-4 w-0.5', check ? (check.links[i] ? 'bg-md-tertiary' : 'bg-md-error') : 'bg-border')} />
                    <span className={cn('size-0 border-x-[6px] border-t-[8px] border-x-transparent', check ? (check.links[i] ? 'border-t-md-tertiary' : 'border-t-md-error') : 'border-t-border')} />
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      <div aria-live="polite" className="space-y-2">
        {check && !finished && (
          <div className="rounded-md bg-muted p-4">
            <p className="font-medium">{check.status.filter((s) => s === 'ok').length} of {ids.length} steps are in the right place.</p>
            <ul className="mt-1 list-inside list-disc text-sm">
              {regions.map((r) => <li key={r.from}>{r.from === r.to ? `Step ${r.from + 1}` : `Steps ${r.from + 1}–${r.to + 1}`} {r.ok ? (r.to > r.from ? 'are correct.' : 'is correct.') : (r.to > r.from ? 'need another look.' : 'needs another look.')}</li>)}
            </ul>
          </div>
        )}
        {finished && !ids.every((id, i) => slots[i] === id) && (
          <div className="rounded-md bg-muted p-4"><p className="font-medium">Correct order</p><ol className="list-inside list-decimal text-sm">{steps.map((s) => <li key={s.id}>{s.label}</li>)}</ol></div>
        )}
      </div>

      {!frozen && (
        <div className="flex flex-wrap gap-2">
          {!check ? <Button disabled={slots.every((x) => x === null)} onClick={validate}>Check flow chart</Button> : (
            <>
              <Button onClick={fixErrors}><RotateCcw />Fix the errors</Button>
              <Button variant="outline" onClick={finish}>Finish with this attempt</Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function CardBody(p: CardProps) {
  switch (p.card.type) {
    case 'true-false': return <TrueFalseCard {...p} />
    case 'multiple-choice': return <MultipleChoiceCard {...p} />
    case 'fill-blank': return <FillBlankCard {...p} />
    case 'flowchart': return <FlowchartCard {...p} />
    default: return <StandardCard {...p} />
  }
}
export { Mark }
