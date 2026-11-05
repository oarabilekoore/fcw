import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser, PenLine, Trash2, Undo2 } from 'lucide-react'
import type { Stroke } from '@/lib/types'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'

export const W = 800, H = 450
const COLORS = [['on-surface', 'Ink'], ['primary', 'Terracotta'], ['tertiary', 'Gold'], ['error', 'Red']] as const
const SIZES = [[3, 'Fine'], [6, 'Medium'], [12, 'Bold']] as const

function useThemeTick() {
  const [n, setN] = useState(0)
  useEffect(() => { const f = () => setN((x) => x + 1); window.addEventListener('fcw-theme', f); return () => window.removeEventListener('fcw-theme', f) }, [])
  return n
}

function paint(ctx: CanvasRenderingContext2D, strokes: Stroke[], css: CSSStyleDeclaration) {
  ctx.clearRect(0, 0, W, H)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  for (const s of strokes) {
    ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over'
    const col = css.getPropertyValue(`--md-sys-color-${s.color}`).trim() || '#000'
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = s.size
    ctx.beginPath()
    if (s.pts.length === 2) { ctx.arc(s.pts[0], s.pts[1], s.size / 2, 0, Math.PI * 2); ctx.fill(); continue }
    ctx.moveTo(s.pts[0], s.pts[1])
    for (let i = 2; i < s.pts.length - 2; i += 2) ctx.quadraticCurveTo(s.pts[i], s.pts[i + 1], (s.pts[i] + s.pts[i + 2]) / 2, (s.pts[i + 1] + s.pts[i + 3]) / 2)
    ctx.lineTo(s.pts[s.pts.length - 2], s.pts[s.pts.length - 1])
    ctx.stroke()
  }
}

export function InkCanvas({ strokes, onChange, readOnly, alt }: { strokes: Stroke[]; onChange?: (s: Stroke[]) => void; readOnly?: boolean; alt: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const draft = useRef<Stroke | null>(null)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [color, setColor] = useState('on-surface')
  const [size, setSize] = useState(3)
  const tick = useThemeTick()

  const redraw = useCallback(() => {
    const c = ref.current
    if (!c) return
    paint(c.getContext('2d')!, draft.current ? [...strokes, draft.current] : strokes, getComputedStyle(c))
  }, [strokes])
  useEffect(redraw, [redraw, tick])

  const pt = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height]
  }
  const down = (e: React.PointerEvent) => {
    if (readOnly) return
    ref.current!.setPointerCapture(e.pointerId)
    draft.current = { tool, color, size: tool === 'eraser' ? size * 3 : size, pts: pt(e) }
    redraw()
  }
  const move = (e: React.PointerEvent) => {
    if (!draft.current) return
    draft.current.pts.push(...pt(e))
    redraw()
  }
  const up = () => {
    if (!draft.current) return
    const s = draft.current
    draft.current = null
    onChange?.([...strokes, s])
  }

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div role="toolbar" aria-label="Drawing tools" className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={tool === 'pen' ? 'default' : 'outline'} aria-pressed={tool === 'pen'} onClick={() => setTool('pen')}><PenLine />Pen</Button>
          <Button size="sm" variant={tool === 'eraser' ? 'default' : 'outline'} aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')}><Eraser />Eraser</Button>
          <span className="mx-1 h-6 w-px bg-border" aria-hidden />
          {COLORS.map(([c, name]) => (
            <button key={c} type="button" aria-label={`${name} colour`} aria-pressed={color === c} onClick={() => { setColor(c); setTool('pen') }}
              className={cn('size-8 rounded-sm border-2', color === c ? 'border-foreground' : 'border-border')} style={{ background: `var(--md-sys-color-${c})` }} />
          ))}
          <span className="mx-1 h-6 w-px bg-border" aria-hidden />
          {SIZES.map(([s, name]) => (
            <Button key={s} size="sm" variant={size === s ? 'tonal' : 'ghost'} aria-pressed={size === s} onClick={() => setSize(s)}>{name}</Button>
          ))}
          <span className="mx-1 h-6 w-px bg-border" aria-hidden />
          <Button size="sm" variant="ghost" disabled={!strokes.length} onClick={() => onChange?.(strokes.slice(0, -1))}><Undo2 />Undo</Button>
          <Button size="sm" variant="ghost" disabled={!strokes.length} onClick={() => onChange?.([])}><Trash2 />Clear</Button>
        </div>
      )}
      <canvas
        ref={ref} width={W} height={H} role="img" aria-label={alt || 'Handwritten canvas'}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        className={cn('aspect-video w-full rounded-md border border-border bg-md-surface-container-lowest', !readOnly && 'cursor-crosshair touch-none')}
      />
    </div>
  )
}
