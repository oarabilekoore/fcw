// The native ".fcw" (Flashcard Wizard) file format: JSON with a format marker, images embedded as data URLs.
import type { CardSet } from './types'
import { cardFromInput, normalizeSet, uid } from './model'

export const FCW_EXT = '.fcw'
export const FCW_FORMAT = 'flashcard-wizard'

export const serializeSets = (sets: CardSet[]) =>
  JSON.stringify({ format: FCW_FORMAT, version: 1, exportedAt: new Date().toISOString(), sets })

function splitRow(line: string, d: string): string[] {
  const out: string[] = []
  let cur = '', q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++ } else q = !q }
    else if (ch === d && !q) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function tableToSet(name: string, text: string): CardSet {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const d = lines[0]?.includes('\t') ? '\t' : ','
  const now = Date.now()
  const cards = lines.map((l) => splitRow(l, d)).filter((r) => r[0] && r[1]).map((r) => cardFromInput({ front: r[0], back: r[1] }))
  return { id: uid(), title: name.replace(/\.[^.]+$/, ''), description: 'Imported from ' + name, cards, createdAt: now, updatedAt: now }
}

export function parseImport(name: string, text: string): CardSet[] {
  const ext = name.toLowerCase().split('.').pop()
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') return [tableToSet(name, text)]
  const j = JSON.parse(text)
  if (!Array.isArray(j?.sets)) throw new Error('This file is not a Flashcard Wizard (.fcw) export.')
  return j.sets.map((raw: unknown) => {
    const s = normalizeSet(raw)
    return { ...s, id: uid(), cards: s.cards.map((c) => ({ ...c, id: uid() })) } // fresh ids avoid clashing with existing sets
  })
}

export function download(name: string, data: BlobPart, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
