import Dexie, { type EntityTable } from 'dexie'
import type { Account, Transaction, RecurringRule, AppSettings } from '@/domain/types'

class FinanceDB extends Dexie {
  accounts!: EntityTable<Account, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  recurringRules!: EntityTable<RecurringRule, 'id'>
  settings!: EntityTable<AppSettings, 'id'>

  constructor() {
    super('FinanceDashboard')
    this.version(1).stores({
      accounts:       '++id, type, createdAt',
      transactions:   '++id, accountId, date, type, category, recurringRuleId',
      recurringRules: '++id, accountId, active, nextDue',
      settings:       '++id',
    })
  }
}

export const db = new FinanceDB()

/** Seed default settings on first load */
db.on('ready', async () => {
  const count = await db.settings.count()
  if (count === 0) {
    await db.settings.add({ currency: 'EUR', theme: 'system' })
  }
})
