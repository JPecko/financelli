import { formatMoney } from '@/domain/money'
import BalanceValue from '@/shared/components/BalanceValue'
import AccountPill from '@/shared/components/AccountPill'
import GoalProgressBar from './GoalProgressBar'
import GoalHint from './GoalHint'
import { GOAL_TEXT } from '../utils/goalStatusStyles'
import type { GoalProgress } from '@/domain/savingsGoals'
import type { Account } from '@/domain/types'

interface Props {
  row:          GoalProgress
  accountsById: Record<number, Account>
  onClick:      () => void
}

export default function GoalRow({ row, accountsById, onClick }: Props) {
  const linked = row.goal.accountIds.filter(id => accountsById[id])

  return (
    <button type="button" onClick={onClick} className="w-full space-y-2 px-4 py-3 text-left transition-colors hover:bg-accent/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-medium">{row.goal.name}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {linked.map(id => <AccountPill key={id} accountId={id} accountsById={accountsById} />)}
          </div>
        </div>
        <BalanceValue>
          <span className="whitespace-nowrap text-sm tabular-nums">
            <span className="font-semibold">{formatMoney(row.current)}</span>
            <span className="text-muted-foreground"> / {row.isForecast && '~'}{formatMoney(row.target)}</span>
          </span>
        </BalanceValue>
      </div>
      <GoalProgressBar pct={row.pct} status={row.status} />
      <div className="flex items-center justify-between gap-2">
        <GoalHint row={row} />
        <span className={`shrink-0 text-xs font-medium tabular-nums ${GOAL_TEXT[row.status]}`}>{row.pct}%</span>
      </div>
    </button>
  )
}
