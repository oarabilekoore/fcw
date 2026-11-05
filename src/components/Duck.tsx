export type DuckState = 'idle' | 'listening' | 'thinking' | 'speaking'

/** Quackers, the rubber-duck mascot. Fixed (not theme-flipping) yellows so it stays a duck in every theme. */
export function DuckMascot({ state = 'idle', className = '' }: { state?: DuckState; className?: string }) {
  const label = { idle: 'Quackers the rubber duck', listening: 'Quackers is listening', thinking: 'Quackers is thinking', speaking: 'Quackers is talking' }[state]
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={label} className={className}>
      <ellipse cx="100" cy="186" rx="62" ry="7" fill="var(--md-sys-color-on-surface)" opacity=".12" />
      <g className={state === 'idle' ? '' : `duck-${state}`}>
        <path d="M30 128c0-34 26-50 58-50s64 16 64 52c0 26-24 46-60 46s-62-18-62-48z" fill="var(--md-sys-color-tertiary-fixed-dim)" />
        <path d="M40 120c0-26 22-40 52-40s58 12 58 42c0 24-22 42-56 42S40 146 40 120z" fill="var(--md-sys-color-tertiary-fixed)" />
        <path d="M54 118c14-10 36-6 44 8 6 12-6 24-22 22-18-2-30-16-22-30z" fill="var(--md-sys-color-tertiary-fixed-dim)" />
        <circle cx="122" cy="62" r="38" fill="var(--md-sys-color-tertiary-fixed)" />
        <g className="beak"><path d="M148 70c18-2 30 4 30 10s-12 12-30 10c-6-1-8-18 0-20z" fill="var(--md-sys-color-primary-fixed-dim)" /></g>
        <circle cx="134" cy="54" r="5" fill="var(--md-sys-color-on-tertiary-fixed)" />
        <circle cx="136" cy="52" r="1.6" fill="#fff" />
        {state === 'thinking' && <text x="92" y="30" fontSize="22" fill="var(--md-sys-color-on-surface-variant)" aria-hidden="true">…</text>}
        {state === 'listening' && <path d="M90 36q-10 10 0 22M80 30q-18 18 0 34" stroke="var(--md-sys-color-primary)" strokeWidth="3" fill="none" strokeLinecap="round" />}
      </g>
    </svg>
  )
}
