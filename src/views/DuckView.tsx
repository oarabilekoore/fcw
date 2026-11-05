import { useEffect, useRef, useState } from 'react'
import { Mic, PhoneCall, PhoneOff, Send } from 'lucide-react'
import { useLibrary, settingsStore } from '@/lib/store'
import { duckHint, duckSystemPrompt, llm, type Msg } from '@/lib/ai'
import { isStudyable } from '@/lib/model'
import { listen, speak, sttMode, stopSpeaking, type Listening } from '@/lib/speech'
import { shuffle } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/field'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlay'
import { DuckMascot, type DuckState } from '@/components/Duck'
import { go } from '@/App'

type Line = { role: 'user' | 'assistant'; content: string }

export function DuckView({ setId }: { setId?: string }) {
  const lib = useLibrary()
  const s = settingsStore.use()
  const sets = lib.sets.filter((x) => x.cards.some(isStudyable))
  const set = lib.sets.find((x) => x.id === setId) ?? sets[0]

  const [lines, setLines] = useState<Line[]>([])
  const [duck, setDuck] = useState<DuckState>('idle')
  const [input, setInput] = useState('')
  const [err, setErr] = useState('')
  const [speakReplies, setSpeakReplies] = useState(false)
  const [inCall, setInCall] = useState(false)
  const [interim, setInterim] = useState('')
  const hist = useRef<Msg[]>([])
  const deck = useRef<number>(0)
  const cards = useRef(shuffle((set?.cards ?? []).filter(isStudyable)))
  const call = useRef<{ active: boolean; h: Listening | null }>({ active: false, h: null })
  const log = useRef<HTMLDivElement>(null)

  // reset when the set changes
  useEffect(() => { endCall(); hist.current = []; setLines([]); deck.current = 0; cards.current = shuffle((set?.cards ?? []).filter(isStudyable)); setErr('') }, [set?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }) }, [lines])
  useEffect(() => () => { endCall() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** One round trip: add the student's words, get the duck's reply. */
  async function exchange(text: string, hidden = false): Promise<string> {
    const focus = cards.current[deck.current++ % Math.max(1, cards.current.length)]
    hist.current.push({ role: 'user', content: text })
    if (!hidden) setLines((l) => [...l, { role: 'user', content: text }])
    const msgs: Msg[] = [{ role: 'system', content: duckSystemPrompt(cards.current) }, ...hist.current.slice(0, -1), { role: 'user', content: text + (focus ? duckHint(focus) : '') }]
    const reply = await llm(msgs, s, { maxTokens: 160, temperature: 0.6 })
    hist.current.push({ role: 'assistant', content: reply })
    setLines((l) => [...l, { role: 'assistant', content: reply }])
    return reply
  }

  async function chatSend(text: string, hidden = false) {
    setErr(''); setDuck('thinking')
    try {
      const reply = await exchange(text, hidden)
      if (speakReplies) { setDuck('speaking'); await speak(reply, s) }
    } catch (e) { setErr(`${e instanceof Error ? e.message : e}. Check the model server in Settings.`) }
    setDuck('idle')
  }

  async function startCall() {
    call.current.active = true
    setInCall(true); setErr('')
    let text = 'Hi Quackers, I am ready to start.'
    let hidden = true
    let silent = 0
    try {
      while (call.current.active) {
        setDuck('thinking')
        const reply = await exchange(text, hidden)
        if (!call.current.active) break
        setDuck('speaking'); await speak(reply, s)
        if (!call.current.active) break
        setDuck('listening'); setInterim('')
        call.current.h = listen(s, setInterim)
        const heard = await call.current.h.result
        if (!call.current.active) break
        if (!heard) {
          if (++silent >= 3) { setErr('No one is talking, so I ended the call.'); break }
          text = '(The student stayed silent. Briefly repeat or give a small hint.)'; hidden = true
        } else { silent = 0; text = heard; hidden = false }
      }
    } catch (e) { setErr(`${e instanceof Error ? e.message : e}`) }
    endCall()
  }
  function endCall() {
    call.current.active = false
    call.current.h?.stop()
    stopSpeaking()
    setInCall(false); setDuck('idle'); setInterim('')
  }

  async function dictate() {
    setErr('')
    try { setDuck('listening'); const h = listen(s, setInput); const t = await h.result; if (t) setInput(t) } catch (e) { setErr(String(e instanceof Error ? e.message : e)) }
    setDuck('idle')
  }

  if (!set) return <div className="p-8">Make a set with at least one finished card first. <a className="underline" href="#/">Back home</a></div>
  const voiceOk = sttMode(s) !== 'none'

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-56 flex-1">
          <h1 className="font-display text-3xl font-bold">Rubber duck mode</h1>
          <p className="text-muted-foreground">Explain it to Quackers. The duck asks questions from your cards.</p>
        </div>
        <div className="w-60">
          <Label htmlFor="duck-set">Set</Label>
          <Select id="duck-set" value={set.id} onChange={(e) => go(`/duck/${e.target.value}`)}>{sets.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</Select>
        </div>
      </div>

      <div className="flex justify-center"><DuckMascot state={duck} className="h-44 w-44" /></div>
      <p role="status" className="text-center text-sm text-muted-foreground">{{ idle: 'Quackers is waiting.', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Quacking…' }[duck]}</p>
      {err && <p role="alert" className="rounded-2xl bg-md-error-container p-3 text-sm text-md-on-error-container">{err}</p>}

      <Tabs defaultValue="chat">
        <TabsList aria-label="Duck mode"><TabsTrigger value="chat">Chat</TabsTrigger><TabsTrigger value="call">Voice call</TabsTrigger></TabsList>

        <TabsContent value="chat" className="space-y-3">
          <Card className="p-0">
            <div ref={log} role="log" aria-label="Conversation with Quackers" className="max-h-96 min-h-48 space-y-3 overflow-y-auto p-4">
              {lines.length === 0 && <p className="text-muted-foreground">Say hello, or let the duck start.</p>}
              {lines.map((l, k) => (
                <p key={k} className={`max-w-[85%] rounded-2xl px-4 py-2 ${l.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'}`}><span className="sr-only">{l.role === 'user' ? 'You: ' : 'Quackers: '}</span>{l.content}</p>
              ))}
            </div>
          </Card>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = input.trim(); if (t && duck === 'idle') { setInput(''); void chatSend(t) } }}>
            <Input aria-label="Your message" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Explain it in your own words…" />
            <Button type="button" size="icon" variant="tonal" aria-label="Dictate" disabled={!voiceOk || duck !== 'idle'} onClick={() => void dictate()}><Mic /></Button>
            <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim() || duck !== 'idle'}><Send /></Button>
          </form>
          <div className="flex flex-wrap items-center gap-4">
            {lines.length === 0 && <Button variant="outline" disabled={duck !== 'idle'} onClick={() => void chatSend('Hi Quackers, I am ready to start.', true)}>Let the duck start</Button>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={speakReplies} onChange={(e) => setSpeakReplies(e.target.checked)} />Read replies aloud</label>
          </div>
        </TabsContent>

        <TabsContent value="call" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {!inCall
              ? <Button size="lg" disabled={!voiceOk} onClick={() => void startCall()}><PhoneCall />Start call</Button>
              : <Button size="lg" variant="destructive" onClick={endCall}><PhoneOff />End call</Button>}
            {!voiceOk && <p className="text-sm text-muted-foreground">Voice calls need speech recognition (Chrome/Edge/Safari) or a Whisper server in Settings.</p>}
          </div>
          {inCall && duck === 'listening' && <p className="rounded-2xl bg-muted p-3 text-sm" aria-live="polite">You: {interim || '…'}</p>}
          <Card className="p-0">
            <div role="log" aria-label="Call transcript" className="max-h-72 space-y-2 overflow-y-auto p-4 text-sm">
              {lines.length === 0 ? <p className="text-muted-foreground">The transcript appears here.</p> : lines.map((l, k) => <p key={k}><strong>{l.role === 'user' ? 'You' : 'Quackers'}:</strong> {l.content}</p>)}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
