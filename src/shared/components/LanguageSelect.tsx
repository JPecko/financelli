import { useRef, useState, useEffect } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguageStore, type Language } from '@/shared/store/languageStore'

// ── Constants ─────────────────────────────────────────────────────────────────

const LANGS = [
  { value: 'en' as Language, flag: '🇬🇧', label: 'English', code: 'EN' },
  { value: 'pt' as Language, flag: '🇵🇹', label: 'Português', code: 'PT' },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /** 'sm' for sidebar/header icon rows; 'default' for settings page */
  size?:    'sm' | 'default'
  /** open dropdown upward (use when near the bottom of the screen) */
  dropUp?:  boolean
  /** align dropdown to right edge of trigger (use when trigger is right-aligned) */
  align?:   'left' | 'right'
  className?: string
}

// ── LanguageSelect ────────────────────────────────────────────────────────────

export default function LanguageSelect({ size = 'sm', dropUp = false, align = 'left', className }: Props) {
  const { lang, setLang } = useLanguageStore()
  const [open, setOpen]   = useState(false)
  const rootRef           = useRef<HTMLDivElement>(null)

  const current = LANGS.find(l => l.value === lang) ?? LANGS[0]

  useEffect(() => {
    if (!open) return
    const onMouse = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const isDefault = size === 'default'

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(p => !p)}
        className={cn(
          'flex items-center gap-1.5 rounded-md font-medium transition-colors',
          isDefault
            ? 'h-9 px-3 text-sm border border-input bg-background text-foreground shadow-xs hover:bg-accent/40 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20'
            : 'h-7 px-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
      >
        <span className="leading-none">{current.flag}</span>
        <span>{current.code}</span>
        <ChevronDown className={cn('shrink-0 transition-transform', isDefault ? 'h-4 w-4' : 'h-3 w-3', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-lg min-w-[10rem]',
          align === 'right' ? 'right-0' : 'left-0',
            dropUp ? 'bottom-[calc(100%+0.35rem)]' : 'top-[calc(100%+0.35rem)]',
          )}
        >
          <div role="listbox" className="p-1.5">
            {LANGS.map(l => (
              <button
                key={l.value}
                type="button"
                role="option"
                aria-selected={l.value === lang}
                data-selected={l.value === lang}
                onClick={() => { setLang(l.value); setOpen(false) }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm rounded-lg transition-colors hover:bg-accent/70 data-[selected=true]:bg-accent/70"
              >
                <span className="flex items-center gap-2">
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                </span>
                <Check className={cn('h-4 w-4 shrink-0 text-primary', l.value !== lang && 'invisible')} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
