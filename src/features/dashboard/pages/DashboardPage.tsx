import { getYear, getMonth, format } from 'date-fns'
import {
  Wallet, TrendingUp, TrendingDown, DollarSign,
  Banknote, PiggyBank, BarChart2, HandCoins, CreditCard,
  BadgePercent, Coins,
} from 'lucide-react'
import type { AccountType } from '@/domain/types'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart, Bar, ResponsiveContainer, Tooltip as ReTooltip,
  XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { useSortedAccounts, useNetWorth } from '@/shared/hooks/useAccounts'
import { useMonthSummary, useTransactionsByMonth, useMonthlyNetFlow, useMonthlyBenefits, useYearBenefits, isCashFlow } from '@/shared/hooks/useTransactions'
import { formatMoney } from '@/domain/money'
import { getCategoryById } from '@/domain/categories'
import { formatDate } from '@/shared/utils/format'
import PageLoader from '@/shared/components/PageLoader'
import BankLogo from '@/shared/components/BankLogo'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { useT } from '@/shared/i18n'

const now   = new Date()
const YEAR  = getYear(now)
const MONTH = getMonth(now) + 1

const ACCOUNT_TYPE_META: Record<AccountType, { icon: LucideIcon; color: string }> = {
  checking:   { icon: Banknote,   color: '#3b82f6' },
  savings:    { icon: PiggyBank,  color: '#22c55e' },
  investment: { icon: BarChart2,  color: '#a78bfa' },
  cash:       { icon: HandCoins,  color: '#f59e0b' },
  credit:     { icon: CreditCard, color: '#ef4444' },
}

interface ListRowProps {
  icon: React.ReactNode
  label: string
  sublabel?: string
  value: React.ReactNode
}

function ListRow({ icon, label, sublabel, value }: ListRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 min-w-0 py-2.5">
      <div className="flex items-center gap-3 min-w-0 overflow-hidden">
        {icon}
        <div className="min-w-0 overflow-hidden">
          <p className="text-sm font-medium truncate">{label}</p>
          {sublabel && <p className="text-xs text-muted-foreground truncate">{sublabel}</p>}
        </div>
      </div>
      <div className="shrink-0">{value}</div>
    </div>
  )
}

export default function DashboardPage() {
  const t = useT()
  const netWorth                   = useNetWorth()
  const summary                    = useMonthSummary(YEAR, MONTH)
  const { data: transactions = [], isLoading: txLoading  } = useTransactionsByMonth(YEAR, MONTH)
  const { data: accounts     = [], isLoading: accLoading } = useSortedAccounts()
  const { data: barData       = [] } = useMonthlyNetFlow(YEAR, MONTH)
  const { data: benefitsData  = [] } = useMonthlyBenefits(YEAR, MONTH)
  const { data: yearBenefits      } = useYearBenefits(YEAR)

  // Cashback (virtual — computed from expenses × cashbackPct)
  const cashbackMonth = transactions
    .filter(t => t.type === 'expense' && t.amount < 0 && t.category !== 'roundup' && t.category !== 'cashback')
    .reduce((s, t) => {
      const acc = accounts.find(a => a.id === t.accountId)
      if (!acc?.cashbackPct) return s
      return s + Math.floor(Math.abs(t.amount) * acc.cashbackPct / 100)
    }, 0)
  const roundupMonth = transactions.filter(t => t.category === 'roundup').reduce((s, t) => s + Math.abs(t.amount), 0)
  const hasBenefits  = accounts.some(a => a.cashbackPct || a.roundupMultiplier)

  // Net worth breakdown by account type
  const netWorthByType = (() => {
    const map: Partial<Record<AccountType, number>> = {}
    for (const a of accounts) map[a.type] = (map[a.type] ?? 0) + a.balance
    return (Object.entries(map) as [AccountType, number][])
      .filter(([, v]) => v !== 0)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  })()
  const positiveTotal = netWorthByType.filter(([, v]) => v > 0).reduce((s, [, v]) => s + v, 0)

  // Spending by category
  const categoryData = (() => {
    const map: Record<string, number> = {}
    for (const tx of transactions) {
      if (!isCashFlow(tx) || tx.amount >= 0) continue
      map[tx.category] = (map[tx.category] ?? 0) + Math.abs(tx.amount)
    }
    return Object.entries(map)
      .map(([id, value]) => { const cat = getCategoryById(id); return { name: cat.label, value, color: cat.color } })
      .sort((a, b) => b.value - a.value)
  })()
  const categoryTotal = categoryData.reduce((s, d) => s + d.value, 0)

  // Savings rate
  const savingsRate = summary.personalIncome > 0
    ? Math.round((summary.personalBalance / summary.personalIncome) * 100)
    : null

  // Top 5 expenses
  const topExpenses = transactions
    .filter(t => isCashFlow(t) && t.amount < 0)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 5)

  const isLoading = accLoading || txLoading

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{format(now, 'MMMM yyyy')}</p>
      </div>

      {isLoading && <PageLoader message={t('dashboard.loading')} />}
      {isLoading ? null : (<>

      {/* Row 1: Net Worth | Month Summary | Account Balances (+ Perks on mobile only) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

        {/* Net Worth */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.netWorth')}</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-3">{formatMoney(netWorth)}</div>
            {netWorthByType.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('dashboard.noAccounts')}</p>
            ) : (
              <div className="space-y-2">
                {netWorthByType.map(([type, balance]) => {
                  const meta = ACCOUNT_TYPE_META[type]
                  const Icon = meta.icon
                  const pct  = positiveTotal > 0 && balance > 0
                    ? Math.round((balance / positiveTotal) * 100) : null
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3 w-3 shrink-0" style={{ color: meta.color }} />
                          <span className="text-muted-foreground">{t(('accounts.types.' + type) as Parameters<typeof t>[0])}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-medium ${balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                            {formatMoney(balance)}
                          </span>
                          {pct != null && <span className="text-muted-foreground w-7 text-right">{pct}%</span>}
                        </div>
                      </div>
                      {pct != null && (
                        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Month Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.monthSummary')}</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.personalBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {summary.personalBalance >= 0 ? '+' : ''}{formatMoney(summary.personalBalance)}
            </div>
            {savingsRate != null && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {savingsRate >= 0
                  ? t('dashboard.savedPct', { rate: String(savingsRate) })
                  : t('dashboard.overspentPct', { rate: String(Math.abs(savingsRate)) })}
              </p>
            )}
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-muted-foreground">{t('dashboard.income')}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-emerald-600">+{formatMoney(summary.personalIncome)}</span>
                  {summary.personalIncome !== summary.income && (
                    <p className="text-xs text-muted-foreground">{t('dashboard.total')} {formatMoney(summary.income)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                  <span className="text-muted-foreground">{t('dashboard.expenses')}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-rose-600">-{formatMoney(Math.abs(summary.personalExpenses))}</span>
                  {summary.personalExpenses !== summary.expenses && (
                    <p className="text-xs text-muted-foreground">{t('dashboard.total')} {formatMoney(Math.abs(summary.expenses))}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Balances */}
        <Card className="sm:col-span-2 xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.accountBalances')}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">{t('dashboard.noAccounts')}</p>
            ) : accounts.map(account => {
              const meta = ACCOUNT_TYPE_META[account.type]
              const Icon = meta.icon
              const bank = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
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
                    <span className={`text-sm font-medium tabular-nums ${account.balance < 0 ? 'text-rose-600' : ''}`}>
                      {formatMoney(account.balance)}
                    </span>
                  }
                />
              )
            })}
          </CardContent>
        </Card>

        {hasBenefits && (
          <Card className="lg:hidden sm:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t('dashboard.perks')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                    <BadgePercent className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('dashboard.cashback')}</p>
                    <p className="text-base font-bold">{formatMoney(cashbackMonth)}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.ytd')}: {formatMoney(yearBenefits?.cashback ?? 0)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-500/10">
                    <Coins className="h-4 w-4 text-stone-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('dashboard.roundup')}</p>
                    <p className="text-base font-bold">{formatMoney(roundupMonth)}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.ytd')}: {formatMoney(yearBenefits?.roundup ?? 0)}</p>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={benefitsData} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis width={50} tick={{ fontSize: 11 }} tickFormatter={v => formatMoney(v).replace(/[^0-9,.-]/g, '')} />
                  <ReTooltip formatter={(v: number | undefined, name: string | undefined) => [v != null ? formatMoney(v) : '', name ?? '']} />
                  <Line type="monotone" dataKey="cashback" name={t('dashboard.cashback')} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="roundup"  name={t('dashboard.roundup')}  stroke="#78716c" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 2: Income vs Expenses bar chart | Spending by Category ranked bars */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Income vs Expenses grouped bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('dashboard.incomeVsExpenses')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis width={50} tick={{ fontSize: 11 }} tickFormatter={v => formatMoney(v).replace(/[^0-9,.-]/g, '')} />
                <ReTooltip formatter={(v: number | undefined) => v != null ? formatMoney(v) : ''} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income"   name={t('dashboard.income')}   fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expenses" name={t('dashboard.expenses')} fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Spending by Category — horizontal ranked bars */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('dashboard.spendingByCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('dashboard.noExpenses')}</p>
            ) : (
              <div className="space-y-3">
                {categoryData.slice(0, 7).map(d => {
                  const pct = categoryTotal > 0 ? Math.round((d.value / categoryTotal) * 100) : 0
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatMoney(d.value)}</span>
                          <span className="text-muted-foreground w-7 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Top Expenses (+ Perks on desktop only) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={!hasBenefits ? 'lg:col-span-2' : ''}>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('dashboard.topExpenses')}</CardTitle>
          </CardHeader>
          <CardContent>
            {topExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dashboard.noExpenses')}</p>
            ) : (
              <div className="divide-y divide-border">
                {topExpenses.map(tx => {
                  const cat = getCategoryById(tx.category)
                  return (
                    <ListRow
                      key={tx.id}
                      icon={<span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />}
                      label={tx.description || cat.label}
                      sublabel={`${cat.label} · ${formatDate(tx.date)}`}
                      value={
                        <span className="text-sm font-semibold text-rose-600 tabular-nums">
                          {formatMoney(tx.amount)}
                        </span>
                      }
                    />
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {hasBenefits && (
          <Card className="hidden lg:block">
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t('dashboard.perks')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                    <BadgePercent className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('dashboard.cashback')}</p>
                    <p className="text-base font-bold">{formatMoney(cashbackMonth)}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.ytd')}: {formatMoney(yearBenefits?.cashback ?? 0)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-500/10">
                    <Coins className="h-4 w-4 text-stone-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('dashboard.roundup')}</p>
                    <p className="text-base font-bold">{formatMoney(roundupMonth)}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.ytd')}: {formatMoney(yearBenefits?.roundup ?? 0)}</p>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={benefitsData} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis width={50} tick={{ fontSize: 11 }} tickFormatter={v => formatMoney(v).replace(/[^0-9,.-]/g, '')} />
                  <ReTooltip formatter={(v: number | undefined, name: string | undefined) => [v != null ? formatMoney(v) : '', name ?? '']} />
                  <Line type="monotone" dataKey="cashback" name={t('dashboard.cashback')} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="roundup"  name={t('dashboard.roundup')}  stroke="#78716c" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      </>)}
    </div>
  )
}
