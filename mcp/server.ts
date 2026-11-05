// Flashcard Wizard MCP server (stdio). Edits the same library file the web app syncs with.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { LIB_PATH, readLib, writeLib } from '../server/store'
import { CARD_TYPES, cardFromInput, expectedAnswerText, faceToText, newSet, normalizeSet, textFace, uid } from '../src/lib/model'
import { nextProgress } from '../src/lib/srs'
import { dayKey, setStats } from '../src/lib/stats'
import { serializeSets, parseImport } from '../src/lib/fcw'
import type { Library, Result } from '../src/lib/types'

const load = (): Library => {
  const d = readLib().data
  return d && Array.isArray(d.sets) ? d : { version: 1, sets: [], progress: {}, history: [] }
}
const save = (l: Library) => writeLib(l)
const ok = (v: unknown) => ({ content: [{ type: 'text' as const, text: typeof v === 'string' ? v : JSON.stringify(v, null, 2) }] })
const fail = (m: string) => ({ isError: true, content: [{ type: 'text' as const, text: m }] })

const CardIn = z.object({
  type: z.enum(CARD_TYPES as [string, ...string[]]).default('standard').describe('standard | multiple-choice | true-false | fill-blank | flowchart'),
  front: z.string().describe('Question or prompt. Supports $LaTeX$ and **bold**.'),
  back: z.string().optional().describe('Answer (standard cards) or explanation (other types)'),
  choices: z.array(z.string()).optional().describe('multiple-choice options'),
  correct: z.array(z.number().int()).optional().describe('multiple-choice: zero-based indexes of the correct options'),
  answer: z.boolean().optional().describe('true-false: the correct answer'),
  blanks: z.string().optional().describe('fill-blank: sentence with {{answer}} or {{answer|alternative}} markers'),
  steps: z.array(z.object({ label: z.string(), shape: z.enum(['process', 'decision', 'terminal']).optional() })).optional().describe('flowchart: steps in the CORRECT order'),
})

const server = new McpServer({ name: 'flashcard-wizard', version: '0.1.0' })

server.tool('list_sets', 'List all flashcard sets with card counts and study stats', {}, async () => {
  const lib = load()
  return ok(lib.sets.map((s) => ({ id: s.id, title: s.title, description: s.description, cards: s.cards.length, ...setStats(s, lib) })))
})

server.tool('get_set', 'Get one set with every card (answers included)', { setId: z.string() }, async ({ setId }) => {
  const s = load().sets.find((x) => x.id === setId)
  if (!s) return fail('No such set')
  return ok({ ...s, cards: s.cards.map((c) => ({ id: c.id, type: c.type, question: faceToText(c.front), answer: expectedAnswerText(c), explanation: faceToText(c.back), raw: c })) })
})

server.tool('create_set', 'Create a set, optionally with cards of mixed types', { title: z.string(), description: z.string().optional(), cards: z.array(CardIn).optional() }, async ({ title, description, cards }) => {
  const lib = load()
  const set = newSet(title)
  set.description = description ?? ''
  set.cards = (cards ?? []).map((c) => cardFromInput(c as any))
  lib.sets.push(set)
  save(lib)
  return ok({ id: set.id, cards: set.cards.length })
})

server.tool('delete_set', 'Delete a set', { setId: z.string() }, async ({ setId }) => {
  const lib = load()
  lib.sets = lib.sets.filter((s) => s.id !== setId)
  save(lib)
  return ok('deleted')
})

server.tool('add_cards', 'Append one or more cards to a set', { setId: z.string(), cards: z.array(CardIn).min(1) }, async ({ setId, cards }) => {
  const lib = load()
  const s = lib.sets.find((x) => x.id === setId)
  if (!s) return fail('No such set')
  const made = cards.map((c) => cardFromInput(c as any))
  s.cards.push(...made)
  s.updatedAt = Date.now()
  save(lib)
  return ok({ added: made.map((c) => c.id) })
})

server.tool('update_card', 'Replace a card’s content (same fields as add_cards)', { setId: z.string(), cardId: z.string(), card: CardIn }, async ({ setId, cardId, card }) => {
  const lib = load()
  const s = lib.sets.find((x) => x.id === setId)
  const i = s?.cards.findIndex((c) => c.id === cardId) ?? -1
  if (!s || i < 0) return fail('No such card')
  s.cards[i] = { ...cardFromInput(card as any), id: cardId }
  s.updatedAt = Date.now()
  save(lib)
  return ok('updated')
})

server.tool('delete_card', 'Remove a card from a set', { setId: z.string(), cardId: z.string() }, async ({ setId, cardId }) => {
  const lib = load()
  const s = lib.sets.find((x) => x.id === setId)
  if (!s) return fail('No such set')
  s.cards = s.cards.filter((c) => c.id !== cardId)
  save(lib)
  return ok('deleted')
})

server.tool('get_progress', 'Learning progress: per-set mastery and per-card boxes', { setId: z.string().optional() }, async ({ setId }) => {
  const lib = load()
  const sets = lib.sets.filter((s) => !setId || s.id === setId)
  return ok(sets.map((s) => ({ id: s.id, title: s.title, ...setStats(s, lib), cards: s.cards.map((c) => ({ id: c.id, question: faceToText(c.front).slice(0, 80), progress: lib.progress[c.id] ?? null })) })))
})

server.tool('record_review', 'Record the result of reviewing a card (updates spaced-repetition state)', { setId: z.string(), cardId: z.string(), result: z.enum(['correct', 'partial', 'incorrect']) }, async ({ setId, cardId, result }) => {
  const lib = load()
  lib.progress[cardId] = nextProgress(lib.progress[cardId], result as Result)
  const date = dayKey()
  let h = lib.history.find((e) => e.date === date && e.setId === setId)
  if (!h) lib.history.push((h = { date, setId, reviewed: 0, correct: 0 }))
  h.reviewed++
  if (result === 'correct') h.correct++
  save(lib)
  return ok(lib.progress[cardId])
})

server.tool('export_fcw', 'Export sets as .fcw (Flashcard Wizard file) JSON text', { setIds: z.array(z.string()).optional() }, async ({ setIds }) => {
  const sets = load().sets.filter((s) => !setIds || setIds.includes(s.id))
  return ok(serializeSets(sets))
})

server.tool('import_fcw', 'Import .fcw JSON text, or CSV/TSV (front,back per line)', { content: z.string(), filename: z.string().default('import.fcw') }, async ({ content, filename }) => {
  try {
    const lib = load()
    const sets = parseImport(filename, content)
    lib.sets.push(...sets)
    save(lib)
    return ok({ imported: sets.map((s) => ({ id: s.id, title: s.title, cards: s.cards.length })) })
  } catch (e) {
    return fail(String(e))
  }
})

await server.connect(new StdioServerTransport())
console.error(`flashcard-wizard MCP ready — library: ${LIB_PATH}`)
void uid; void textFace; void normalizeSet
