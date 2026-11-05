import { readLib, writeLib } from './store'

export function handleLibrary(method: string, body: string): { status: number; body: string } {
  try {
    if (method === 'GET') return { status: 200, body: JSON.stringify(readLib()) }
    if (method === 'PUT') {
      const { data } = JSON.parse(body)
      if (!data || !Array.isArray(data.sets)) return { status: 400, body: '{"error":"not a library"}' }
      return { status: 200, body: JSON.stringify(writeLib(data)) }
    }
    return { status: 405, body: '{}' }
  } catch (e) {
    return { status: 500, body: JSON.stringify({ error: String(e) }) }
  }
}
