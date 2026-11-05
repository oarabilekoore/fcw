import { persisted } from './store'

export type Mode = 'system' | 'light' | 'dark'
export type Contrast = 'auto' | 'standard' | 'medium' | 'high'
export const themeStore = persisted<{ mode: Mode; contrast: Contrast }>('fcw.theme', { mode: 'system', contrast: 'auto' })

const CLASSES = ['light', 'dark', 'light-medium-contrast', 'light-high-contrast', 'dark-medium-contrast', 'dark-high-contrast']

export function applyTheme() {
  const t = themeStore.get()
  const dark = t.mode === 'dark' || (t.mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  const c = t.contrast === 'auto' ? (matchMedia('(prefers-contrast: more)').matches ? 'high' : 'standard') : t.contrast
  const el = document.documentElement
  el.classList.remove(...CLASSES)
  el.classList.add((dark ? 'dark' : 'light') + (c === 'high' ? '-high-contrast' : c === 'medium' ? '-medium-contrast' : ''))
  el.style.colorScheme = dark ? 'dark' : 'light'
  window.dispatchEvent(new Event('fcw-theme'))
}

export function initTheme() {
  applyTheme()
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)
  matchMedia('(prefers-contrast: more)').addEventListener('change', applyTheme)
}
