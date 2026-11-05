import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/domain/money'
import BalanceValue from '@/shared/components/BalanceValue'
import AccountPill from '@/shared/components/AccountPill'
import type { Account } from '@/domain/types'

interface Props {
  accounts:     Account[]
  accountsById: Record<number, Account>
  balances:     Record<number, number>
  selected:     number[]
  onToggle:     (id: number) => void
}

export default function GoalAccountsPicker({ accounts, accountsById, balances, selected, onToggle }: Props) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-md border">
      {accounts.map(a => {
        const on = selected.includes(a.id!)
        return (
          <li key={a.id}>
            <button type="button" onClick={() => onToggle(a.id!)} className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm hover:bg-accent/50">
              <CheckBox on={on} />
              <span className="min-w-0 flex-1"><AccountPill accountId={a.id!} accountsById={accountsById} /></span>
              <BalanceValue>
                <span className="text-xs tabular-nums text-muted-foreground">{formatMoney(balances[a.id!] ?? 0)}</span>
              </BalanceValue>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function CheckBox({ on }: { on: boolean }) {
  return (
    <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}>
      {on && <Check className="h-3 w-3" />}
    </span>
  )
}
