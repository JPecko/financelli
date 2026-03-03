import { db } from '@/data/db'
import type { Transaction } from '@/domain/types'
import { accountsRepo } from './accountsRepo'

async function applyBalances(tx: Omit<Transaction, 'id'>) {
  await accountsRepo.adjustBalance(tx.accountId, tx.amount)
  // Internal transfer: destination gets the opposite (credit)
  if (tx.toAccountId != null) {
    await accountsRepo.adjustBalance(tx.toAccountId, -tx.amount)
  }
}

async function reverseBalances(tx: Transaction) {
  await accountsRepo.adjustBalance(tx.accountId, -tx.amount)
  if (tx.toAccountId != null) {
    await accountsRepo.adjustBalance(tx.toAccountId, tx.amount)
  }
}

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
      await applyBalances(tx)
      return id
    })
  },

  update: async (id: number, changes: Partial<Transaction>) => {
    return db.transaction('rw', db.transactions, db.accounts, async () => {
      const existing = await db.transactions.get(id)
      if (!existing) throw new Error(`Transaction ${id} not found`)
      // Full reversal then re-apply — handles toAccountId changes cleanly
      await reverseBalances(existing)
      const updated = { ...existing, ...changes }
      await applyBalances(updated)
      await db.transactions.update(id, changes)
    })
  },

  remove: async (id: number) => {
    return db.transaction('rw', db.transactions, db.accounts, async () => {
      const tx = await db.transactions.get(id)
      if (!tx) return
      await reverseBalances(tx)
      await db.transactions.delete(id)
    })
  },
}
