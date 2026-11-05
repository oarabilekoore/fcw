import { useSyncExternalStore } from 'react'
import type { Card, CardSet, Library, Result, Settings } from './types'
import { normalizeSet, uid } from './model'
import { nextProgress } from './srs'
import { dayKey } from './stats'

/* ---------- small persisted store (localStorage) ---------- */
export function persisted<T extends object>(key: string, init: T) {
  let value: T = init
  try { value = { ...init, ...JSON.parse(localStorage.getItem(key) || '{}') } } catch { /* ignore */ }
  const subs = new Set<() => void>()
  return {
    get: () => value,
    set(patch: Partial<T>) {
      value = { ...value, ...patch }
      try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
      subs.forEach((f) => f())
    },
    use: () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => value),
  }
}

export const settingsStore = persisted<Settings>('fcw.settings', {
  llmEndpoint: 'http://localhost:11434', llmModel: 'gemma3:1b', llmKey: '',
  sttMode: 'auto', sttEndpoint: '', sttModel: 'whisper-1', lang: 'en-US', ttsRate: 1, ttsVoice: '',
})

/* ---------- library ---------- */
const KEY = 'fcw.library'
const empty = (): Library => ({ version: 1, sets: [], progress: {}, history: [] })
function loadLocal(): Library {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (d && Array.isArray(d.sets)) return { ...empty(), ...d, sets: d.sets.map(normalizeSet) }
  } catch { /* ignore */ }
  return empty()
}

let state: Library = loadLocal()
let rev = 0, dirty = false, serverOn = false, timer: number | undefined
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
export const useLibrary = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => state)
export const getLibrary = () => state

function commit(next: Library) {
  state = next
  dirty = true
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch (e) { console.warn('Local save failed (storage full?)', e) }
  emit()
  if (serverOn) { clearTimeout(timer); timer = window.setTimeout(push, 500) }
}

async function push() {
  try {
    const r = await fetch('/api/library', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: state }) })
    if (r.ok) { rev = (await r.json()).rev; dirty = false }
  } catch { /* offline: keep local copy */ }
}

async function pull() {
  try {
    const r = await fetch('/api/library')
    const j = await r.json()
    if (typeof j?.rev !== 'number') return
    serverOn = true
    if (j.data === null) { if (state.sets.length) await push(); return }
    if (j.rev !== rev && !dirty) {
      rev = j.rev
      state = { ...empty(), ...j.data, sets: j.data.sets.map(normalizeSet) }
      try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
      emit()
    }
  } catch { /* no server API (static hosting) — localStorage only */ }
}
export function startSync() { void pull(); window.setInterval(() => void pull(), 4000) }

const touch = (s: CardSet): CardSet => ({ ...s, updatedAt: Date.now() })
const mapSet = (id: string, fn: (s: CardSet) => CardSet) => commit({ ...state, sets: state.sets.map((s) => (s.id === id ? touch(fn(s)) : s)) })

export const actions = {
  addSet: (s: CardSet) => commit({ ...state, sets: [s, ...state.sets] }),
  importSets: (sets: CardSet[]) => commit({ ...state, sets: [...sets, ...state.sets] }),
  updateSet: (id: string, patch: Partial<CardSet>) => mapSet(id, (s) => ({ ...s, ...patch })),
  deleteSet: (id: string) => commit({ ...state, sets: state.sets.filter((s) => s.id !== id) }),
  addCard: (id: string, card: Card, at?: number) =>
    mapSet(id, (s) => { const c = [...s.cards]; c.splice(at ?? c.length, 0, card); return { ...s, cards: c } }),
  updateCard: (id: string, card: Card) => mapSet(id, (s) => ({ ...s, cards: s.cards.map((c) => (c.id === card.id ? card : c)) })),
  deleteCard: (id: string, cardId: string) => mapSet(id, (s) => ({ ...s, cards: s.cards.filter((c) => c.id !== cardId) })),
  moveCard: (id: string, from: number, to: number) =>
    mapSet(id, (s) => { const c = [...s.cards]; const [x] = c.splice(from, 1); c.splice(to, 0, x); return { ...s, cards: c } }),
  duplicateCard: (id: string, card: Card, at: number) =>
    actions.addCard(id, { ...structuredClone(card), id: uid(), choices: card.choices.map((x) => ({ ...x })) }, at + 1),
  recordReview(setId: string, cardId: string, r: Result) {
    const date = dayKey()
    const history = [...state.history]
    const i = history.findIndex((h) => h.date === date && h.setId === setId)
    const h = i >= 0 ? history[i] : { date, setId, reviewed: 0, correct: 0 }
    const upd = { ...h, reviewed: h.reviewed + 1, correct: h.correct + (r === 'correct' ? 1 : 0) }
    if (i >= 0) history[i] = upd; else history.push(upd)
    commit({ ...state, progress: { ...state.progress, [cardId]: nextProgress(state.progress[cardId], r) }, history })
  },
}
