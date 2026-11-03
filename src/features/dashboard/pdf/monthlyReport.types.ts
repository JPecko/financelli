import type { BudgetStatus } from '@/domain/budgets'

export interface MonthlyReportCategory {
  name: string
  color: string
  value: number
  pct: number
}

export interface MonthlyReportAccount {
  name: string
  type: string
  balance: number
  previousBalance: number | null
  delta: number | null
}

export interface MonthlyReportNetWorthPoint {
  label: string
  value: number
  delta: number
  partial: boolean   // an investment account had no recorded value for this or the previous month
  estimated: boolean // investment value estimated from purchase/price history
}

export interface MonthlyReportBudget {
  name:   string
  color:  string
  limit:  number
  spent:  number
  pct:    number
  status: BudgetStatus
}

export interface MonthlyReportBudgets {
  rows:  MonthlyReportBudget[]
  total: Omit<MonthlyReportBudget, 'name' | 'color'>
}

export interface MonthlyReportExpense {
  description: string
  category: string
  amount: number
}

export interface MonthlyReportNetWorthGroup {
  label: string
  value: number
}

export interface MonthlyReportLabels {
  title: string
  subtitle: string
  income: string
  expenses: string
  balance: string
  savingsRate: string
  spendingByCategory: string
  topExpenses: string
  netWorthByType: string
  total: string
  excludesInvestments: string
  netWorthEvolution: string
  partialMonthNote: string
  estimatedMonthNote: string
  accountBalances: string
  investmentsSnapshot: string
  investmentsNote: string
  invested: string
  marketValue: string
  pnl: string
  vs: string
  page: string
  noExpenses: string
  budgetVsActual: string
  budgetNote: string
}

export interface MonthlyReportData {
  monthLabel: string
  isCurrentMonth: boolean
  income: number
  expenses: number
  balance: number
  savingsRate: number | null
  categories: MonthlyReportCategory[]
  categoryTotal: number
  accounts: MonthlyReportAccount[]
  netWorthTotal: number
  netWorthByType: MonthlyReportNetWorthGroup[]
  netWorthMissingInvestments: boolean
  netWorthEstimatedInvestments: boolean
  netWorthEvolution: MonthlyReportNetWorthPoint[]
  comparisonLabel: string
  netWorthDelta: number
  investment: { totalInvested: number; totalMarketValue: number; totalPnl: number }
  topExpenses: MonthlyReportExpense[]
  budgets:     MonthlyReportBudgets | null  // null when the user has no budgets
  labels: MonthlyReportLabels
}
