import { useRef } from 'react'
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, ImagePlus, PenLine, Trash2, Type } from 'lucide-react'
import type { Block, Face, ImageBlock } from '@/lib/types'
import { uid } from '@/lib/model'
import { Button } from './ui/button'
import { Input, Label, Textarea } from './ui/field'
import { RichText } from './Rich'
import { InkCanvas } from './InkCanvas'
import { cn } from '@/lib/utils'

const MATH: [string, string, string][] = [
  ['x²', '$x^{2}$', 'Superscript'], ['a⁄b', '$\\frac{a}{b}$', 'Fraction'], ['√', '$\\sqrt{x}$', 'Square root'], ['Σ', '$\\sum_{i=1}^{n} i$', 'Sum'],
  ['∫', '$\\int_{a}^{b} f(x)\\,dx$', 'Integral'], ['π', '$\\pi$', 'Pi'], ['α', '$\\alpha$', 'Alpha'], ['Δ', '$\\Delta$', 'Delta'], ['block', '$$E = mc^{2}$$', 'Display equation'],
]

/** Shrinks big pictures so a set with many images still fits in browser storage. */
async function readImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
    const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/webp', 0.85)
  } finally { URL.revokeObjectURL(url) }
}

export function FaceEditor({ face, onChange, label }: { face: Face; onChange: (f: Face) => void; label: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const setBlocks = (fn: (b: Block[]) => Block[]) => onChange({ ...face, blocks: fn(face.blocks) })
  const patch = (id: string, p: Partial<Block>) => setBlocks((bs) => bs.map((b) => (b.id === id ? ({ ...b, ...p } as Block) : b)))
  const move = (i: number, d: number) => setBlocks((bs) => { const a = [...bs]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a })

  async function addImages(files: FileList | File[]) {
    const imgs: ImageBlock[] = []
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue
      imgs.push({ id: uid(), kind: 'image', src: await readImage(f), alt: '', width: 60, align: 'center', caption: '', rounded: true })
    }
    if (imgs.length) setBlocks((bs) => [...bs, ...imgs])
  }

  function insert(id: string, snippet: string) {
    const el = document.getElementById(`ta-${id}`) as HTMLTextAreaElement | null
    const b = face.blocks.find((x) => x.id === id)
    if (!el || !b || b.kind !== 'text') return
    const s = el.selectionStart ?? b.text.length, e = el.selectionEnd ?? s
    patch(id, { text: b.text.slice(0, s) + snippet + b.text.slice(e) })
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + snippet.length, s + snippet.length) })
  }

  return (
    <div className="space-y-4" onPaste={(e) => { if (e.clipboardData.files.length) { e.preventDefault(); void addImages(e.clipboardData.files) } }}>
      <div role="group" aria-label={`${label} style`} className="inline-flex rounded-md bg-muted p-1">
        {([['blocks', 'Text card', Type], ['canvas', 'Canvas card', PenLine]] as const).map(([m, name, Icon]) => (
          <button key={m} type="button" aria-pressed={face.mode === m} onClick={() => onChange({ ...face, mode: m })}
            className={cn('inline-flex items-center gap-2 rounded-sm px-3.5 py-1.5 text-sm font-medium', face.mode === m && 'bg-primary text-primary-foreground')}>
            <Icon className="size-4" />{name}
          </button>
        ))}
      </div>

      {face.mode === 'canvas' ? (
        <div className="space-y-3">
          <InkCanvas strokes={face.strokes} onChange={(strokes) => onChange({ ...face, strokes })} alt={face.alt} />
          <div>
            <Label htmlFor={`alt-${label}`}>Describe this drawing for screen readers</Label>
            <Input id={`alt-${label}`} value={face.alt} onChange={(e) => onChange({ ...face, alt: e.target.value })} placeholder="e.g. A free-body diagram of a block on a ramp" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {face.blocks.map((b, i) => (
            <div key={b.id} className="rounded-md border border-border bg-background p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{b.kind === 'text' ? 'Text' : 'Image'} block {i + 1}</span>
                <div className="flex gap-1">
                  <Button size="iconSm" variant="ghost" aria-label="Move block up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
                  <Button size="iconSm" variant="ghost" aria-label="Move block down" disabled={i === face.blocks.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
                  <Button size="iconSm" variant="ghost" aria-label="Delete block" onClick={() => setBlocks((bs) => bs.filter((x) => x.id !== b.id))}><Trash2 /></Button>
                </div>
              </div>
              {b.kind === 'text' ? (
                <>
                  <div role="group" aria-label="Insert LaTeX" className="mb-2 flex flex-wrap gap-1">
                    {MATH.map(([short, snip, name]) => (
                      <Button key={name} size="sm" variant="outline" aria-label={`Insert ${name}`} onClick={() => insert(b.id, snip)}>{short}</Button>
                    ))}
                  </div>
                  <Textarea id={`ta-${b.id}`} aria-label={`${label} text`} value={b.text} onChange={(e) => patch(b.id, { text: e.target.value })}
                    placeholder="Write here. Use $x^2$ for inline maths, $$…$$ for equations, **bold**, *italic*." />
                  {b.text.includes('$') || /[*`]/.test(b.text) ? (
                    <div className="mt-2 rounded-md bg-muted p-3"><p className="mb-1 text-xs text-muted-foreground">Preview</p><RichText text={b.text} /></div>
                  ) : null}
                </>
              ) : (
                <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
                  <img src={b.src} alt={b.alt} className="max-h-40 w-full rounded-md object-contain" />
                  <div className="space-y-2">
                    <div><Label htmlFor={`a-${b.id}`}>Alt text (describe the picture)</Label><Input id={`a-${b.id}`} value={b.alt} onChange={(e) => patch(b.id, { alt: e.target.value })} /></div>
                    <div><Label htmlFor={`c-${b.id}`}>Caption</Label><Input id={`c-${b.id}`} value={b.caption} onChange={(e) => patch(b.id, { caption: e.target.value })} /></div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="min-w-40 flex-1">
                        <Label htmlFor={`w-${b.id}`}>Width: {b.width}%</Label>
                        <input id={`w-${b.id}`} type="range" min={10} max={100} step={5} value={b.width} onChange={(e) => patch(b.id, { width: Number(e.target.value) })} className="w-full accent-primary" />
                      </div>
                      <div role="group" aria-label="Alignment" className="flex gap-1">
                        {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
                          <Button key={a} size="iconSm" variant={b.align === a ? 'default' : 'outline'} aria-pressed={b.align === a} aria-label={`Align ${a}`} onClick={() => patch(b.id, { align: a })}><Icon /></Button>
                        ))}
                      </div>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={b.rounded} onChange={(e) => patch(b.id, { rounded: e.target.checked })} />Rounded corners</label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button variant="tonal" size="sm" onClick={() => setBlocks((bs) => [...bs, { id: uid(), kind: 'text', text: '' }])}><Type />Add text</Button>
            <Button variant="tonal" size="sm" onClick={() => fileRef.current?.click()}><ImagePlus />Add image</Button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={(e) => { if (e.target.files) void addImages(e.target.files); e.target.value = '' }} />
            <span className="self-center text-xs text-muted-foreground">You can also paste images.</span>
          </div>
        </div>
      )}
    </div>
  )
}
