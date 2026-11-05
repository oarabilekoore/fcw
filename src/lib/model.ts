// Pure helpers shared by the browser app, the Bun server and the MCP server (no DOM APIs).
import type { Card, CardSet, CardType, Face, FlowStep } from './types'

export const uid = (): string =>
  globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)

export const TYPE_LABEL: Record<CardType, string> = {
  standard: 'Fact given',
  'multiple-choice': 'Multiple choice',
  'true-false': 'True or false',
  'fill-blank': 'Fill in the blank',
  flowchart: 'Flow chart',
}
export const CARD_TYPES = Object.keys(TYPE_LABEL) as CardType[]

export const emptyFace = (): Face => ({ mode: 'blocks', blocks: [{ id: uid(), kind: 'text', text: '' }], strokes: [], alt: '' })
export const textFace = (text: string): Face => ({ ...emptyFace(), blocks: [{ id: uid(), kind: 'text', text }] })

export function newCard(type: CardType = 'standard'): Card {
  const c: Card = { id: uid(), type, front: emptyFace(), back: emptyFace(), choices: [], correct: [], answerBool: true, blankText: '', steps: [] }
  if (type === 'multiple-choice') c.choices = [0, 1, 2, 3].map(() => ({ id: uid(), text: '' }))
  if (type === 'flowchart') c.steps = [0, 1, 2].map((): FlowStep => ({ id: uid(), label: '', shape: 'process' }))
  return c
}

export function newSet(title: string, type: CardType = 'standard'): CardSet {
  const now = Date.now()
  return { id: uid(), title, description: '', cards: [newCard(type)], createdAt: now, updatedAt: now }
}

export interface CardInput {
  type?: CardType; front: string; back?: string
  choices?: string[]; correct?: number[]; answer?: boolean; blanks?: string
  steps?: { label: string; shape?: FlowStep['shape'] }[]
}
export function cardFromInput(i: CardInput): Card {
  const c = newCard(i.type ?? 'standard')
  c.front = textFace(i.front)
  c.back = textFace(i.back ?? '')
  if (i.choices) {
    c.choices = i.choices.map((text) => ({ id: uid(), text }))
    c.correct = (i.correct ?? []).map((n) => c.choices[n]?.id).filter(Boolean) as string[]
  }
  if (i.answer !== undefined) c.answerBool = i.answer
  if (i.blanks) c.blankText = i.blanks
  if (i.steps) c.steps = i.steps.map((s) => ({ id: uid(), label: s.label, shape: s.shape ?? 'process' }))
  return c
}

/** Fill any missing fields so files from older versions / other tools still load. */
export function normalizeCard(raw: any): Card {
  const base = newCard(raw?.type in TYPE_LABEL ? raw.type : 'standard')
  const face = (f: any): Face => ({ ...emptyFace(), ...(f ?? {}) })
  return { ...base, ...raw, front: face(raw?.front), back: face(raw?.back) }
}
export function normalizeSet(raw: any): CardSet {
  const now = Date.now()
  return {
    id: raw?.id ?? uid(), title: String(raw?.title ?? 'Untitled set'), description: String(raw?.description ?? ''),
    cards: Array.isArray(raw?.cards) ? raw.cards.map(normalizeCard) : [],
    createdAt: raw?.createdAt ?? now, updatedAt: raw?.updatedAt ?? now,
  }
}

export function faceToText(f: Face): string {
  if (f.mode === 'canvas') return f.alt ? `[handwritten: ${f.alt}]` : '[handwritten note]'
  return f.blocks
    .map((b) => (b.kind === 'text' ? b.text : b.alt ? `[image: ${b.alt}]` : '[image]'))
    .filter((s) => s.trim())
    .join('\n')
}
export const faceHasContent = (f: Face) => (f.mode === 'canvas' ? f.strokes.length > 0 : f.blocks.some((b) => b.kind === 'image' || b.text.trim()))

export type Seg = string | { answers: string[] }
export function parseBlanks(t: string): Seg[] {
  const out: Seg[] = []
  let last = 0
  const re = /\{\{(.+?)\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) {
    if (m.index > last) out.push(t.slice(last, m.index))
    out.push({ answers: m[1].split('|').map((s) => s.trim()).filter(Boolean) })
    last = m.index + m[0].length
  }
  if (last < t.length) out.push(t.slice(last))
  return out
}

/** A card can only be studied once it has enough content. */
export function isStudyable(c: Card): boolean {
  if (!faceHasContent(c.front) && c.type !== 'fill-blank') return false
  if (c.type === 'multiple-choice') return c.choices.filter((x) => x.text.trim()).length >= 2 && c.correct.length > 0
  if (c.type === 'fill-blank') return parseBlanks(c.blankText).some((s) => typeof s !== 'string')
  if (c.type === 'flowchart') return c.steps.filter((s) => s.label.trim()).length >= 2
  if (c.type === 'standard') return faceHasContent(c.back)
  return true
}

/** The expected answer as plain text (used for grading). */
export function expectedAnswerText(c: Card): string {
  switch (c.type) {
    case 'multiple-choice': return c.choices.filter((x) => c.correct.includes(x.id)).map((x) => x.text).join('; ')
    case 'true-false': return c.answerBool ? 'True' : 'False'
    case 'fill-blank': return parseBlanks(c.blankText).filter((s) => typeof s !== 'string').map((s) => (s as { answers: string[] }).answers[0]).join('; ')
    case 'flowchart': return c.steps.map((s, i) => `${i + 1}. ${s.label}`).join(' ')
    default: return faceToText(c.back)
  }
}

/** Compact text description of a card, used as LLM reference material. */
export function cardReference(c: Card): string {
  const lines = [`Type: ${TYPE_LABEL[c.type]}`, `Question: ${faceToText(c.front) || '(see blanks)'}`]
  if (c.type === 'multiple-choice') lines.push(`Choices: ${c.choices.map((x) => x.text).join(' | ')}`)
  if (c.type === 'fill-blank') lines.push(`Sentence: ${c.blankText}`)
  lines.push(`Correct answer: ${expectedAnswerText(c)}`)
  const extra = faceToText(c.back)
  if (extra && c.type !== 'standard') lines.push(`Explanation: ${extra}`)
  return lines.join('\n')
}
