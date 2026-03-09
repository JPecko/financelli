import { useCallback } from 'react'
import { useLanguageStore } from '@/shared/store/languageStore'
import { en } from './translations/en'
import { pt } from './translations/pt'

export type { Language } from '@/shared/store/languageStore'

const TRANSLATIONS = { en, pt } as const

// ---------------------------------------------------------------------------
// Type-safe dot-path keys derived from `en` (source of truth).
// Adding a new key to en.ts will automatically make it available to useT().
// ---------------------------------------------------------------------------
type DotPaths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? (P extends '' ? K : `${P}.${K}`)
    : T[K] extends Record<string, unknown>
    ? DotPaths<T[K], P extends '' ? K : `${P}.${K}`>
    : never
}[keyof T & string]

export type TKey = DotPaths<typeof en>

// ---------------------------------------------------------------------------
// Resolve a dot-path key against a translation object.
// Falls back to the key itself if the path is missing (shouldn't happen when
// pt.ts is typed as `typeof en`, but safe for runtime).
// ---------------------------------------------------------------------------
function resolve(obj: unknown, path: string): string {
  const result = path
    .split('.')
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], obj)
  return typeof result === 'string' ? result : path
}

// Simple {{variable}} interpolation
function interpolate(str: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, v), str)
}

// ---------------------------------------------------------------------------
// useT — main hook. Call once per component, memoised per language change.
//
// Usage:
//   const t = useT()
//   t('nav.dashboard')                        // → 'Dashboard' | 'Dashboard'
//   t('accounts.title')                       // → 'Accounts' | 'Contas'
//   t('dashboard.netWorth')                   // type-safe autocomplete
// ---------------------------------------------------------------------------
export function useT() {
  const lang = useLanguageStore((s) => s.lang)
  const dict = TRANSLATIONS[lang]

  return useCallback(
    (key: TKey, vars?: Record<string, string>): string => {
      const str = resolve(dict, key)
      return vars ? interpolate(str, vars) : str
    },
    [dict],
  )
}
