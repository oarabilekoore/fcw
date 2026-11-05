// Production server: serves ./dist and the library API. Bound to localhost only (no auth).
import { join } from 'node:path'
import { handleLibrary } from './api'

const dist = join(import.meta.dir, '..', 'dist')
const port = Number(process.env.PORT ?? 4173)

Bun.serve({
  port,
  hostname: '127.0.0.1',
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === '/api/library') {
      const out = handleLibrary(req.method, req.method === 'PUT' ? await req.text() : '')
      return new Response(out.body, { status: out.status, headers: { 'content-type': 'application/json' } })
    }
    if (!url.pathname.includes('..')) {
      const file = Bun.file(join(dist, url.pathname === '/' ? 'index.html' : url.pathname))
      if (await file.exists()) return new Response(file)
    }
    return new Response(Bun.file(join(dist, 'index.html')))
  },
})
console.log(`Flashcard Wizard on http://localhost:${port}`)
