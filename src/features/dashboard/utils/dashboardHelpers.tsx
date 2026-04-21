import { Banknote, PiggyBank, BarChart2, HandCoins, CreditCard, UtensilsCrossed } from 'lucide-react'
import { formatMoney } from '@/domain/money'
import type { AccountType } from '@/domain/types'
import type { LucideIcon } from 'lucide-react'

export const ACCOUNT_TYPE_META: Record<AccountType, { icon: LucideIcon; color: string }> = {
  checking:   { icon: Banknote,          color: '#3b82f6' },
  savings:    { icon: PiggyBank,         color: '#22c55e' },
  investment: { icon: BarChart2,         color: '#a78bfa' },
  cash:       { icon: HandCoins,         color: '#f59e0b' },
  credit:     { icon: CreditCard,        color: '#ef4444' },
  meal:       { icon: UtensilsCrossed,   color: '#f97316' },
}

export function formatTooltipValue(value: unknown): string {
  if (typeof value === 'number') return formatMoney(value)
  if (typeof value === 'string') return value
  return ''
}

interface ListRowProps {
  icon: React.ReactNode
  label: string
  sublabel?: string
  value: React.ReactNode
}

export function ListRow({ icon, label, sublabel, value }: ListRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 min-w-0 py-2.5">
      <div className="flex items-center gap-3 min-w-0 overflow-hidden">
        {icon}
        <div className="min-w-0 overflow-hidden">
          <p className="text-sm font-medium truncate">{label}</p>
          {sublabel && <p className="text-sm text-muted-foreground truncate">{sublabel}</p>}
        </div>
      </div>
      <div className="shrink-0">{value}</div>
    </div>
  )
}
