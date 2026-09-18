import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import PageHelpInfo from '@/shared/components/PageHelpInfo'
import BankLogo from '@/shared/components/BankLogo'
import BalanceValue from '@/shared/components/BalanceValue'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { ACCOUNT_TYPE_META, ACCOUNT_GROUP_COLOR, ListRow } from '../utils/dashboardHelpers'
import { accountGroup, type AccountGroup as AccountGroupKey } from '@/domain/accountGrouping'
import type { Account } from '@/domain/types'

interface Props {
  accounts:         Account[]
  effectiveBalances: Record<number, number>
  className?:       string
}

export default function AccountBalancesCard({ accounts, effectiveBalances, className }: Props) {
  const t = useT()

  const groups: { key: AccountGroupKey; title: string }[] = [
    { key: 'current',    title: t('accounts.sections.current') },
    { key: 'savings',    title: t('accounts.sections.savings') },
    { key: 'investment', title: t('accounts.sections.investment') },
  ]
  const groupedAccounts = groups
    .map(g => ({ ...g, accounts: accounts.filter(a => accountGroup(a.type) === g.key) }))
    .filter(g => g.accounts.length > 0)

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.accountBalances')}</CardTitle>
          <PageHelpInfo title={t('dashboard.sections.accountBalances.title')} body={t('dashboard.sections.accountBalances.body')} />
        </div>
      </CardHeader>
      <CardContent
        className="lg:grid lg:gap-4 lg:items-start"
        style={{ gridTemplateColumns: `repeat(${groupedAccounts.length || 1}, minmax(0, 1fr))` }}
      >
        {accounts.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{t('dashboard.noAccounts')}</p>
        ) : (
          groupedAccounts.map(group => (
            <AccountGroup
              key={group.key}
              title={group.title}
              accounts={group.accounts}
              effectiveBalances={effectiveBalances}
              color={ACCOUNT_GROUP_COLOR[group.key]}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function AccountGroup({ title, accounts, effectiveBalances, color }: Props & { title: string; color: string }) {
  const subtotal = accounts.reduce((sum, a) => sum + (effectiveBalances[a.id!] ?? a.balance), 0)

  return (
    <div
      className="mt-4 first:mt-0 lg:mt-0 rounded-lg border border-[color-mix(in_srgb,var(--group-color)_35%,var(--border))] bg-[color-mix(in_srgb,var(--group-color)_8%,var(--card))] p-4"
      style={{ '--group-color': color } as React.CSSProperties}
    >
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{title}</p>
          <BalanceValue>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">{formatMoney(subtotal)}</span>
          </BalanceValue>
        </div>
        <div className="divide-y divide-border">
          {accounts.map(account => {
            const meta    = ACCOUNT_TYPE_META[account.type]
            const Icon    = meta.icon
            const bank    = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
            const balance = effectiveBalances[account.id!] ?? account.balance
            return (
              <ListRow
                key={account.id}
                icon={bank ? (
                  <BankLogo
                    domain={bank.logoDomain}
                    name={bank.name}
                    accountType={account.type}
                    imgClassName="h-6 w-6 rounded-sm object-contain shrink-0"
                    iconClassName="h-5 w-5 shrink-0 text-muted-foreground"
                  />
                ) : (
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
                )}
                label={account.name}
                value={
                  <BalanceValue>
                    <span className={`text-sm font-medium tabular-nums ${balance < 0 ? 'text-rose-600' : ''}`}>
                      {formatMoney(balance)}
                    </span>
                  </BalanceValue>
                }
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
