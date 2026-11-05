import type { Card, Result, Settings } from './types'
import { cardReference, expectedAnswerText, faceToText } from './model'

export type Msg = { role: 'system' | 'user' | 'assistant'; content: string }

/** Any OpenAI-compatible server works (Ollama, LM Studio, llama.cpp, vLLM…). Default: Ollama + a small Gemma. */
export async function llm(messages: Msg[], s: Settings, opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {}): Promise<string> {
  const r = await fetch(`${s.llmEndpoint.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(s.llmKey ? { authorization: `Bearer ${s.llmKey}` } : {}) },
    body: JSON.stringify({ model: s.llmModel, messages, stream: false, temperature: opts.temperature ?? 0.3, max_tokens: opts.maxTokens ?? 300 }),
    signal: opts.signal,
  })
  if (!r.ok) throw new Error(`Model server answered ${r.status}`)
  const j = await r.json()
  return String(j.choices?.[0]?.message?.content ?? '').trim()
}

const tokens = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2)

/** Offline fallback: how much of the expected answer's vocabulary appears in the spoken answer. */
function lexicalGrade(card: Card, said: string): { verdict: Result; feedback: string } {
  const exp = expectedAnswerText(card)
  if (card.type === 'true-false') {
    const w = said.toLowerCase()
    const t = /\b(true|yes|correct)\b/.test(w), f = /\b(false|no|incorrect|wrong)\b/.test(w)
    if (t === f) return { verdict: 'incorrect', feedback: 'I could not tell whether you said true or false.' }
    return t === card.answerBool ? { verdict: 'correct', feedback: 'That matches the card.' } : { verdict: 'incorrect', feedback: `The card says ${exp}.` }
  }
  const want = new Set(tokens(exp)), have = new Set(tokens(said))
  if (!want.size) return { verdict: 'incorrect', feedback: 'This card has no answer text to compare with.' }
  const hit = [...want].filter((w) => have.has(w)).length / want.size
  return hit >= 0.8 ? { verdict: 'correct', feedback: 'Your answer covers the key terms.' }
    : hit >= 0.4 ? { verdict: 'partial', feedback: `Close. The card says: ${exp}` }
    : { verdict: 'incorrect', feedback: `The card says: ${exp}` }
}

export async function evaluateAnswer(card: Card, said: string, s: Settings): Promise<{ verdict: Result; feedback: string; source: 'model' | 'fallback' }> {
  try {
    const out = await llm([
      { role: 'system', content:
        'You grade a student\'s spoken answer to a flashcard. Compare it with the reference answer. Accept paraphrases and ignore speech-to-text slips such as homophones. ' +
        'Mark "partial" if some but not all required parts are right. Never mark correct if it contradicts the reference. ' +
        'Reply with ONLY JSON: {"verdict":"correct"|"partial"|"incorrect","feedback":"one short sentence addressed to the student"}' },
      { role: 'user', content: `Flashcard:\n${cardReference(card)}\n\nStudent's spoken answer: "${said}"` },
    ], s, { maxTokens: 120, temperature: 0 })
    const m = out.match(/\{[\s\S]*\}/)
    if (m) {
      const j = JSON.parse(m[0])
      if (['correct', 'partial', 'incorrect'].includes(j.verdict)) return { verdict: j.verdict, feedback: String(j.feedback ?? ''), source: 'model' }
    }
  } catch { /* fall through */ }
  return { ...lexicalGrade(card, said), source: 'fallback' }
}

export function duckSystemPrompt(cards: Card[]): string {
  const ref = cards.map((c, i) => `#${i + 1}\n${cardReference(c)}`).join('\n\n').slice(0, 9000)
  return (
    'You are Quackers, a friendly rubber duck. The student learns by explaining things to you. Use ONLY the reference flashcards below as your source of truth.\n' +
    'Each turn: react to the student in at most two short sentences (say kindly whether they were right, fill any gap from the reference), then ask ONE new question. ' +
    'If they are stuck, give a hint, not the answer. If they ask you something, answer briefly from the reference, then continue. ' +
    'Your words are read aloud: plain sentences only, no markdown, no lists, no emojis.\n\nREFERENCE FLASHCARDS:\n' + ref
  )
}
export const duckHint = (c: Card) => `\n\n(Note to duck, not from the student: if you are moving on, ask about this card next.)\n${cardReference(c)}`
void faceToText
