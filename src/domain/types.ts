export type AccountType = 'checking' | 'savings' | 'investment' | 'cash' | 'credit'

export interface Account {
  id?: number
  name: string
  type: AccountType
  balance: number       // stored in cents
  currency: string      // e.g. 'EUR'
  color: string         // hex color for display
  createdAt: string     // ISO 8601
}

export type TransactionType = 'income' | 'expense' | 'transfer' | 'revaluation'

export interface Transaction {
  id?: number
  accountId: number     // source account (or single account for income/expense)
  toAccountId?: number  // destination account — only for internal transfers
  amount: number        // positive = income/credit, negative = expense/debit (cents)
  type: TransactionType
  category: string
  description: string
  date: string          // ISO 8601 date string (YYYY-MM-DD)
  recurringRuleId?: number
  createdAt: string
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly'

export interface RecurringRule {
  id?: number
  accountId: number
  name: string
  amount: number        // positive = income, negative = expense (cents)
  type: TransactionType
  category: string
  description: string
  frequency: RecurringFrequency
  startDate: string     // ISO 8601
  nextDue: string       // ISO 8601
  endDate?: string      // ISO 8601
  active: boolean
  createdAt: string
}

export interface AppSettings {
  id?: number
  currency: string      // default 'EUR'
  theme: 'light' | 'dark' | 'system'
}
