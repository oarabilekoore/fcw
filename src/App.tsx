import { useEffect, useState } from 'react'
import { BookOpenCheck, Home as HomeIcon, MonitorCog, Moon, Settings as Cog, Sun, WandSparkles } from 'lucide-react'
import { Button } from './components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from './components/ui/overlay'
import { applyTheme, themeStore, type Contrast, type Mode } from './lib/theme'
import { Home } from './views/Home'
import { Editor } from './views/Editor'
import { Study } from './views/Study'
import { DuckView } from './views/DuckView'
import { SettingsView } from './views/SettingsView'

export const go = (path: string) => { location.hash = path }
function useRoute() {
  const [h, setH] = useState(location.hash.slice(1) || '/')
  useEffect(() => { const f = () => setH(location.hash.slice(1) || '/'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  const [, name, id] = h.split('/')
  return { name: name || 'home', id }
}

function ThemeMenu() {
  const t = themeStore.use()
  const Icon = t.mode === 'dark' ? Moon : t.mode === 'light' ? Sun : MonitorCog
  const set = (p: Partial<typeof t>) => { themeStore.set(p); applyTheme() }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Appearance"><Icon className="size-5" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={t.mode} onValueChange={(v) => set({ mode: v as Mode })}>
          <DropdownMenuRadioItem value="system">Match system</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Contrast</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={t.contrast} onValueChange={(v) => set({ contrast: v as Contrast })}>
          <DropdownMenuRadioItem value="auto">Match system</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="standard">Standard</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="high">High</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function App() {
  const { name, id } = useRoute()
  useEffect(() => { document.title = 'Flashcard Wizard' }, [name])
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Skip to content</a>
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 sm:px-6">
        <a href="#/" className="flex items-center gap-2 rounded-md font-display text-xl font-bold"><WandSparkles className="size-6 text-primary" aria-hidden />Flashcard Wizard</a>
        <nav aria-label="Main" className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Home"><a href="#/"><HomeIcon className="size-5" /></a></Button>
          <Button asChild variant="ghost" size="icon" aria-label="Rubber duck mode"><a href="#/duck"><BookOpenCheck className="size-5" /></a></Button>
          <Button asChild variant="ghost" size="icon" aria-label="Settings"><a href="#/settings"><Cog className="size-5" /></a></Button>
          <ThemeMenu />
        </nav>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {name === 'set' && id ? <Editor setId={id} />
          : name === 'study' && id ? <Study setId={id} />
          : name === 'duck' ? <DuckView setId={id} />
          : name === 'settings' ? <SettingsView />
          : <Home />}
      </main>
    </div>
  )
}
