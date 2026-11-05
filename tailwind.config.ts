import type { Config } from 'tailwindcss'

const t = (n: string) => `var(--md-sys-color-${n})`
const md = [
  'primary','on-primary','primary-container','on-primary-container','secondary','on-secondary',
  'secondary-container','on-secondary-container','tertiary','on-tertiary','tertiary-container',
  'on-tertiary-container','error','on-error','error-container','on-error-container','background',
  'on-background','surface','on-surface','surface-variant','on-surface-variant','outline',
  'outline-variant','inverse-surface','inverse-on-surface','inverse-primary','surface-dim',
  'surface-bright','surface-container-lowest','surface-container-low','surface-container',
  'surface-container-high','surface-container-highest','tertiary-fixed','tertiary-fixed-dim',
  'on-tertiary-fixed','primary-fixed','primary-fixed-dim',
]

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // shadcn semantic names -> Material 3 tokens from the supplied theme CSS
        background: t('surface'),
        foreground: t('on-surface'),
        card: { DEFAULT: t('surface-container-low'), foreground: t('on-surface') },
        popover: { DEFAULT: t('surface-container-high'), foreground: t('on-surface') },
        primary: { DEFAULT: t('primary'), foreground: t('on-primary') },
        secondary: { DEFAULT: t('secondary-container'), foreground: t('on-secondary-container') },
        muted: { DEFAULT: t('surface-container'), foreground: t('on-surface-variant') },
        accent: { DEFAULT: t('tertiary-container'), foreground: t('on-tertiary-container') },
        destructive: { DEFAULT: t('error'), foreground: t('on-error') },
        border: t('outline-variant'),
        input: t('outline'),
        ring: t('primary'),
        md: Object.fromEntries(md.map((n) => [n, t(n)])),
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', '"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
} satisfies Config
