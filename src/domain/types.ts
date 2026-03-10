export type AccountType = 'checking' | 'savings' | 'investment' | 'cash' | 'credit'

export interface AccountShare {
  userId: string
  email: string
  fullName?: string
}

export interface Account {
  id?: number
  name: string
  type: AccountType
  balance: number       // stored in cents
  currency: string      // e.g. 'EUR'
  color: string         // hex color for display
  createdAt: string     // ISO 8601
  ownerId?: string      // user_id of the owner
  ownerEmail?: string
  ownerFullName?: string
  participants?: number    // 1 + number of shares (maintained by DB trigger)
  sharedWith?: AccountShare[] // list of users this account is shared with (guests only)
  bankCode?: string        // e.g. 'revolut' — matches BANK_OPTIONS code
  cashbackPct?: number     // e.g. 1 = 1% cashback on expenses (null = disabled)
  roundupMultiplier?: number // e.g. 5 = ×5 roundup on expenses (null = disabled)
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
  isPersonal?: boolean  // if true, don't divide by participants (even in shared accounts)
  splitN?: number | null  // override divisor: split expense/income by this many people
  createdAt: string
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly'

export interface RecurringRule {
  id?: number
  accountId: number
  toAccountId?: number  // destination account — only for transfer rules
  name: string
  amount: number        // positive = income, negative = expense/transfer (cents)
  type: TransactionType
  category: string
  description: string
  frequency: RecurringFrequency
  startDate: string     // ISO 8601
  nextDue: string       // ISO 8601
  endDate?: string      // ISO 8601
  active: boolean
  isPersonal?: boolean  // if true, generated transactions won't be split by participants
  splitN?: number | null  // override divisor for generated transactions
  createdAt: string
}

export interface AppSettings {
  id?: number
  currency: string      // default 'EUR'
  theme: 'light' | 'dark' | 'system'
}
