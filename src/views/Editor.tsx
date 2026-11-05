import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Eye, Plus, Trash2 } from 'lucide-react'
import { actions, useLibrary } from '@/lib/store'
import { CARD_TYPES, faceToText, newCard, TYPE_LABEL, uid } from '@/lib/model'
import { exportPdf, exportPptx } from '@/lib/export'
import { download, parseImport, serializeSets } from '@/lib/fcw'
import type { Card, CardType, FlowStep } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/field'
import { Card as Panel } from '@/components/ui/card'
import {
  Dialog, DialogContent, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger,
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/overlay'
import { FaceEditor } from '@/components/FaceEditor'
import { FaceView } from '@/components/Rich'
import { CardBody } from '@/components/cardTypes'
import { go } from '@/App'

export function Editor({ setId }: { setId: string }) {
  const lib = useLibrary()
  const set = lib.sets.find((s) => s.id === setId)
  const [idx, setIdx] = useState(0)
  const [preview, setPreview] = useState(false)
  const [status, setStatus] = useState('All changes saved')
  const n = set?.cards.length ?? 0
  const i = Math.min(idx, Math.max(0, n - 1))
  const card = set?.cards[i]
  useEffect(() => { if (idx !== i) setIdx(i) }, [idx, i])
  if (!set) return <div className="p-8">That set no longer exists. <a className="underline" href="#/">Back home</a></div>

  const save = (c: Card) => actions.updateCard(set.id, c)
  const add = (t: CardType) => { actions.addCard(set.id, newCard(t), i + 1); setIdx(i + 1) }
  const del = () => { if (card && n > 1 && confirm('Delete this card?')) actions.deleteCard(set.id, card.id) }
  const mv = (d: number) => { if (i + d >= 0 && i + d < n) { actions.moveCard(set.id, i, i + d); setIdx(i + d) } }
  const run = async (label: string, fn: () => Promise<void> | void) => { setStatus(`${label}…`); try { await fn(); setStatus(`${label} done`) } catch (e) { setStatus(`${label} failed: ${e instanceof Error ? e.message : e}`) } }
  const importFile = () => {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.fcw,.json,.csv,.tsv,.txt' })
    inp.onchange = async () => { const f = inp.files?.[0]; if (f) await run('Import', async () => { const sets = parseImport(f.name, await f.text()); actions.importSets(sets) }) }
    inp.click()
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col px-2 pb-6 sm:px-4">
      <div className="flex flex-wrap items-end gap-3 px-2 pt-4">
        <div className="min-w-60 flex-1">
          <Label htmlFor="set-title">Set title</Label>
          <Input id="set-title" value={set.title} onChange={(e) => actions.updateSet(set.id, { title: e.target.value })} className="font-display text-lg font-semibold" />
        </div>
        <Button onClick={() => go(`/study/${set.id}`)}>Study this set</Button>
      </div>

      <Menubar aria-label="Set menu" className="mt-3">
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={importFile}>Import file…</MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={() => download(`${set.title || 'flashcards'}.fcw`, serializeSets([set]), 'application/vnd.flashcardwizard+json')}>Save as .fcw (Flashcard Wizard file)</MenubarItem>
            <MenubarItem onSelect={() => void run('PDF export', () => exportPdf(set))}>Export as PDF</MenubarItem>
            <MenubarItem onSelect={() => void run('PowerPoint export', () => exportPptx(set))}>Export as PowerPoint (.pptx)</MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={() => go('/')}>Close set</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarSub>
              <MenubarSubTrigger>Add card</MenubarSubTrigger>
              <MenubarSubContent>{CARD_TYPES.map((t) => <MenubarItem key={t} onSelect={() => add(t)}>{TYPE_LABEL[t]}</MenubarItem>)}</MenubarSubContent>
            </MenubarSub>
            <MenubarItem onSelect={() => card && actions.duplicateCard(set.id, card, i)}>Duplicate card</MenubarItem>
            <MenubarItem disabled={i === 0} onSelect={() => mv(-1)}>Move card up</MenubarItem>
            <MenubarItem disabled={i >= n - 1} onSelect={() => mv(1)}>Move card down</MenubarItem>
            <MenubarSeparator />
            <MenubarItem disabled={n <= 1} onSelect={del}>Delete card</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={() => setPreview(true)}>Preview card</MenubarItem>
            <MenubarItem onSelect={() => go(`/study/${set.id}`)}>Study this set</MenubarItem>
            <MenubarItem onSelect={() => go(`/duck/${set.id}`)}>Rubber duck mode</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      <div className="grid min-h-[34rem] gap-0 md:grid-cols-[13rem_1fr]">
        <nav aria-label="Cards in this set" className="border-b border-border p-3 md:border-b-0 md:border-r">
          <ol className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
            {set.cards.map((c, k) => (
              <li key={c.id} className="shrink-0">
                <button onClick={() => setIdx(k)} aria-current={k === i ? 'true' : undefined} aria-label={`Card ${k + 1}, ${TYPE_LABEL[c.type]}`}
                  className={`h-20 w-36 rounded-md border-2 p-2 text-left text-xs md:w-full ${k === i ? 'border-primary bg-secondary' : 'border-border bg-card hover:bg-muted'}`}>
                  <span className="font-semibold">{k + 1}. {TYPE_LABEL[c.type]}</span>
                  <span className="mt-1 line-clamp-2 block text-muted-foreground">{faceToText(c.front).replace(/\$/g, '') || c.blankText.replace(/[{}]/g, '') || 'Empty card'}</span>
                </button>
              </li>
            ))}
            <li className="shrink-0 md:mt-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" className="h-10 w-full rounded-md" aria-label="Add card"><Plus />Add card</Button></DropdownMenuTrigger>
                <DropdownMenuContent>{CARD_TYPES.map((t) => <DropdownMenuItem key={t} onSelect={() => add(t)}>{TYPE_LABEL[t]}</DropdownMenuItem>)}</DropdownMenuContent>
              </DropdownMenu>
            </li>
          </ol>
        </nav>

        <section aria-label={`Editing card ${i + 1}`} className="min-w-0 p-4 md:p-6">
          {card && (
            <Panel className="space-y-5 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="w-56">
                  <Label htmlFor="card-type">Card type</Label>
                  <Select id="card-type" value={card.type} onChange={(e) => {
                    const t = e.target.value as CardType, d = newCard(t)
                    save({ ...card, type: t, choices: card.choices.length ? card.choices : d.choices, steps: card.steps.length ? card.steps : d.steps })
                  }}>{CARD_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</Select>
                </div>
                <div className="flex gap-1">
                  <Button size="iconSm" variant="ghost" aria-label="Duplicate card" onClick={() => actions.duplicateCard(set.id, card, i)}><Copy /></Button>
                  <Button size="iconSm" variant="ghost" aria-label="Move card up" disabled={i === 0} onClick={() => mv(-1)}><ArrowUp /></Button>
                  <Button size="iconSm" variant="ghost" aria-label="Move card down" disabled={i >= n - 1} onClick={() => mv(1)}><ArrowDown /></Button>
                  <Button size="iconSm" variant="ghost" aria-label="Preview card" onClick={() => setPreview(true)}><Eye /></Button>
                  <Button size="iconSm" variant="ghost" aria-label="Delete card" disabled={n <= 1} onClick={del}><Trash2 /></Button>
                </div>
              </div>

              <Tabs defaultValue="front" key={card.id + card.type}>
                <TabsList aria-label="Card sides">
                  <TabsTrigger value="front">{card.type === 'flowchart' ? 'Question' : 'Front'}</TabsTrigger>
                  {card.type !== 'standard' && <TabsTrigger value="options">{{ 'multiple-choice': 'Choices', 'true-false': 'Answer', 'fill-blank': 'Blanks', flowchart: 'Flow steps' }[card.type]}</TabsTrigger>}
                  <TabsTrigger value="back">{card.type === 'standard' ? 'Back (answer)' : 'Explanation (optional)'}</TabsTrigger>
                </TabsList>
                <TabsContent value="front"><FaceEditor label="Front" face={card.front} onChange={(front) => save({ ...card, front })} /></TabsContent>
                <TabsContent value="back"><FaceEditor label="Back" face={card.back} onChange={(back) => save({ ...card, back })} /></TabsContent>
                <TabsContent value="options"><TypeOptions card={card} save={save} /></TabsContent>
              </Tabs>
            </Panel>
          )}
        </section>
      </div>

      <div className="flex justify-between border-t border-border px-4 pt-2 text-sm text-muted-foreground" role="status">
        <span>Card {n ? i + 1 : 0} of {n}</span><span>{status}</span>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent title="Card preview" description="How this card looks while studying.">
          {card && (
            <div className="space-y-4">
              <div className="text-lg"><FaceView face={card.front} /></div>
              <CardBody key={card.id + card.type} card={card} locked={false} onResult={() => {}} />
              {card.type !== 'standard' && <div className="rounded-md bg-muted p-3"><p className="text-xs text-muted-foreground">Explanation</p><FaceView face={card.back} /></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TypeOptions({ card, save }: { card: Card; save: (c: Card) => void }) {
  if (card.type === 'true-false') {
    return (
      <fieldset className="space-y-2"><legend className="mb-1 text-sm font-medium">The statement on the front is…</legend>
        {[true, false].map((v) => (
          <label key={String(v)} className="flex items-center gap-2"><input type="radio" name="tf" className="size-5 accent-primary" checked={card.answerBool === v} onChange={() => save({ ...card, answerBool: v })} />{v ? 'True' : 'False'}</label>
        ))}
      </fieldset>
    )
  }
  if (card.type === 'multiple-choice') {
    const upd = (id: string, text: string) => save({ ...card, choices: card.choices.map((c) => (c.id === id ? { ...c, text } : c)) })
    const toggle = (id: string) => save({ ...card, correct: card.correct.includes(id) ? card.correct.filter((x) => x !== id) : [...card.correct, id] })
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Tick every correct choice. More than one tick makes it a “select all that apply” card.</p>
        {card.choices.map((c, k) => (
          <div key={c.id} className="flex items-center gap-2">
            <input type="checkbox" className="size-5 accent-primary" aria-label={`Choice ${k + 1} is correct`} checked={card.correct.includes(c.id)} onChange={() => toggle(c.id)} />
            <Input aria-label={`Choice ${k + 1} text`} value={c.text} onChange={(e) => upd(c.id, e.target.value)} placeholder={`Choice ${k + 1}`} />
            <Button size="iconSm" variant="ghost" aria-label={`Remove choice ${k + 1}`} disabled={card.choices.length <= 2} onClick={() => save({ ...card, choices: card.choices.filter((x) => x.id !== c.id), correct: card.correct.filter((x) => x !== c.id) })}><Trash2 /></Button>
          </div>
        ))}
        <Button variant="tonal" size="sm" onClick={() => save({ ...card, choices: [...card.choices, { id: uid(), text: '' }] })}><Plus />Add choice</Button>
      </div>
    )
  }
  if (card.type === 'fill-blank') {
    return (
      <div className="space-y-2">
        <Label htmlFor="blanks">Sentence with blanks</Label>
        <Input id="blanks" value={card.blankText} onChange={(e) => save({ ...card, blankText: e.target.value })} placeholder="The {{mitochondria|mitochondrion}} is the powerhouse of the cell." />
        <p className="text-sm text-muted-foreground">Wrap each answer in double braces. Separate accepted alternatives with a bar.</p>
      </div>
    )
  }
  const upd = (id: string, p: Partial<FlowStep>) => save({ ...card, steps: card.steps.map((s) => (s.id === id ? { ...s, ...p } : s)) })
  const mv = (k: number, d: number) => { const a = [...card.steps]; const j = k + d; if (j < 0 || j >= a.length) return; [a[k], a[j]] = [a[j], a[k]]; save({ ...card, steps: a }) }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Enter the steps in the <strong>correct</strong> order. Learners get them shuffled and must rebuild the chart. Put the instruction (e.g. “Assemble the steps of …”) on the Question tab.</p>
      <ol className="space-y-2">
        {card.steps.map((s, k) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2">
            <span className="w-6 text-right text-sm">{k + 1}.</span>
            <Input className="min-w-48 flex-1" aria-label={`Step ${k + 1} label`} value={s.label} onChange={(e) => upd(s.id, { label: e.target.value })} />
            <Select className="w-36" aria-label={`Step ${k + 1} shape`} value={s.shape} onChange={(e) => upd(s.id, { shape: e.target.value as FlowStep['shape'] })}>
              <option value="process">Process</option><option value="decision">Decision</option><option value="terminal">Start / end</option>
            </Select>
            <Button size="iconSm" variant="ghost" aria-label={`Move step ${k + 1} up`} disabled={k === 0} onClick={() => mv(k, -1)}><ArrowUp /></Button>
            <Button size="iconSm" variant="ghost" aria-label={`Move step ${k + 1} down`} disabled={k === card.steps.length - 1} onClick={() => mv(k, 1)}><ArrowDown /></Button>
            <Button size="iconSm" variant="ghost" aria-label={`Remove step ${k + 1}`} disabled={card.steps.length <= 2} onClick={() => save({ ...card, steps: card.steps.filter((x) => x.id !== s.id) })}><Trash2 /></Button>
          </li>
        ))}
      </ol>
      <Button variant="tonal" size="sm" onClick={() => save({ ...card, steps: [...card.steps, { id: uid(), label: '', shape: 'process' }] })}><Plus />Add step</Button>
    </div>
  )
}
