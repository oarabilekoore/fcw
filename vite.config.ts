import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { handleLibrary } from './server/api'

/** Dev-time /api/library endpoint, backed by the same file the MCP server edits. */
function libraryApi(): Plugin {
  return {
    name: 'fcw-library-api',
    configureServer(server) {
      server.middlewares.use('/api/library', async (req, res) => {
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const out = handleLibrary(req.method ?? 'GET', Buffer.concat(chunks).toString('utf8'))
        res.statusCode = out.status
        res.setHeader('content-type', 'application/json')
        res.end(out.body)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), libraryApi()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
