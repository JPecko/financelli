import { useRef, useEffect } from 'react'
import { Check } from 'lucide-react'
import { formatMoney } from '@/domain/money'
import { accountGradient } from '@/shared/utils/accountGradient'
import { BANK_OPTIONS } from '@/shared/config/banks'
import BankLogo from '@/shared/components/BankLogo'
import { cn } from '@/lib/utils'
import type { Account } from '@/domain/types'
import type { AccountStats } from '../hooks/useInvestmentsPageModel'

// Matches InvestmentsPage: max-w-4xl (56rem) + p-6 (1.5rem).
// The padding aligns the first card with the page sections on all screen widths:
//   narrow  → max(..., 1.5rem) clamps to the page's p-6
//   wide    → (100vw - 56rem) / 2 + 1.5rem matches the auto-margin + p-6 offset
const EDGE_PADDING = 'max(calc((100vw - 56rem) / 2 + 1.5rem), 1.5rem)'

interface Props {
  accounts:   Account[]
  statsMap:   Record<number, AccountStats>
  selectedId: number | null
  onSelect:   (id: number) => void
}

export default function InvestmentAccountSelector({ accounts, statsMap, selectedId, onSelect }: Props) {
  if (accounts.length <= 1) return null

  const cardRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  useEffect(() => {
    if (selectedId == null) return
    cardRefs.current.get(selectedId)?.scrollIntoView({
      behavior: 'smooth',
      inline:   'center',
      block:    'nearest',
    })
  }, [selectedId])

  return (
    <div className="space-y-3">
      {/* Full-bleed scroll container — breaks out of parent padding to reach viewport edges */}
      <div
        className="overflow-x-auto scrollbar-hide"
        style={{
          width:         '100vw',
          marginLeft:    'calc(50% - 50vw)',
          paddingLeft:   EDGE_PADDING,
          paddingRight:  EDGE_PADDING,
          paddingTop:    '0.25rem',
          paddingBottom: '0.25rem',
        }}
      >
        <div className="flex gap-3">
          {accounts.map(account => {
            const stats    = statsMap[account.id!] ?? { marketValue: 0, pnl: 0, pnlPct: 0 }
            const bank     = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
            const selected = account.id === selectedId
            const isPos    = stats.pnl >= 0
            const sign     = isPos ? '+' : ''

            return (
              <button
                key={account.id}
                ref={el => { if (el) cardRefs.current.set(account.id!, el); else cardRefs.current.delete(account.id!) }}
                type="button"
                onClick={() => onSelect(account.id!)}
                style={{ background: accountGradient(account.color) }}
                className={cn(
                  'group relative flex-shrink-0 w-48 rounded-2xl p-4 text-left',
                  'transition-all duration-200 ease-out',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                  selected
                    ? 'shadow-xl ring-[2.5px] ring-white/80'
                    : 'opacity-60 hover:opacity-85 hover:shadow-lg hover:scale-[1.01]',
                )}
              >
                {/* Selected checkmark */}
                <div className={cn(
                  'absolute top-3 right-3 h-5 w-5 rounded-full flex items-center justify-center',
                  'transition-all duration-200',
                  selected ? 'bg-white/25 opacity-100' : 'opacity-0',
                )}>
                  <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                </div>

                {/* Logo + bank name */}
                <div className="flex items-center gap-2 mb-3 pr-6">
                  <div className="h-7 w-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    {bank ? (
                      <BankLogo
                        domain={bank.logoDomain}
                        name={bank.name}
                        accountType={account.type}
                        imgClassName="h-4 w-4 object-contain"
                        iconClassName="h-3.5 w-3.5 text-white/80"
                      />
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full bg-white/70" />
                    )}
                  </div>
                  <p className="text-xs text-white/70 truncate leading-tight">
                    {bank?.name ?? account.currency}
                  </p>
                </div>

                {/* Account name */}
                <p className="text-sm font-semibold text-white truncate leading-snug mb-3">
                  {account.name}
                </p>

                <div className="h-px bg-white/15 mb-3" />

                {/* Market value */}
                <p className="text-lg font-bold tabular-nums text-white leading-none">
                  {formatMoney(stats.marketValue, account.currency)}
                </p>

                {/* P&L */}
                <div className={cn(
                  'flex items-center gap-1.5 mt-1.5',
                  isPos ? 'text-emerald-300' : 'text-rose-300',
                )}>
                  <span className="text-xs tabular-nums font-medium">{sign}{stats.pnlPct.toFixed(1)}%</span>
                  <span className="text-xs text-white/40">·</span>
                  <span className="text-xs tabular-nums text-white/60">
                    {sign}{formatMoney(Math.abs(stats.pnl), account.currency)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center items-center gap-2">
        {accounts.map(account => (
          <button
            key={account.id}
            type="button"
            onClick={() => onSelect(account.id!)}
            aria-label={account.name}
            className={cn(
              'h-1.5 rounded-full transition-all duration-200',
              account.id === selectedId
                ? 'w-5 bg-foreground'
                : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60',
            )}
          />
        ))}
      </div>
    </div>
  )
}
