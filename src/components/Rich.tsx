import { useMemo, type ReactNode } from 'react'
import katex from 'katex'
import type { Face } from '@/lib/types'
import { InkCanvas } from './InkCanvas'

function MathView({ tex, display }: { tex: string; display: boolean }) {
  const html = useMemo(() => {
    try { return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'htmlAndMathml' }) } catch { return null }
  }, [tex, display])
  return html ? <span className={display ? 'my-2 block' : undefined} dangerouslySetInnerHTML={{ __html: html }} /> : <code>{tex}</code>
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong>
        : p.startsWith('`') && p.length > 2 ? <code key={i} className="rounded bg-muted px-1 font-mono text-[0.9em]">{p.slice(1, -1)}</code>
        : p.startsWith('*') && p.length > 2 ? <em key={i}>{p.slice(1, -1)}</em>
        : p,
      )}
    </>
  )
}

/** Text with $inline$ and $$display$$ LaTeX plus **bold**, *italic*, `code`. */
export function RichText({ text }: { text: string }) {
  const out: ReactNode[] = []
  let last = 0
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Inline key={`t${last}`} text={text.slice(last, m.index)} />)
    out.push(<MathView key={`m${m.index}`} tex={(m[1] ?? m[2]).trim()} display={m[1] !== undefined} />)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(<Inline key={`t${last}`} text={text.slice(last)} />)
  return <div className="whitespace-pre-wrap break-words leading-relaxed">{out}</div>
}

export function FaceView({ face }: { face: Face }) {
  if (face.mode === 'canvas') return <InkCanvas strokes={face.strokes} readOnly alt={face.alt || 'Handwritten card'} />
  return (
    <div className="space-y-3">
      {face.blocks.map((b) =>
        b.kind === 'text' ? (b.text.trim() ? <RichText key={b.id} text={b.text} /> : null) : (
          <figure key={b.id} style={{ textAlign: b.align }}>
            <img src={b.src} alt={b.alt} style={{ width: `${b.width}%` }} className={`inline-block max-w-full ${b.rounded ? 'rounded-md' : ''}`} />
            {b.caption && <figcaption className="mt-1 text-sm text-muted-foreground">{b.caption}</figcaption>}
          </figure>
        ),
      )}
    </div>
  )
}
