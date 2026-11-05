import * as React from 'react'
import * as DM from '@radix-ui/react-dropdown-menu'
import * as MB from '@radix-ui/react-menubar'
import * as DG from '@radix-ui/react-dialog'
import * as TB from '@radix-ui/react-tabs'
import { Check, ChevronRight, Circle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const panel = 'z-50 min-w-[12rem] rounded-md border border-border bg-popover p-1.5 text-popover-foreground shadow-lg'
const item = 'flex cursor-default select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none data-[highlighted]:bg-secondary data-[highlighted]:text-secondary-foreground data-[disabled]:opacity-50'

/* Dropdown menu */
export const DropdownMenu = DM.Root
export const DropdownMenuTrigger = DM.Trigger
export const DropdownMenuLabel = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof DM.Label>) => <DM.Label className={cn('px-3 py-1.5 text-xs font-medium text-muted-foreground', className)} {...p} />
export const DropdownMenuSeparator = () => <DM.Separator className="my-1 h-px bg-border" />
export const DropdownMenuContent = React.forwardRef<React.ElementRef<typeof DM.Content>, React.ComponentPropsWithoutRef<typeof DM.Content>>(({ className, sideOffset = 6, ...p }, ref) => (
  <DM.Portal><DM.Content ref={ref} sideOffset={sideOffset} className={cn(panel, className)} {...p} /></DM.Portal>
))
DropdownMenuContent.displayName = 'DropdownMenuContent'
export const DropdownMenuItem = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof DM.Item>) => <DM.Item className={cn(item, className)} {...p} />
export const DropdownMenuRadioGroup = DM.RadioGroup
export const DropdownMenuRadioItem = ({ className, children, ...p }: React.ComponentPropsWithoutRef<typeof DM.RadioItem>) => (
  <DM.RadioItem className={cn(item, 'pl-8 relative', className)} {...p}>
    <span className="absolute left-3 flex size-3 items-center justify-center"><DM.ItemIndicator><Circle className="size-2 fill-current" /></DM.ItemIndicator></span>
    {children}
  </DM.RadioItem>
)

/* Menubar (File / Edit / View) */
export const Menubar = React.forwardRef<React.ElementRef<typeof MB.Root>, React.ComponentPropsWithoutRef<typeof MB.Root>>(({ className, ...p }, ref) => (
  <MB.Root ref={ref} className={cn('flex gap-1 border-b border-border px-2 py-1', className)} {...p} />
))
Menubar.displayName = 'Menubar'
export const MenubarMenu = MB.Menu
export const MenubarTrigger = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof MB.Trigger>) => (
  <MB.Trigger className={cn('rounded-md px-3 py-1.5 text-sm font-medium outline-none hover:bg-muted data-[state=open]:bg-secondary', className)} {...p} />
)
export const MenubarContent = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof MB.Content>) => (
  <MB.Portal><MB.Content align="start" sideOffset={4} className={cn(panel, className)} {...p} /></MB.Portal>
)
export const MenubarItem = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof MB.Item>) => <MB.Item className={cn(item, className)} {...p} />
export const MenubarSeparator = () => <MB.Separator className="my-1 h-px bg-border" />
export const MenubarSub = MB.Sub
export const MenubarSubTrigger = ({ className, children, ...p }: React.ComponentPropsWithoutRef<typeof MB.SubTrigger>) => (
  <MB.SubTrigger className={cn(item, 'justify-between', className)} {...p}>{children}<ChevronRight className="size-4" /></MB.SubTrigger>
)
export const MenubarSubContent = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof MB.SubContent>) => (
  <MB.Portal><MB.SubContent className={cn(panel, className)} {...p} /></MB.Portal>
)

/* Dialog */
export const Dialog = DG.Root
export const DialogTrigger = DG.Trigger
export function DialogContent({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <DG.Portal>
      <DG.Overlay className="fixed inset-0 z-40 bg-md-inverse-surface/50" />
      <DG.Content className={cn('fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,44rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-xl', className)}>
        <DG.Title className="font-display text-xl font-semibold">{title}</DG.Title>
        <DG.Description className={description ? 'mt-1 text-sm text-muted-foreground' : 'sr-only'}>{description ?? title}</DG.Description>
        <div className="mt-4">{children}</div>
        <DG.Close aria-label="Close" className="absolute right-4 top-4 rounded-md p-2 hover:bg-muted"><X className="size-4" /></DG.Close>
      </DG.Content>
    </DG.Portal>
  )
}

/* Tabs */
export const Tabs = TB.Root
export const TabsList = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof TB.List>) => (
  <TB.List className={cn('inline-flex flex-wrap gap-1 rounded-md bg-muted p-1', className)} {...p} />
)
export const TabsTrigger = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof TB.Trigger>) => (
  <TB.Trigger className={cn('rounded-sm px-3.5 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground', className)} {...p} />
)
export const TabsContent = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof TB.Content>) => <TB.Content className={cn('mt-4', className)} {...p} />
export { Check }
