import { Check } from 'lucide-react'
import { formatMoney } from '@/domain/money'
import { accountGradient } from '@/shared/utils/accountGradient'
import { BANK_OPTIONS } from '@/shared/config/banks'
import BankLogo from '@/shared/components/BankLogo'
import { cn } from '@/lib/utils'
import type { Account } from '@/domain/types'
import type { AccountStats } from '../hooks/useInvestmentsPageModel'
import { useCarouselScroll, CAROUSEL_GAP } from '../hooks/useCarouselScroll'

// CSS max() for visual alignment with max-w-4xl p-6 content sections
const EDGE_PADDING = 'max(calc((100vw - 56rem) / 2 + 1.5rem), 1.5rem)'

interface Props {
  accounts:   Account[]
  statsMap:   Record<number, AccountStats>
  selectedId: number | null
  onSelect:   (id: number) => void
}

export default function InvestmentAccountSelector({ accounts, statsMap, selectedId, onSelect }: Props) {
  const { containerRef, cardRefs, cardWidth, handleCardClick, onPointerDown, onPointerMove, onPointerUp } =
    useCarouselScroll({ count: accounts.length, selectedId, onSelect })

  if (accounts.length <= 1) return null

  return (
    <div className="space-y-3">
      {/* ── Full-bleed carousel ───────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="overflow-x-auto scrollbar-hide select-none"
        style={{
          width:         '100vw',
          marginLeft:    'calc(50% - 50vw)',
          paddingLeft:   EDGE_PADDING,
          paddingRight:  EDGE_PADDING,
          paddingTop:    '0.375rem',
          paddingBottom: '0.375rem',
          display:       'flex',
          gap:           `${CAROUSEL_GAP}px`,
          cursor:        'grab',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {accounts.map(account => (
          <AccountSelectorCard
            key={account.id}
            account={account}
            stats={statsMap[account.id!] ?? { marketValue: 0, pnl: 0, pnlPct: 0 }}
            selected={account.id === selectedId}
            width={cardWidth}
            cardRef={el => {
              if (el) cardRefs.current.set(account.id!, el)
              else cardRefs.current.delete(account.id!)
            }}
            onClick={() => handleCardClick(account.id!)}
          />
        ))}
      </div>

      {/* ── Navigation dots ──────────────────────────────────────────────── */}
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

// ── Private card component ────────────────────────────────────────────────────

interface CardProps {
  account:  Account
  stats:    AccountStats
  selected: boolean
  width:    number
  cardRef:  (el: HTMLButtonElement | null) => void
  onClick:  () => void
}

function AccountSelectorCard({ account, stats, selected, width, cardRef, onClick }: CardProps) {
  const bank  = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
  const isPos = stats.pnl >= 0
  const sign  = isPos ? '+' : ''

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={onClick}
      style={{ background: accountGradient(account.color), width: `${width}px`, flexShrink: 0, scrollSnapAlign: 'center' }}
      className={cn(
        'relative rounded-2xl p-4 text-left',
        'transition-[box-shadow,opacity] duration-200 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
        selected ? 'shadow-xl ring-[2.5px] ring-white/80' : 'opacity-60 hover:opacity-85',
      )}
    >
      <div className={cn(
        'absolute top-3 right-3 h-5 w-5 rounded-full flex items-center justify-center transition-opacity duration-200',
        selected ? 'bg-white/25 opacity-100' : 'opacity-0',
      )}>
        <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
      </div>

      <div className="flex items-center gap-2 mb-3 pr-6">
        <div className="h-7 w-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          {bank ? (
            <BankLogo
              domain={bank.logoDomain} name={bank.name} accountType={account.type}
              imgClassName="h-4 w-4 object-contain" iconClassName="h-3.5 w-3.5 text-white/80"
            />
          ) : (
            <div className="h-2.5 w-2.5 rounded-full bg-white/70" />
          )}
        </div>
        <p className="text-xs text-white/70 truncate leading-tight">{bank?.name ?? account.currency}</p>
      </div>

      <p className="text-sm font-semibold text-white truncate leading-snug mb-3">{account.name}</p>

      <div className="h-px bg-white/15 mb-3" />

      <p className="text-lg font-bold tabular-nums text-white leading-none">
        {formatMoney(stats.marketValue, account.currency)}
      </p>

      <div className={cn('flex items-center gap-1.5 mt-1.5', isPos ? 'text-emerald-300' : 'text-rose-300')}>
        <span className="text-xs tabular-nums font-medium">{sign}{stats.pnlPct.toFixed(1)}%</span>
        <span className="text-xs text-white/40">·</span>
        <span className="text-xs tabular-nums text-white/60">
          {sign}{formatMoney(Math.abs(stats.pnl), account.currency)}
        </span>
      </div>
    </button>
  )
}
