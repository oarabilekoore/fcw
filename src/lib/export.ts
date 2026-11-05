import type { Card, CardSet, Face } from './types'
import { expectedAnswerText, faceToText, parseBlanks } from './model'
import { download } from './fcw'

type Item = { t: 'text'; v: string } | { t: 'img'; v: string; w: number; h: number }

const PRINT_INK: Record<string, string> = { 'on-surface': '#1a110f', primary: '#8f4c38', tertiary: '#6c5d2f', error: '#ba1a1a' }

function imgSize(src: string): Promise<{ w: number; h: number }> {
  return new Promise((res) => { const i = new Image(); i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => res({ w: 4, h: 3 }); i.src = src })
}

export function strokesToDataUrl(face: Face): string {
  const c = document.createElement('canvas')
  c.width = 800; c.height = 450
  const x = c.getContext('2d')!
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 800, 450)
  x.lineCap = 'round'; x.lineJoin = 'round'
  for (const s of face.strokes) {
    x.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over'
    x.strokeStyle = PRINT_INK[s.color] ?? '#1a110f'; x.fillStyle = x.strokeStyle; x.lineWidth = s.size
    x.beginPath()
    if (s.pts.length === 2) x.arc(s.pts[0], s.pts[1], s.size / 2, 0, Math.PI * 2), x.fill()
    else { x.moveTo(s.pts[0], s.pts[1]); for (let i = 2; i < s.pts.length; i += 2) x.lineTo(s.pts[i], s.pts[i + 1]); x.stroke() }
  }
  return c.toDataURL('image/png')
}

async function faceItems(f: Face): Promise<Item[]> {
  if (f.mode === 'canvas') return f.strokes.length ? [{ t: 'img', v: strokesToDataUrl(f), w: 800, h: 450 }] : []
  const out: Item[] = []
  for (const b of f.blocks) {
    if (b.kind === 'text') { if (b.text.trim()) out.push({ t: 'text', v: b.text }) }
    else { const { w, h } = await imgSize(b.src); out.push({ t: 'img', v: b.src, w, h }) }
  }
  return out
}

async function sections(c: Card): Promise<{ q: Item[]; a: Item[] }> {
  const q = await faceItems(c.front)
  const a: Item[] = []
  const T = (v: string): Item => ({ t: 'text', v })
  if (c.type === 'multiple-choice') {
    q.push(T(c.choices.filter((x) => x.text.trim()).map((x, i) => `${String.fromCharCode(65 + i)}. ${x.text}`).join('\n')))
    a.push(T('Correct: ' + expectedAnswerText(c)))
  } else if (c.type === 'true-false') { q.push(T('True or false?')); a.push(T(expectedAnswerText(c))) }
  else if (c.type === 'fill-blank') {
    q.push(T(parseBlanks(c.blankText).map((s) => (typeof s === 'string' ? s : '________')).join('')))
    a.push(T(parseBlanks(c.blankText).map((s) => (typeof s === 'string' ? s : `[${s.answers[0]}]`)).join('')))
  } else if (c.type === 'flowchart') {
    const steps = c.steps.filter((s) => s.label.trim())
    q.push(T('Put these steps in the correct order:\n' + [...steps.slice(1), ...steps.slice(0, 1)].map((s) => '• ' + s.label).join('\n')))
    a.push(T(steps.map((s, i) => `${i + 1}. ${s.label}`).join('\n')))
  }
  a.push(...(await faceItems(c.back)))
  return { q, a }
}

export async function exportPdf(set: CardSet) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = 297, H = 210, M = 16
  doc.setFont('helvetica', 'bold').setFontSize(28).text(set.title, M, 40, { maxWidth: W - 2 * M })
  doc.setFont('helvetica', 'normal').setFontSize(13).text(`${set.cards.length} cards · made with Flashcard Wizard`, M, 54)
  let n = 0
  for (const card of set.cards) {
    const { q, a } = await sections(card)
    if (!q.length && !a.length) continue
    n++
    doc.addPage()
    let y = M + 4
    const put = (items: Item[]) => {
      for (const it of items) {
        if (it.t === 'text') {
          const lines = doc.splitTextToSize(it.v, W - 2 * M) as string[]
          for (const l of lines) { if (y > H - M) { doc.addPage(); y = M + 4 } doc.text(l, M, y); y += 6.5 }
          y += 2
        } else {
          const w = Math.min(110, ((H - M - y) * it.w) / it.h), h = (w * it.h) / it.w
          if (h < 20) { doc.addPage(); y = M + 4 }
          const w2 = Math.min(110, ((H - M - y) * it.w) / it.h), h2 = (w2 * it.h) / it.w
          doc.addImage(it.v, 'PNG', M, y, w2, h2); y += h2 + 4
        }
      }
    }
    doc.setFont('helvetica', 'italic').setFontSize(10).text(`Card ${n} · ${card.type}`, M, y - 2); y += 6
    doc.setFont('helvetica', 'bold').setFontSize(16); put(q)
    doc.setDrawColor(160).line(M, y, W - M, y); y += 8
    doc.setFont('helvetica', 'normal').setFontSize(14); put(a)
  }
  doc.save(`${set.title || 'flashcards'}.pdf`)
}

export async function exportPptx(set: CardSet) {
  const PptxGenJS = (await import('pptxgenjs')).default
  const p = new PptxGenJS()
  p.layout = 'LAYOUT_16x9'
  const title = p.addSlide()
  title.addText(set.title, { x: 0.6, y: 1.8, w: 8.8, h: 1.2, fontSize: 36, bold: true })
  title.addText(`${set.cards.length} cards · Flashcard Wizard`, { x: 0.6, y: 3, w: 8.8, h: 0.5, fontSize: 16 })
  let n = 0
  for (const card of set.cards) {
    const { q, a } = await sections(card)
    if (!q.length && !a.length) continue
    n++
    for (const [label, items] of [['Question', q], ['Answer', a]] as const) {
      const s = p.addSlide()
      s.addText(`${label} · card ${n}`, { x: 0.5, y: 0.3, w: 9, h: 0.4, fontSize: 12, italic: true })
      const text = items.filter((i): i is Extract<Item, { t: 'text' }> => i.t === 'text').map((i) => i.v).join('\n\n')
      const imgs = items.filter((i): i is Extract<Item, { t: 'img' }> => i.t === 'img')
      s.addText(text || ' ', { x: 0.5, y: 0.9, w: imgs.length ? 4.8 : 9, h: 4.2, fontSize: 20, valign: 'top' })
      if (imgs[0]) {
        const i = imgs[0], w = Math.min(4, (3.8 * i.w) / i.h), h = (w * i.h) / i.w
        s.addImage({ data: i.v, x: 5.5, y: 0.9, w, h })
      }
    }
  }
  await p.writeFile({ fileName: `${set.title || 'flashcards'}.pptx` })
}

export function exportFcw(set: CardSet, serialize: (s: CardSet[]) => string) {
  download(`${set.title || 'flashcards'}.fcw`, serialize([set]), 'application/vnd.flashcardwizard+json')
}
void faceToText
