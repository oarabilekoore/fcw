import * as React from 'react'
import { cn } from '@/lib/utils'

export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-lg border border-border bg-card text-card-foreground', className)} {...p} />
)
export const Badge = ({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground', className)} {...p} />
)
export function Progress({ value, label, className }: { value: number; label: string; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className={cn('h-2 w-full overflow-hidden rounded-sm bg-md-surface-container-highest', className)}>
      <div className="h-full rounded-sm bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  )
}
