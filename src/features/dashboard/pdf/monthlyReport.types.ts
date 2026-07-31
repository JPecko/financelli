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
  previousBalance: number
  delta: number
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
  accountBalances: string
  investmentsSnapshot: string
  investmentsNote: string
  invested: string
  marketValue: string
  pnl: string
  vs: string
  page: string
  noExpenses: string
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
  comparisonLabel: string
  netWorthDelta: number
  investment: { totalInvested: number; totalMarketValue: number; totalPnl: number }
  topExpenses: MonthlyReportExpense[]
  labels: MonthlyReportLabels
}
