import * as React from 'react'
import { cn } from '@/lib/utils'

const base = 'w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground disabled:opacity-60'
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(base, 'h-11', className)} {...p} />
))
Input.displayName = 'Input'
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(base, 'min-h-24 py-2 font-sans', className)} {...p} />
))
Textarea.displayName = 'Textarea'
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(base, 'h-11 pr-8', className)} {...p} />
))
Select.displayName = 'Select'
export const Label = ({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('mb-1 block text-sm font-medium', className)} {...p} />
)
