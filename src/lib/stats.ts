import type { CardSet, HistoryEntry, Library } from './types'
import { isDue } from './srs'
import { isStudyable } from './model'

const pad = (n: number) => String(n).padStart(2, '0')
export const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

export function setStats(set: CardSet, lib: Library) {
  const cards = set.cards.filter(isStudyable)
  const prog = cards.map((c) => lib.progress[c.id])
  const seen = prog.filter(Boolean).length
  return {
    total: cards.length, seen,
    mastered: prog.filter((p) => p && p.box >= 4).length,
    due: cards.filter((c) => isDue(lib.progress[c.id])).length,
    mastery: cards.length ? prog.reduce((a, p) => a + (p ? p.box / 5 : 0), 0) / cards.length : 0,
  }
}

export function lastDays(h: HistoryEntry[], n = 14) {
  const out: { date: string; reviewed: number; correct: number }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const date = dayKey(Date.now() - i * 86_400_000)
    const rows = h.filter((e) => e.date === date)
    out.push({ date, reviewed: rows.reduce((a, e) => a + e.reviewed, 0), correct: rows.reduce((a, e) => a + e.correct, 0) })
  }
  return out
}
export function streak(h: HistoryEntry[]) {
  const days = lastDays(h, 365).reverse()
  let i = days[0].reviewed > 0 ? 0 : 1 // today not studied yet doesn't break the streak
  let n = 0
  while (i < days.length && days[i].reviewed > 0) { n++; i++ }
  return n
}
