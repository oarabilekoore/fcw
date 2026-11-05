import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, ChevronRight, Eye, RefreshCw, Rotate3d, RotateCcw, X } from 'lucide-react'
import type { Card, Result } from '@/lib/types'
import { faceHasContent, TYPE_LABEL } from '@/lib/model'
import { cn } from '@/lib/utils'
import { Badge, Card as CardContainer } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FaceView } from '@/components/Rich'
import { CardBody } from '@/components/cardTypes'
import type { Verdict } from '@/components/VoiceAnswer'

interface FlipCardProps {
  card: Card
  isFlipped: boolean
  onFlipChange: (flipped: boolean) => void
  onResult: (result: Result) => void
  result: Result | null
  onOverride: (result: Result) => void
  onNext: () => void
  cardIndex: number
  totalCards: number
  voiceVerdict: Verdict | null
}

const RESULT_LABELS: Record<Result, string> = {
  correct: 'Correct',
  partial: 'Partly right',
  incorrect: 'Missed it',
}

export function FlipCard({
  card,
  isFlipped,
  onFlipChange,
  onResult,
  result,
  onOverride,
  onNext,
  cardIndex,
  totalCards,
  voiceVerdict,
}: FlipCardProps) {
  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const [minHeight, setMinHeight] = useState<number>(360)

  // Dynamically compute the container min-height so front and back flip inside equal bounds
  useEffect(() => {
    const updateHeight = () => {
      const fH = frontRef.current?.scrollHeight ?? 0
      const bH = backRef.current?.scrollHeight ?? 0
      const next = Math.max(340, fH, bH)
      setMinHeight(next)
    }
    updateHeight()
    const t = setTimeout(updateHeight, 60)
    return () => clearTimeout(t)
  }, [card.id, isFlipped, result, voiceVerdict])

  // Keyboard shortcut listener for space/f (flip), 1/2/3 (grade), enter (next)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      if (isInput) return

      if (e.code === 'Space' || e.key.toLowerCase() === 'f') {
        e.preventDefault()
        onFlipChange(!isFlipped)
      } else if (result && (e.key === 'Enter' || e.key === 'ArrowRight')) {
        e.preventDefault()
        onNext()
      } else if (isFlipped && !result) {
        if (e.key === '1') onResult('incorrect')
        if (e.key === '2') onResult('partial')
        if (e.key === '3') onResult('correct')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isFlipped, result, onFlipChange, onResult, onNext])

  const hasBackContent = faceHasContent(card.back)

  return (
    <div className="perspective-card w-full" aria-live="polite">
      {/* 3D Flip Container */}
      <div
        className={cn(
          'flip-card-inner transform-style-preserve-3d relative w-full',
          isFlipped && 'rotate-y-180'
        )}
        style={{ minHeight: `${minHeight}px` }}
      >
        {/* ==================== FRONT FACE (QUESTION) ==================== */}
        <div
          ref={frontRef}
          aria-hidden={isFlipped}
          className={cn(
            'backface-hidden w-full',
            isFlipped ? 'pointer-events-none absolute inset-0' : 'relative'
          )}
        >
          <CardContainer className="flex flex-col justify-between p-6 sm:p-8 min-h-[340px] border-border bg-card shadow-sm">
            {/* Front Header */}
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Badge>{TYPE_LABEL[card.type]}</Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  Question · {cardIndex + 1}/{totalCards}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onFlipChange(true)}
                title="Switch to Answer (Space or F)"
                className="gap-1.5 text-xs font-semibold"
              >
                <Rotate3d className="size-3.5" />
                <span>View Answer</span>
                <kbd className="hidden sm:inline-block text-[10px] bg-muted px-1 py-0.5 rounded border border-border">Space</kbd>
              </Button>
            </div>

            {/* Front Body */}
            <div className="space-y-4 flex-1">
              {(card.type !== 'fill-blank' || faceHasContent(card.front)) && (
                <div className="text-xl leading-relaxed">
                  <FaceView face={card.front} />
                </div>
              )}

              {/* Interactive body for multiple-choice, true-false, fill-blank, flowchart */}
              {card.type !== 'standard' && (
                <div className="pt-2">
                  <CardBody
                    card={card}
                    locked={!!result}
                    onResult={(r) => {
                      onResult(r)
                      // Automatically flip to explanation on answer if it has back content
                      if (hasBackContent) {
                        setTimeout(() => onFlipChange(true), 400)
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Front Footer */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border text-sm text-muted-foreground">
              {card.type === 'standard' ? (
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs">Think about your answer, then flip to check</span>
                  <Button
                    type="button"
                    onClick={() => onFlipChange(true)}
                    className="gap-2 font-semibold"
                  >
                    <Eye className="size-4" />
                    Reveal Answer
                    <Rotate3d className="size-4 ml-1" />
                  </Button>
                </div>
              ) : (
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs">Answer above or flip to view full explanation</span>
                  <Button
                    type="button"
                    variant="tonal"
                    size="sm"
                    onClick={() => onFlipChange(true)}
                    className="gap-1.5"
                  >
                    <Rotate3d className="size-3.5" />
                    <span>Flip to Explanation</span>
                  </Button>
                </div>
              )}
            </div>
          </CardContainer>
        </div>

        {/* ==================== BACK FACE (ANSWER / EXPLANATION) ==================== */}
        <div
          ref={backRef}
          aria-hidden={!isFlipped}
          className={cn(
            'backface-hidden rotate-y-180 w-full',
            !isFlipped ? 'pointer-events-none absolute inset-0' : 'relative'
          )}
        >
          <CardContainer className="flex flex-col justify-between p-6 sm:p-8 min-h-[340px] border-primary/40 bg-card shadow-md">
            {/* Back Header */}
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground font-semibold">
                  {card.type === 'standard' ? 'Answer' : 'Explanation'}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  Card {cardIndex + 1}/{totalCards}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onFlipChange(false)}
                title="Switch back to Question (Space or F)"
                className="gap-1.5 text-xs font-semibold"
              >
                <RotateCcw className="size-3.5" />
                <span>Question</span>
                <kbd className="hidden sm:inline-block text-[10px] bg-muted px-1 py-0.5 rounded border border-border">Space</kbd>
              </Button>
            </div>

            {/* Back Body */}
            <div className="space-y-4 flex-1">
              {hasBackContent ? (
                <div className="rounded-md bg-muted/60 p-4 border border-border text-lg leading-relaxed">
                  <FaceView face={card.back} />
                </div>
              ) : (
                <div className="rounded-md bg-muted/30 p-4 text-sm text-muted-foreground italic">
                  No additional explanation provided on the card.
                </div>
              )}

              {/* Voice verdict feedback if graded by voice */}
              {voiceVerdict && (
                <div className="rounded-md border border-border bg-muted/40 p-3 text-sm space-y-1">
                  <p className="font-medium text-foreground">You said: “{voiceVerdict.said}”</p>
                  <p className="text-muted-foreground">{voiceVerdict.feedback}</p>
                </div>
              )}

              {/* If already scored, display the result badge */}
              {result && (
                <div className="flex items-center justify-between p-3 rounded-md bg-secondary/60 border border-border">
                  <div className="flex items-center gap-2">
                    {result === 'correct' ? (
                      <span className="flex size-6 items-center justify-center rounded-full bg-md-tertiary-container text-md-on-tertiary-container">
                        <Check className="size-4" />
                      </span>
                    ) : result === 'partial' ? (
                      <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-bold text-xs">
                        ~
                      </span>
                    ) : (
                      <span className="flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                        <X className="size-4" />
                      </span>
                    )}
                    <span className="font-semibold">{RESULT_LABELS[result]}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground mr-1">Change:</span>
                    {(['correct', 'partial', 'incorrect'] as Result[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => onOverride(r)}
                        className={cn(
                          'px-2 py-1 rounded text-xs border transition-colors',
                          r === result
                            ? 'bg-primary text-primary-foreground border-primary font-medium'
                            : 'bg-background hover:bg-muted border-border text-muted-foreground'
                        )}
                      >
                        {r === 'correct' ? 'Got it' : r === 'partial' ? 'Almost' : 'Missed'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Back Footer / Self Grading & Next */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
              {!result ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-3">
                  <span className="text-xs text-muted-foreground">How well did you know this?</span>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Self evaluation">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onResult('incorrect')}
                      className="gap-1.5"
                    >
                      <X className="size-4" />
                      <span>Missed it (1)</span>
                    </Button>
                    <Button
                      variant="tonal"
                      size="sm"
                      onClick={() => onResult('partial')}
                      className="gap-1.5"
                    >
                      <span>Almost (2)</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onResult('correct')}
                      className="gap-1.5"
                    >
                      <Check className="size-4" />
                      <span>Got it (3)</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onFlipChange(false)}
                    className="text-xs text-muted-foreground"
                  >
                    <RotateCcw className="size-3.5 mr-1" />
                    Review Question
                  </Button>
                  <Button
                    type="button"
                    onClick={onNext}
                    className="gap-1.5 font-semibold"
                  >
                    <span>{cardIndex + 1 < totalCards ? 'Next card' : 'Finish session'}</span>
                    <ArrowRight className="size-4" />
                    <kbd className="hidden sm:inline-block text-[10px] bg-primary-foreground/20 px-1 py-0.5 rounded">Enter</kbd>
                  </Button>
                </div>
              )}
            </div>
          </CardContainer>
        </div>
      </div>
    </div>
  )
}
