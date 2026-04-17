import { useNavigate } from 'react-router-dom'
import { ExternalLink, Users } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import AccountPill from '@/shared/components/AccountPill'
import { formatMoney } from '@/domain/money'
import { formatDate } from '@/shared/utils/format'
import { getCategoryById, tCategory } from '@/domain/categories'
import { useT } from '@/shared/i18n'
import type { Account, GroupExpenseItem } from '@/domain/types'
import { TRANSACTIONS_GRID_COLS } from './TransactionRow'

const ROW_BASE_CLASS =
  `relative px-4 py-3 transition-colors group flex items-center gap-3 lg:grid ${TRANSACTIONS_GRID_COLS} lg:gap-x-3 lg:items-center`

interface Props {
  item:         GroupExpenseItem
  accountsById: Record<number, Account>
}

function GroupBadge({ groupName }: { groupName: string }) {
  return (
    <Badge
      variant="secondary"
      className="h-5 shrink-0 border-violet-500/50 px-1.5 py-0 text-xs text-violet-600 dark:text-violet-400"
    >
      <Users className="mr-1 h-3 w-3" />
      {groupName}
    </Badge>
  )
}

export default function GroupExpenseRow({ item, accountsById }: Props) {
  const t        = useT()
  const navigate = useNavigate()
  const cat      = getCategoryById(item.category)

  return (
    <div className={ROW_BASE_CLASS} style={{ backgroundColor: `${cat.color}12` }}>
      <div className="absolute inset-0 bg-foreground/[0.04] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Date */}
      <span className="hidden lg:block text-sm text-muted-foreground">{formatDate(item.date)}</span>

      {/* Description + group badge — desktop */}
      <div className="hidden lg:block min-w-0">
        <p className="truncate text-sm font-semibold leading-snug">{item.description || '—'}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <GroupBadge groupName={item.groupName} />
        </div>
      </div>

      {/* Account column — desktop */}
      <div className="hidden lg:block min-w-0 text-sm text-muted-foreground truncate">
        {item.paidByMe && item.paymentAccountId != null
          ? <AccountPill accountId={item.paymentAccountId} accountsById={accountsById} />
          : item.paidByMe ? t('groups.iPaid') : item.paidByName}
      </div>

      {/* Category — desktop */}
      <div className="hidden lg:flex items-center">
        <Badge
          variant="secondary"
          className="text-xs px-1.5 py-0 h-5 max-w-full truncate"
          style={{ borderLeft: `2px solid ${cat.color}` }}
        >
          {tCategory(cat.id, t)}
        </Badge>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden flex-1 min-w-0">
        <p className="truncate text-sm font-semibold leading-snug">{item.description || '—'}</p>
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <GroupBadge groupName={item.groupName} />
          <Badge
            variant="secondary"
            className="text-xs px-1.5 py-0 h-5 shrink-0"
            style={{ borderLeft: `2px solid ${cat.color}` }}
          >
            {tCategory(cat.id, t)}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground mt-1">{formatDate(item.date)}</div>
        <div className="text-sm text-muted-foreground mt-0.5 truncate">
          {item.paidByMe && item.paymentAccountId != null
            ? <AccountPill accountId={item.paymentAccountId} accountsById={accountsById} />
            : item.paidByMe ? t('groups.iPaid') : item.paidByName}
        </div>
      </div>

      {/* Amount — user's share, shown as expense */}
      <div className="shrink-0 lg:text-right">
        <span className="block text-sm font-semibold tabular-nums text-rose-600">
          -{formatMoney(item.myShare)}
        </span>
      </div>

      {/* Navigate to group */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        title={t('groups.goToGroups')}
        onClick={() => navigate(`/groups/${item.groupId}`)}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  )
}
