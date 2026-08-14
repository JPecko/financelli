import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import BankLogo from '@/shared/components/BankLogo'
import BalanceValue from '@/shared/components/BalanceValue'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { ACCOUNT_TYPE_META, ListRow } from '../utils/dashboardHelpers'
import { accountGroup } from '@/domain/accountGrouping'
import type { Account } from '@/domain/types'

interface Props {
  accounts:         Account[]
  effectiveBalances: Record<number, number>
}

export default function AccountBalancesCard({ accounts, effectiveBalances }: Props) {
  const t = useT()

  const currentAccounts    = accounts.filter(a => accountGroup(a.type) === 'current')
  const savingsAccounts    = accounts.filter(a => accountGroup(a.type) === 'savings')
  const investmentAccounts = accounts.filter(a => accountGroup(a.type) === 'investment')

  return (
    <Card className="sm:col-span-2 xl:col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.accountBalances')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{t('dashboard.noAccounts')}</p>
        ) : (
          <>
            {currentAccounts.length > 0 && (
              <AccountGroup title={t('accounts.sections.current')} accounts={currentAccounts} effectiveBalances={effectiveBalances} />
            )}
            {savingsAccounts.length > 0 && (
              <AccountGroup title={t('accounts.sections.savings')} accounts={savingsAccounts} effectiveBalances={effectiveBalances} />
            )}
            {investmentAccounts.length > 0 && (
              <AccountGroup title={t('accounts.sections.investment')} accounts={investmentAccounts} effectiveBalances={effectiveBalances} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function AccountGroup({ title, accounts, effectiveBalances }: Props & { title: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{title}</p>
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
  )
}
