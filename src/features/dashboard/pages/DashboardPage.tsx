import { getYear, getMonth, format } from 'date-fns'
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, RefreshCw,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/data/db'
import { useAccounts, useNetWorth } from '@/shared/hooks/useAccounts'
import { useMonthSummary, useTransactionsByMonth } from '@/shared/hooks/useTransactions'
import { formatMoney } from '@/domain/money'
import { getCategoryById } from '@/domain/categories'
import { formatDate } from '@/shared/utils/format'
import StatCard from '@/shared/components/StatCard'

const now = new Date()
const YEAR  = getYear(now)
const MONTH = getMonth(now) + 1

export default function DashboardPage() {
  const netWorth    = useNetWorth()
  const summary     = useMonthSummary(YEAR, MONTH)
  const transactions = useTransactionsByMonth(YEAR, MONTH)
  const accounts    = useAccounts()

  // Upcoming recurring rules
  const upcomingRules = useLiveQuery(
    () => db.recurringRules
      .where('active').equals(1)
      .sortBy('nextDue')
      .then(rules => rules.slice(0, 5)),
    [],
  ) ?? []

  // Spending by category (expenses only)
  const categoryData = (() => {
    const map: Record<string, number> = {}
    for (const tx of transactions) {
      if (tx.amount >= 0) continue
      const key = tx.category
      map[key] = (map[key] ?? 0) + Math.abs(tx.amount)
    }
    return Object.entries(map)
      .map(([id, value]) => {
        const cat = getCategoryById(id)
        return { name: cat.label, value, color: cat.color }
      })
      .sort((a, b) => b.value - a.value)
  })()

  // Balance last 6 months (simplified — uses transactions per month)
  const last6MonthsData = (() => {
    const data = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(YEAR, MONTH - 1 - i, 1)
      data.push({ month: format(d, 'MMM'), balance: 0 }) // placeholder — real calc below
    }
    return data
  })()

  // Compute running balance per month using accounts current balance as anchor
  const lineData = useLiveQuery(async () => {
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(YEAR, MONTH - 1 - i, 1)
      const y = getYear(d)
      const m = getMonth(d) + 1
      const from = `${y}-${String(m).padStart(2, '0')}-01`
      const to   = `${y}-${String(m).padStart(2, '0')}-31`
      const txs = await db.transactions.where('date').between(from, to, true, true).toArray()
      const monthNet = txs.reduce((s, t) => s + t.amount, 0)
      result.push({ month: format(d, 'MMM yy'), net: monthNet })
    }
    return result
  }, []) ?? last6MonthsData.map(d => ({ month: d.month, net: 0 }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{format(now, 'MMMM yyyy')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Net Worth"
          value={formatMoney(netWorth)}
          icon={Wallet}
          subtitle={`${accounts.length} account${accounts.length !== 1 ? 's' : ''}`}
        />
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
