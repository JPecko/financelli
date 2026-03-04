import { useState, useEffect } from 'react'
import { getYear, getMonth, format } from 'date-fns'
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, RefreshCw,
  Banknote, PiggyBank, BarChart2, HandCoins, CreditCard, Users,
} from 'lucide-react'
import type { AccountType } from '@/domain/types'
import type { LucideIcon } from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { useAccounts, useNetWorth } from '@/shared/hooks/useAccounts'
import { useMonthSummary, useTransactionsByMonth, isCashFlow } from '@/shared/hooks/useTransactions'
import { useRecurringRules } from '@/shared/hooks/useRecurringRules'
import { useRefresh } from '@/shared/hooks/useRefresh'
import { transactionsRepo } from '@/data/repositories/transactionsRepo'
import { formatMoney } from '@/domain/money'
import { getCategoryById } from '@/domain/categories'
import { formatDate } from '@/shared/utils/format'
import StatCard from '@/shared/components/StatCard'

const now = new Date()
const YEAR  = getYear(now)
const MONTH = getMonth(now) + 1

const ACCOUNT_TYPE_META: Record<AccountType, { label: string; icon: LucideIcon; color: string }> = {
  checking:   { label: 'Checking',    icon: Banknote,   color: '#3b82f6' },
  savings:    { label: 'Savings',     icon: PiggyBank,  color: '#22c55e' },
  investment: { label: 'Investments', icon: BarChart2,  color: '#a78bfa' },
  cash:       { label: 'Cash',        icon: HandCoins,  color: '#f59e0b' },
  credit:     { label: 'Credit',      icon: CreditCard, color: '#ef4444' },
}

export default function DashboardPage() {
  const netWorth     = useNetWorth()
  const summary      = useMonthSummary(YEAR, MONTH)
  const transactions = useTransactionsByMonth(YEAR, MONTH)
  const accounts     = useAccounts()
  const allRules     = useRecurringRules()
  const key          = useRefresh()

  const [lineData, setLineData] = useState<{ month: string; net: number }[]>([])

  useEffect(() => {
    const fetchLineData = async () => {
      const result: { month: string; net: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(YEAR, MONTH - 1 - i, 1)
        const y = getYear(d)
        const m = getMonth(d) + 1
        const txs = await transactionsRepo.getByMonth(y, m)
        const monthNet = txs.filter(isCashFlow).reduce((s, t) => s + t.amount, 0)
        result.push({ month: format(d, 'MMM yy'), net: monthNet })
      }
      setLineData(result)
    }
    fetchLineData()
  }, [key])

  // Upcoming active rules (top 5 by next due)
  const upcomingRules = allRules.filter(r => r.active).slice(0, 5)

  // Net worth breakdown by account type
  const netWorthByType = (() => {
    const map: Partial<Record<AccountType, number>> = {}
    for (const a of accounts) {
      map[a.type] = (map[a.type] ?? 0) + a.balance
    }
    return (Object.entries(map) as [AccountType, number][])
      .filter(([, v]) => v !== 0)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  })()

  const positiveTotal = netWorthByType
    .filter(([, v]) => v > 0)
    .reduce((s, [, v]) => s + v, 0)

  // Spending by category (real expenses only)
  const categoryData = (() => {
    const map: Record<string, number> = {}
    for (const tx of transactions) {
      if (!isCashFlow(tx) || tx.amount >= 0) continue
      map[tx.category] = (map[tx.category] ?? 0) + Math.abs(tx.amount)
    }
    return Object.entries(map)
      .map(([id, value]) => {
        const cat = getCategoryById(id)
        return { name: cat.label, value, color: cat.color }
      })
      .sort((a, b) => b.value - a.value)
  })()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{format(now, 'MMMM yyyy')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

        {/* Net Worth — breakdown by type */}
        <Card className="sm:col-span-2 xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-3">{formatMoney(netWorth)}</div>
            {netWorthByType.length === 0 ? (
              <p className="text-xs text-muted-foreground">No accounts yet</p>
            ) : (
              <div className="space-y-2">
                {netWorthByType.map(([type, balance]) => {
                  const meta = ACCOUNT_TYPE_META[type]
                  const Icon = meta.icon
                  const pct  = positiveTotal > 0 && balance > 0
                    ? Math.round((balance / positiveTotal) * 100)
                    : null
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3 w-3 shrink-0" style={{ color: meta.color }} />
                          <span className="text-muted-foreground">{meta.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-medium ${balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}
                          >
                            {formatMoney(balance)}
                          </span>
                          {pct != null && (
                            <span className="text-muted-foreground w-7 text-right">{pct}%</span>
                          )}
                        </div>
                      </div>
                      {pct != null && (
                        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: meta.color }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <StatCard
          title="Monthly Income"
          value={formatMoney(summary.income)}
          icon={TrendingUp}
          trend="up"
          subtitle={format(now, 'MMMM')}
        />
        <StatCard
          title="Monthly Expenses"
          value={formatMoney(Math.abs(summary.expenses))}
          icon={TrendingDown}
          trend="down"
          subtitle={format(now, 'MMMM')}
        />
        <StatCard
          title="Month Balance"
          value={formatMoney(summary.balance)}
          icon={DollarSign}
          trend={summary.balance >= 0 ? 'up' : 'down'}
          subtitle="Income − Expenses"
        />
        <StatCard
          title="Personal Expenses"
          value={formatMoney(Math.abs(summary.personalExpenses))}
          icon={Users}
          trend="down"
          subtitle="My share of expenses"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Spending by category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No expenses this month</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip
                      formatter={(v: number | undefined) => v != null ? formatMoney(v) : ''}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {categoryData.slice(0, 6).map(d => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-medium">{formatMoney(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly net flow */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Monthly Net Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatMoney(v).replace(/[^0-9,.-]/g, '')} />
                <ReTooltip formatter={(v: number | undefined) => [v != null ? formatMoney(v) : '', 'Net']} />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming recurring */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Upcoming Recurring
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingRules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recurring rules set up.</p>
          ) : (
            <div className="space-y-3">
              {upcomingRules.map(rule => {
                const cat = getCategoryById(rule.category)
                return (
                  <div key={rule.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <RefreshCw className="h-4 w-4" style={{ color: cat.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{rule.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Due {formatDate(rule.nextDue)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">{rule.frequency}</Badge>
                      <span className={`text-sm font-semibold ${rule.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {rule.amount >= 0 ? '+' : ''}{formatMoney(rule.amount)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
