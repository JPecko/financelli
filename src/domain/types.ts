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
  isPersonal?: boolean     // if true, don't divide by participants (even in shared accounts)
  splitN?: number | null   // override divisor: split expense/income by this many people
  isReimbursable?: boolean // if true, exclude entirely from personal stats (fronted for someone else)
  personalUserId?: string  // if set, only this user counts it as a personal expense; others exclude it
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
  isPersonal?: boolean     // if true, generated transactions won't be split by participants
  splitN?: number | null   // override divisor for generated transactions
  isReimbursable?: boolean // if true, generated transactions excluded from personal stats
  createdAt: string
}

export type SharedExpensePayer  = 'me' | 'other'
export type SharedExpenseStatus = 'open' | 'settled' | 'ignored'

export interface SharedExpense {
  id?:            number
  description:    string
  date:           string      // YYYY-MM-DD
  category:       string
  totalAmount:    number      // cents, positive
  myShare:        number      // cents, positive
  payer:          SharedExpensePayer
  payerLabel?:    string      // payer='other' → quem pagou; payer='me' → quem te deve
  status:         SharedExpenseStatus
  notes?:         string
  source:         'manual' | 'csv' | 'api'
  externalId?:    string
  transactionId?: number      // payer='me' → FK para a transação bancária correspondente
  createdAt:      string
}

export interface AppSettings {
  id?: number
  currency: string      // default 'EUR'
  theme: 'light' | 'dark' | 'system'
}

// ---- Groups (Phase 1) ------------------------------------------

export interface Group {
  id?: number
  name: string
  currency: string      // e.g. 'EUR'
  createdBy: string     // user_id
  createdAt: string
}

export interface GroupMember {
  id?: number
  groupId: number
  userId?: string        // null = non-app member
  name: string           // display name / alias
  email?: string
  createdAt: string
}

export interface GroupEntry {
  id?: number
  groupId: number
  description: string
  date: string           // YYYY-MM-DD
  category: string
  totalAmount: number    // cents, positive
  paidByMemberId: number
  transactionId?:    number // FK → transactions.id (optional link to bank tx)
  sharedExpenseId?:  number // FK → shared_expenses.id (optional link to SE with payer=other)
  notes?: string
  createdBy: string
  createdAt: string
}

/** View model for a group entry where another member paid and the user owes their share */
export interface GroupExpenseItem {
  entryId:     number
  groupId:     number
  groupName:   string
  description: string
  date:        string   // YYYY-MM-DD
  category:    string
  myShare:     number   // cents – user's split amount
  paidByName:  string
}

export interface GroupEntrySplit {
  id?: number
  entryId: number
  memberId: number
  amount: number         // cents, owed by this member
}

// Computed from entries + splits
export interface MemberBalance {
  memberId: number
  memberName: string
  paid: number           // total amount paid on behalf of group
  owed: number           // total owed (their share across all entries)
  net: number            // paid - owed: positive = others owe them, negative = they owe
}

export interface SimplifiedDebt {
  fromMemberId: number
  fromMemberName: string
  toMemberId: number
  toMemberName: string
  amount: number         // cents
}
