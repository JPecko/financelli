import { db } from '@/data/db'
import type { Transaction } from '@/domain/types'
import { accountsRepo } from './accountsRepo'

export const transactionsRepo = {
  getAll: () => db.transactions.orderBy('date').reverse().toArray(),

  getByMonth: (year: number, month: number) => {
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const to   = `${year}-${String(month).padStart(2, '0')}-31`
    return db.transactions.where('date').between(from, to, true, true).reverse().sortBy('date')
  },

  getByAccount: (accountId: number) =>
    db.transactions.where('accountId').equals(accountId).reverse().sortBy('date'),

  add: async (tx: Omit<Transaction, 'id'>) => {
    return db.transaction('rw', db.transactions, db.accounts, async () => {
      const id = await db.transactions.add({ ...tx, createdAt: new Date().toISOString() })
      await accountsRepo.adjustBalance(tx.accountId, tx.amount)
      return id
    })
  },

  update: async (id: number, changes: Partial<Transaction>) => {
    return db.transaction('rw', db.transactions, db.accounts, async () => {
      const existing = await db.transactions.get(id)
      if (!existing) throw new Error(`Transaction ${id} not found`)

      // Reverse the old amount, apply new amount
      const oldAmount = existing.amount
      const newAmount = changes.amount ?? oldAmount
      const delta = newAmount - oldAmount

      if (delta !== 0) {
        const accountId = changes.accountId ?? existing.accountId
        await accountsRepo.adjustBalance(accountId, delta)
      }

      await db.transactions.update(id, changes)
    })
  },

  remove: async (id: number) => {
    return db.transaction('rw', db.transactions, db.accounts, async () => {
      const tx = await db.transactions.get(id)
      if (!tx) return
      await accountsRepo.adjustBalance(tx.accountId, -tx.amount)
      await db.transactions.delete(id)
    })
  },
}
