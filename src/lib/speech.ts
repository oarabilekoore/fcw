import type { Settings } from './types'

const Ctor = () => (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
export const browserSttSupported = () => !!Ctor()

/** Which speech-to-text path is usable right now. Firefox has no built-in recognizer, so a server (Whisper) is needed there. */
export function sttMode(s: Settings): 'browser' | 'server' | 'none' {
  if (s.sttMode === 'browser') return browserSttSupported() ? 'browser' : 'none'
  if (s.sttMode === 'server') return s.sttEndpoint ? 'server' : 'none'
  return browserSttSupported() ? 'browser' : s.sttEndpoint ? 'server' : 'none'
}

export interface Listening { result: Promise<string>; stop: () => void }

export function listen(s: Settings, onInterim?: (t: string) => void): Listening {
  const mode = sttMode(s)
  if (mode === 'browser') return listenBrowser(s, onInterim)
  if (mode === 'server') return listenServer(s)
  return { result: Promise.reject(new Error('No speech-to-text available. Add a Whisper server in Settings, or type your answer.')), stop() {} }
}

function listenBrowser(s: Settings, onInterim?: (t: string) => void): Listening {
  const rec = new (Ctor())()
  rec.lang = s.lang
  rec.interimResults = true
  rec.continuous = false
  let seen = ''
  const result = new Promise<string>((resolve, reject) => {
    rec.onresult = (e: any) => {
      let fin = '', int = ''
      for (const r of Array.from(e.results as ArrayLike<any>)) (r.isFinal ? (fin += r[0].transcript) : (int += r[0].transcript))
      seen = (fin + int).trim()
      onInterim?.(seen)
    }
    rec.onerror = (e: any) => (e.error === 'no-speech' || e.error === 'aborted' ? resolve(seen) : reject(new Error('Speech recognition error: ' + e.error)))
    rec.onend = () => resolve(seen)
    rec.start()
  })
  return { result, stop: () => rec.stop() }
}

/** Records the mic with simple silence detection, then POSTs to an OpenAI-style /v1/audio/transcriptions endpoint. */
function listenServer(s: Settings): Listening {
  let stopFn = () => {}
  let wantStop = false
  const result = (async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const rec = new MediaRecorder(stream)
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => chunks.push(e.data)
    const ctx = new AudioContext()
    const an = ctx.createAnalyser()
    ctx.createMediaStreamSource(stream).connect(an)
    const buf = new Uint8Array(an.fftSize)
    const t0 = performance.now()
    let spoke = false, quietSince = t0, stopped = false
    const done = new Promise<void>((res) => (rec.onstop = () => res()))
    const iv = window.setInterval(() => {
      an.getByteTimeDomainData(buf)
      let sum = 0
      for (const v of buf) { const d = (v - 128) / 128; sum += d * d }
      const now = performance.now()
      if (Math.sqrt(sum / buf.length) > 0.03) { spoke = true; quietSince = now }
      if ((spoke && now - quietSince > 1500) || now - t0 > 25000 || (!spoke && now - t0 > 8000)) stopFn()
    }, 100)
    stopFn = () => { if (!stopped) { stopped = true; clearInterval(iv); if (rec.state !== 'inactive') rec.stop() } }
    rec.start()
    if (wantStop) stopFn()
    await done
    stream.getTracks().forEach((t) => t.stop())
    void ctx.close()
    if (!spoke) return ''
    const fd = new FormData()
    fd.append('file', new Blob(chunks, { type: rec.mimeType || 'audio/webm' }), 'speech.webm')
    fd.append('model', s.sttModel)
    fd.append('language', s.lang.split('-')[0])
    const r = await fetch(`${s.sttEndpoint.replace(/\/$/, '')}/v1/audio/transcriptions`, { method: 'POST', body: fd })
    if (!r.ok) throw new Error(`Transcription server answered ${r.status}`)
    return String((await r.json()).text ?? '').trim()
  })()
  return { result, stop: () => { wantStop = true; stopFn() } }
}

/** Text-to-speech via the browser's built-in voices. Swap this for Piper/Kokoro if you want a different voice model. */
export function speak(text: string, s: Settings): Promise<void> {
  return new Promise((res) => {
    if (!('speechSynthesis' in window)) return res()
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = s.ttsRate
    u.lang = s.lang
    const v = speechSynthesis.getVoices().find((x) => x.voiceURI === s.ttsVoice)
    if (v) u.voice = v
    u.onend = () => res()
    u.onerror = () => res()
    speechSynthesis.speak(u)
  })
}
export const stopSpeaking = () => { if ('speechSynthesis' in window) speechSynthesis.cancel() }
