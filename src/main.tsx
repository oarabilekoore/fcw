import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import 'katex/dist/katex.min.css'
import './index.css'
import { App } from './App'
import { initTheme } from './lib/theme'
import { startSync } from './lib/store'

initTheme()
startSync()
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
