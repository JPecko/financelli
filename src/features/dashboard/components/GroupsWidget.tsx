import { useNavigate } from 'react-router-dom'
import { ArrowRight, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { useGroups, useGroupMembers, useGroupEntries, useGroupSplits, useGroupBalances } from '@/shared/hooks/useGroups'
import { formatMoney } from '@/domain/money'
import { getCategoryById } from '@/domain/categories'
import { useAuth } from '@/features/auth/AuthContext'
import { useT } from '@/shared/i18n'
import type { Group } from '@/domain/types'

// ---- Per-group mini card ----------------------------------------

function GroupBalanceSummary({ group }: { group: Group }) {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const { data: members = [] } = useGroupMembers(group.id!)
  const { data: entries = [] } = useGroupEntries(group.id!)
  const { data: _splits = [] } = useGroupSplits(group.id!)
  const { balances, debts }    = useGroupBalances(group.id!)

  const myMember  = members.find(m => m.userId === user?.id)
  const myBalance = myMember ? balances.find(b => b.memberId === myMember.id) : undefined

  // Last 5 entries
  const latestEntries = entries.slice(0, 5)

  return (
    <div className="space-y-3">
      {/* Group header row */}
      <button
        onClick={() => navigate(`/groups/${group.id}`)}
        className="w-full flex items-center gap-2 group text-left"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="flex-1 truncate text-base font-medium transition-colors group-hover:text-primary sm:text-sm">{group.name}</span>
        {myBalance && (
          <span className={`shrink-0 text-base font-semibold tabular-nums sm:text-sm ${myBalance.net > 0 ? 'text-emerald-600' : myBalance.net < 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
            {myBalance.net >= 0 ? '+' : ''}{formatMoney(myBalance.net)}
          </span>
        )}
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Simplified debts */}
      {debts.length > 0 && (
        <div className="pl-3 space-y-1">
          {debts.slice(0, 3).map((d, i) => (
            <div key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground sm:text-xs">
              <span className="truncate max-w-[70px] font-medium text-foreground">{d.fromMemberName}</span>
              <ArrowRight className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[70px] font-medium text-foreground">{d.toMemberName}</span>
              <span className="ml-auto tabular-nums font-medium text-foreground shrink-0">{formatMoney(d.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Latest entries */}
      {latestEntries.length > 0 && (
        <div className="pl-3 space-y-1">
          {latestEntries.map(entry => {
            const cat = getCategoryById(entry.category)
            return (
              <div key={entry.id} className="flex items-center gap-2 text-sm sm:text-xs">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="flex-1 truncate text-muted-foreground">{entry.description}</span>
                <span className="font-medium tabular-nums shrink-0">{formatMoney(entry.totalAmount)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- Widget ----------------------------------------------------

export default function GroupsWidget() {
  const t      = useT()
  const navigate = useNavigate()
  const { data: groups = [], isLoading } = useGroups()

  if (isLoading || groups.length === 0) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium text-muted-foreground sm:text-sm">{t('groups.widgetTitle')}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-sm sm:text-xs"
          onClick={() => navigate('/groups')}
        >
          {t('common.open')} <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-5 divide-y divide-border">
        {groups.map((group, i) => (
          <div key={group.id} className={i > 0 ? 'pt-5' : ''}>
            <GroupBalanceSummary group={group} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
