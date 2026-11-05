import { useMemo, useRef, useState } from 'react'
import { CheckSquare, Download, FileUp, Layers, ListChecks, Pencil, Play, Plus, Search, Trash2, Bird } from 'lucide-react'
import { actions, useLibrary } from '@/lib/store'
import { newSet, TYPE_LABEL } from '@/lib/model'
import { lastDays, setStats, streak } from '@/lib/stats'
import { download, parseImport, serializeSets } from '@/lib/fcw'
import type { CardType } from '@/lib/types'
import { Badge, Card, Progress } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlay'
import { go } from '@/App'

const TEMPLATES: { type: CardType; title: string; blurb: string; icon: typeof Layers }[] = [
  { type: 'standard', title: 'New Flashcard Set', blurb: 'Mix any card types in one set', icon: Layers },
  { type: 'true-false', title: 'True or False Set', blurb: 'Starts with a true/false card', icon: CheckSquare },
  { type: 'multiple-choice', title: 'Multiple choice Set', blurb: 'Starts with a multiple-choice card', icon: ListChecks },
]

export function Home() {
  const lib = useLibrary()
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)

  function create(type: CardType) {
    const s = newSet('Untitled set', type)
    actions.addSet(s)
    go(`/set/${s.id}`)
  }
  async function onImport(files: FileList | null) {
    if (!files) return
    try {
      let n = 0
      for (const f of Array.from(files)) { const sets = parseImport(f.name, await f.text()); actions.importSets(sets); n += sets.length }
      setMsg(`Imported ${n} set${n === 1 ? '' : 's'}.`)
    } catch (e) { setMsg(`Import failed: ${e instanceof Error ? e.message : e}`) }
    if (file.current) file.current.value = ''
  }

  const sets = useMemo(() => lib.sets.filter((s) => s.title.toLowerCase().includes(q.toLowerCase())), [lib.sets, q])
  const days = lastDays(lib.history)
  const maxDay = Math.max(1, ...days.map((d) => d.reviewed))
  const totals = lib.sets.map((s) => setStats(s, lib))
  const due = totals.reduce((a, t) => a + t.due, 0)
  const reviewed = lib.history.reduce((a, h) => a + h.reviewed, 0)
  const correct = lib.history.reduce((a, h) => a + h.correct, 0)

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <section aria-labelledby="tpl">
        <h1 id="tpl" className="mb-3 font-display text-3xl font-bold">Start a new set</h1>
        <ul className="grid gap-4 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <li key={t.title}>
              <button onClick={() => create(t.type)} className="flex h-full min-h-32 w-full flex-col items-start justify-between rounded-lg border border-border bg-card p-5 text-left transition-colors hover:bg-secondary">
                <t.icon className="size-7 text-primary" aria-hidden />
                <span><span className="block font-display text-lg font-semibold">{t.title}</span><span className="text-sm text-muted-foreground">{t.blurb}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <hr className="border-border" />

      <Tabs defaultValue="sets">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList aria-label="Home sections"><TabsTrigger value="sets">My sets</TabsTrigger><TabsTrigger value="progress">Progress</TabsTrigger></TabsList>
          <div className="flex flex-1 items-center justify-end gap-2 sm:max-w-md">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden />
              <Input type="search" aria-label="Search sets" placeholder="Search your sets" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Button variant="tonal" onClick={() => file.current?.click()}><FileUp />Import</Button>
            <Button variant="outline" disabled={!lib.sets.length} onClick={() => download('flashcards-library.fcw', serializeSets(lib.sets, lib.progress), 'application/json')} title="Export all sets as .fcw file"><Download />Export .fcw</Button>
            <input ref={file} type="file" multiple accept=".fcw,.json,.csv,.tsv,.txt" className="sr-only" tabIndex={-1} aria-label="Import flashcards file" onChange={(e) => void onImport(e.target.files)} />
          </div>
        </div>
        <p className="mt-2 min-h-5 text-sm" role="status">{msg}</p>

        <TabsContent value="sets">
          {sets.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="font-display text-xl font-semibold">{lib.sets.length ? 'No sets match that search.' : 'No sets yet.'}</p>
              <p className="mt-1 text-muted-foreground">Pick a template above, or import an .fcw, CSV or TSV file.</p>
              <Button className="mt-4" onClick={() => create('standard')}><Plus />New set</Button>
            </Card>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sets.map((s) => {
                const st = setStats(s, lib)
                const kinds = [...new Set(s.cards.map((c) => c.type))]
                return (
                  <li key={s.id}>
                    <Card className="flex h-full flex-col gap-3 p-5">
                      <div>
                        <h2 className="font-display text-xl font-semibold">{s.title}</h2>
                        <p className="text-sm text-muted-foreground">{s.cards.length} card{s.cards.length === 1 ? '' : 's'} · {st.due} due</p>
                      </div>
                      <div className="flex flex-wrap gap-1">{kinds.map((k) => <Badge key={k}>{TYPE_LABEL[k]}</Badge>)}</div>
                      <div><Progress value={st.mastery} label={`Mastery of ${s.title}`} /><p className="mt-1 text-xs text-muted-foreground">{Math.round(st.mastery * 100)}% mastered</p></div>
                      <div className="mt-auto flex flex-wrap gap-2">
                        <Button size="sm" disabled={!st.total} onClick={() => go(`/study/${s.id}`)}><Play />Study</Button>
                        <Button size="sm" variant="tonal" onClick={() => go(`/set/${s.id}`)}><Pencil />Edit</Button>
                        <Button size="sm" variant="outline" disabled={!st.total} onClick={() => go(`/duck/${s.id}`)}><Bird />Duck</Button>
                        <Button size="iconSm" variant="ghost" aria-label={`Delete ${s.title}`} onClick={() => { if (confirm(`Delete “${s.title}”?`)) actions.deleteSet(s.id) }}><Trash2 /></Button>
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[['Cards due', due], ['Day streak', streak(lib.history)], ['Reviews', reviewed], ['Accuracy', reviewed ? `${Math.round((correct / reviewed) * 100)}%` : '–']].map(([k, v]) => (
              <Card key={String(k)} className="p-4"><dt className="text-sm text-muted-foreground">{k}</dt><dd className="font-display text-3xl font-bold">{v}</dd></Card>
            ))}
          </dl>
          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold">Reviews, last 14 days</h2>
            <div className="mt-4 flex h-40 items-end gap-1.5" aria-hidden>
              {days.map((d) => (
                <div key={d.date} className="flex h-full flex-1 flex-col justify-end" title={`${d.date}: ${d.reviewed} reviewed, ${d.correct} correct`}>
                  <div className="rounded-t-sm bg-md-primary-container" style={{ height: `${(d.reviewed / maxDay) * 100}%` }}><div className="rounded-t-sm bg-primary" style={{ height: d.reviewed ? `${(d.correct / d.reviewed) * 100}%` : 0, minHeight: d.correct ? 3 : 0 }} /></div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Dark portion = answered correctly.</p>
            <table className="sr-only"><caption>Reviews per day</caption><thead><tr><th>Date</th><th>Reviewed</th><th>Correct</th></tr></thead><tbody>{days.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.reviewed}</td><td>{d.correct}</td></tr>)}</tbody></table>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-display text-lg font-semibold">Mastery by set</h2>
            {lib.sets.length === 0 ? <p className="text-muted-foreground">Nothing to show yet.</p> : (
              <ul className="space-y-4">{lib.sets.map((s, i) => (
                <li key={s.id}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{s.title}</span><span className="text-muted-foreground">{totals[i].seen}/{totals[i].total} seen · {totals[i].mastered} mastered</span></div><Progress value={totals[i].mastery} label={`Mastery of ${s.title}`} /></li>
              ))}</ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
