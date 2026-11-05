# Flashcard Wizard

Mixed-type flashcards (fact, multiple choice, true/false, fill-in-the-blank, flow chart) with canvas cards, LaTeX, images,
voice answers graded by a small local Gemma, a rubber-duck tutor, progress tracking, PDF/PPTX export and an MCP server.
React + Tailwind + shadcn-style components (Radix) on Bun/Vite. Colours come from the Material 3 theme CSS in `src/styles/themes`
(light, dark, medium and high contrast; the theme menu picks them, "match system" follows OS settings).

## Exactly what I am trying to build

A flashcard app that supports more than one type of card; 
- true or false
- multiple choice 
- fill in the blanks 
- re-arrange the flowchart 
- select the proper area in a diagram 
- the default type 

I also want a good card editing experience, something like Google Slides... 

I want support for latex math, handwritten canvas flashcards. A rubber ducking mode whereby i can get quized reply via text or voice as if in an ai chat, have a voice call with a rubber ducker. 

Below are the prompts i used to get where i am so that you get an understanding of my vision, unfortunatley i don't have the money to spend on CLaude or Gemini.

### Prompt 1 ; 

https://github.com/oarabilekoore/fcw/tree/main 
Add the following features; 

* The duck view should be a chat application whereby the duck begins questioning in a learner type phrasing. Whereby me, the one being quizzed is the teacher to it, however if i get answers wrong it will correct me. Also there should be duck modes whereby I teach and it catches my mistakes or it teaches and asks interactively based on the flashcard content and i answer
* Duck mode should have a voice call mode, whereby I can talk in a natural voice get a response in a natural voice. This interaction will follow the same interaction mode as the chat view. 
* Furthermore the duck should be able to cite my own flashcards and tell me where an error in my answering is and which flashcard to revise more. It should also mark where I got flaws and that data is on display as statistics. 
* The card editor deserves to be improved. The UI should be more usable, create an editor like what Google Slides has, a full toolbar and cards flipping between question and answer should be an animation (a flip animation) not a card insertion below the question. 
* The card import should accept anki and spreadsheet files as well as the custom files.
* Remove the useless export button there. 
* Improve the MCP 
* Imporove the settings for setting up all the tooling.


### Prompt 2; 

modify this flashcards app in a way that the view answer card is an animation switch between the question. Also create a file format for these types of flashcards. Furthermore make it have an MCP 
Less rounding to the UI 
I have this installed on disk; 
oarabile@archlinux ~/S/f/fcw> ollama list
[GIN] 2026/11/06 - 00:59:31 | 200 | 854.251µs |       127.0.0.1 | HEAD     "/"
[GIN] 2026/11/06 - 00:59:31 | 200 |   3.03ms |       127.0.0.1 | GET      "/api/tags"
NAME          ID              SIZE      MODIFIED
gemma4:e2b    b37049369adf    4.6 GB    2 days ago
oarabile@archlinux ~/S/f/fcw>

You can improve the chat interface alot as well as the voice talk mode, by installing a lite vocal model and a model for talking that could translate the questions i am being asked in duck mode. improve the user interface too. 
The chat ui should resemble a morden LLM chat interface too. And in duck mode the ai should ask me a question and i answer it should act dumb so this is your que to make a system prompt for it too. 

### Prompt 3 

I want a flashcards app that allows me to vary the type of card in one set. A set of flashcards should have multiple types of cards. The existing types of cards should be;

* Multiple choice
* True or False
* Fact given (standard)
* Fill in the blank
* Flow chart mode

Flow chart mode should support having to create a question like assemble the following elements in the correct order for a ... process:
Then i should be able to drag and choose the correct pieces and assemble the flow chart and have it validated. An incorrect flowchart flashcard should evaluate on a step basis - If the flow chart is assembled in a correct fashion for two or more pieces but incorrect in another region it should mark those as correct and flag the errors.
The cards editor should support the ability to write a card in the standard way with a basic text block or make a card a canvas whereby I can write on it and add a second answer card.
The cards text editor should support latex math support, images and various image controls.
The flashcards answering view should support voiced answers whereby the user could answer with their voice and a voice model transforms their language into text and is evaluated to be correct using a lite gemma model to evaluate the users answer given the flashcard and answer.
The flashcard app should support rubber ducking mode whereby a small gemma model with an instruction and the reference flashcards can output text to ask the user, and a voice model asks the questions. So that I can answer it and back and forth. The interface can be a chat mode or a voice call mode with the rubber ducking view with a rubber duck mascot.
In the home view of the application I should be able to view flashcards sets I have made, import flashcards, and a view of learning progress on the flashcards studied.
The flashcards app should allow exporting the cards to PDF or pptx. However use a custom file type for this project.
Use React, Shadcn, Tailwind, Bun for the project.
Support dark and light modes. Accessibility should also be a focal point.
Infer from the provided image on creating a UI. Follow the color scheme provided in css.
The app should support an MCP for agentic use too.


PS: When i get time I will dedicate time to this project and possibly re-write this in more perfomant tooling. I created this trying to get a tool that can help study for my upcoming exams...


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
