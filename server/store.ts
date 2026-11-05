// File-backed library shared by the web app (via /api/library) and the MCP server.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export const LIB_PATH = process.env.FCW_LIBRARY ?? join(homedir(), '.flashcard-wizard', 'library.json')

export function readLib(): { rev: number; data: any | null } {
  if (!existsSync(LIB_PATH)) return { rev: 0, data: null }
  try { return JSON.parse(readFileSync(LIB_PATH, 'utf8')) } catch { return { rev: 0, data: null } }
}

export function writeLib(data: unknown): { rev: number } {
  const rev = readLib().rev + 1
  mkdirSync(dirname(LIB_PATH), { recursive: true })
  const tmp = LIB_PATH + '.tmp'
  writeFileSync(tmp, JSON.stringify({ rev, data }))
  renameSync(tmp, LIB_PATH)
  return { rev }
}
