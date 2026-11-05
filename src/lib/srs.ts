import type { Progress, Result } from './types'
const DAY = 86_400_000
const INTERVAL_DAYS = [0, 1, 2, 4, 8, 16]

/** Leitner boxes: correct moves up, partial stays, incorrect resets to box 0. */
export function nextProgress(p: Progress | undefined, r: Result, now = Date.now()): Progress {
  const prev = p ?? { box: 0, due: 0, seen: 0, correct: 0, last: 0 }
  const box = r === 'correct' ? Math.min(5, prev.box + 1) : r === 'partial' ? prev.box : 0
  return { box, due: now + INTERVAL_DAYS[box] * DAY, seen: prev.seen + 1, correct: prev.correct + (r === 'correct' ? 1 : r === 'partial' ? 0.5 : 0), last: now }
}
export const isDue = (p: Progress | undefined, now = Date.now()) => !p || p.due <= now
