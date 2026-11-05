export type CardType = 'standard' | 'multiple-choice' | 'true-false' | 'fill-blank' | 'flowchart'
export type Result = 'correct' | 'partial' | 'incorrect'

export type TextBlock = { id: string; kind: 'text'; text: string }
export type ImageBlock = {
  id: string; kind: 'image'; src: string; alt: string
  width: number; align: 'left' | 'center' | 'right'; caption: string; rounded: boolean
}
export type Block = TextBlock | ImageBlock
/** Points are flat [x0,y0,x1,y1…] in an 800×450 logical space. `color` is a theme token name. */
export type Stroke = { tool: 'pen' | 'eraser'; color: string; size: number; pts: number[] }

/** One side of a card: either text/image blocks or a hand-drawn canvas. */
export interface Face { mode: 'blocks' | 'canvas'; blocks: Block[]; strokes: Stroke[]; alt: string }
export interface Choice { id: string; text: string }
export interface FlowStep { id: string; label: string; shape: 'process' | 'decision' | 'terminal' }

export interface Card {
  id: string
  type: CardType
  front: Face
  back: Face
  choices: Choice[]      // multiple-choice
  correct: string[]      // ids of correct choices
  answerBool: boolean    // true-false
  blankText: string      // fill-blank, e.g. "The {{mitochondria|mitochondrion}} makes ATP"
  steps: FlowStep[]      // flowchart, stored in the CORRECT order
}

export interface CardSet {
  id: string; title: string; description: string; cards: Card[]; createdAt: number; updatedAt: number
}
export interface Progress { box: number; due: number; seen: number; correct: number; last: number }
export interface HistoryEntry { date: string; setId: string; reviewed: number; correct: number }
export interface Library {
  version: 1; sets: CardSet[]; progress: Record<string, Progress>; history: HistoryEntry[]
}

export interface Settings {
  llmEndpoint: string; llmModel: string; llmKey: string
  sttMode: 'auto' | 'browser' | 'server'; sttEndpoint: string; sttModel: string
  lang: string; ttsRate: number; ttsVoice: string
}
