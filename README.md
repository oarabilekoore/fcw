# Flashcard Wizard

Mixed-type flashcards (fact, multiple choice, true/false, fill-in-the-blank, flow chart) with canvas cards, LaTeX, images,
voice answers graded by a small local Gemma, a rubber-duck tutor, progress tracking, PDF/PPTX export and an MCP server.
React + Tailwind + shadcn-style components (Radix) on Bun/Vite. Colours come from the Material 3 theme CSS in `src/styles/themes`
(light, dark, medium and high contrast; the theme menu picks them, "match system" follows OS settings).

## Run
```bash
bun install
bun run dev                    # http://localhost:5173
# or production:
bun run build && bun run start # http://localhost:4173
```
Add more shadcn components any time with `bunx shadcn@latest add <name>` (`components.json` is set up).

## Local model + voice
* **Grading and duck:** any OpenAI-compatible server. Default is Ollama + `gemma3:1b`:
  `ollama pull gemma3:1b` and start Ollama with `OLLAMA_ORIGINS=*` (or your dev origin) so the browser may call it.
  Without a reachable model, voice answers fall back to simple word matching and say so.
* **Speech to text:** the browser's recognizer if present (Chrome, Edge, Safari; Chrome sends audio to Google).
  Firefox has none, so point Settings at a Whisper server exposing `/v1/audio/transcriptions`
  (faster-whisper-server, whisper.cpp server, LocalAI…). Typing is always available as a fallback.
* **Duck voice:** browser speech synthesis. Replace `speak()` in `src/lib/speech.ts` to use Piper/Kokoro.

## File format
`.fcw` = Flashcard Wizard file: JSON with `format: "flashcard-wizard"`, images embedded as data URLs. Import also accepts CSV/TSV
(`front,back` per line, e.g. Quizlet exports). PDF/PPTX exports are one-way (LaTeX appears as source text, canvas cards as images).

## MCP (agents)
The web app and MCP server share `~/.flashcard-wizard/library.json` (override with `FCW_LIBRARY`). The app polls every few seconds,
so cards an agent adds show up without a reload (requires `bun run dev` or `bun run start`, which expose `/api/library`).

```json
{ "mcpServers": { "flashcard-wizard": { "command": "bun", "args": ["run", "/ABSOLUTE/PATH/flashcard-wizard/mcp/server.ts"] } } }
```
Tools: `list_sets`, `get_set`, `create_set`, `delete_set`, `add_cards`, `update_card`, `delete_card`, `get_progress`, `record_review`, `export_fcw`, `import_fcw`.

## Known limits
* Flow charts are linear sequences (no branches yet). Each step is checked by position, and "right order, wrong place" is flagged separately.
* Flow-chart pieces use drag and drop with mouse, plus select-then-select for keyboard and touch.
* Data lives in localStorage (about 5 MB; images are downscaled) and mirrors to the library file when the Bun server is running.
* The API server has no authentication and binds to localhost only.
