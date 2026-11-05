import { useEffect, useState } from 'react'
import { settingsStore } from '@/lib/store'
import { llm } from '@/lib/ai'
import { browserSttSupported } from '@/lib/speech'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/field'
import { Card } from '@/components/ui/card'

export function SettingsView() {
  const s = settingsStore.use()
  const [test, setTest] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    const f = () => setVoices(speechSynthesis.getVoices())
    f(); speechSynthesis.addEventListener?.('voiceschanged', f)
    return () => speechSynthesis.removeEventListener?.('voiceschanged', f)
  }, [])
  const set = settingsStore.set
  async function runTest() {
    setTest('Testing…')
    try { setTest('Connected. The model replied: ' + (await llm([{ role: 'user', content: 'Reply with the single word: quack' }], s, { maxTokens: 10 }))) }
    catch (e) { setTest(`Could not connect: ${e instanceof Error ? e.message : e}. Is the server running and allowing this origin (Ollama: OLLAMA_ORIGINS)?`) }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <Card className="space-y-4 p-5">
        <h2 className="font-display text-xl font-semibold">Language model (grading and rubber duck)</h2>
        <p className="text-sm text-muted-foreground">Any OpenAI-compatible server. Defaults to Ollama running a small Gemma (<code>ollama pull gemma3:1b</code>).</p>
        <div><Label htmlFor="ep">Server address</Label><Input id="ep" value={s.llmEndpoint} onChange={(e) => set({ llmEndpoint: e.target.value })} /></div>
        <div><Label htmlFor="md">Model name</Label><Input id="md" value={s.llmModel} onChange={(e) => set({ llmModel: e.target.value })} /></div>
        <div><Label htmlFor="ky">API key (optional)</Label><Input id="ky" type="password" autoComplete="off" value={s.llmKey} onChange={(e) => set({ llmKey: e.target.value })} /></div>
        <div className="flex items-center gap-3"><Button variant="tonal" onClick={() => void runTest()}>Test connection</Button><p role="status" className="text-sm">{test}</p></div>
      </Card>
      <Card className="space-y-4 p-5">
        <h2 className="font-display text-xl font-semibold">Voice</h2>
        <p className="text-sm text-muted-foreground">Speech recognition in this browser: {browserSttSupported() ? 'available' : 'not available (use a Whisper server below)'}.</p>
        <div><Label htmlFor="sm">Speech-to-text source</Label>
          <Select id="sm" value={s.sttMode} onChange={(e) => set({ sttMode: e.target.value as typeof s.sttMode })}>
            <option value="auto">Automatic</option><option value="browser">Browser recognition</option><option value="server">Whisper server</option>
          </Select></div>
        <div><Label htmlFor="se">Whisper server address (OpenAI-style /v1/audio/transcriptions)</Label><Input id="se" placeholder="http://localhost:8000" value={s.sttEndpoint} onChange={(e) => set({ sttEndpoint: e.target.value })} /></div>
        <div><Label htmlFor="sn">Whisper model name</Label><Input id="sn" value={s.sttModel} onChange={(e) => set({ sttModel: e.target.value })} /></div>
        <div><Label htmlFor="lg">Spoken language</Label><Input id="lg" value={s.lang} onChange={(e) => set({ lang: e.target.value })} placeholder="en-US" /></div>
        <div><Label htmlFor="tv">Duck voice</Label>
          <Select id="tv" value={s.ttsVoice} onChange={(e) => set({ ttsVoice: e.target.value })}>
            <option value="">System default</option>{voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
          </Select></div>
        <div><Label htmlFor="tr">Speaking speed: {s.ttsRate.toFixed(1)}×</Label><input id="tr" type="range" min={0.6} max={1.6} step={0.1} value={s.ttsRate} onChange={(e) => set({ ttsRate: Number(e.target.value) })} className="w-full accent-primary" /></div>
        <Button variant="outline" onClick={() => { const u = new SpeechSynthesisUtterance('Quack! Ready when you are.'); u.rate = s.ttsRate; u.lang = s.lang; const v = voices.find((x) => x.voiceURI === s.ttsVoice); if (v) u.voice = v; speechSynthesis.cancel(); speechSynthesis.speak(u) }}>Play sample</Button>
      </Card>
    </div>
  )
}
