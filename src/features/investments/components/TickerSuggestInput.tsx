import { useState, useRef, useEffect, useMemo } from 'react'
import { Input } from '@/shared/components/ui/input'
import { POPULAR_TICKERS } from '../utils/simulatorHelpers'

interface Props {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function TickerSuggestInput({ id, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (q.length < 1) return []
    return POPULAR_TICKERS.filter(
      t => t.ticker.toLowerCase().includes(q) || t.name.toLowerCase().includes(q),
    ).slice(0, 8)
  }, [value])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={e => { onChange(e.target.value.toUpperCase()); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {suggestions.map(s => (
            <li key={s.ticker}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                onMouseDown={e => { e.preventDefault(); onChange(s.ticker); setOpen(false) }}
              >
                <span className="w-20 shrink-0 font-mono text-xs font-semibold">{s.ticker}</span>
                <span className="truncate text-xs text-muted-foreground">{s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
