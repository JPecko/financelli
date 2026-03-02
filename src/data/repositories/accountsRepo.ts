import { db } from '@/data/db'
import type { Account } from '@/domain/types'

export const accountsRepo = {
  getAll: () => db.accounts.orderBy('createdAt').toArray(),

  getById: (id: number) => db.accounts.get(id),

  add: (account: Omit<Account, 'id'>) =>
    db.accounts.add({ ...account, createdAt: new Date().toISOString() }),

  update: (id: number, changes: Partial<Account>) =>
    db.accounts.update(id, changes),

  remove: (id: number) => db.accounts.delete(id),

  /** Adjust the balance of an account by a delta in cents */
  adjustBalance: (id: number, deltaCents: number) =>
    db.transaction('rw', db.accounts, async () => {
      const account = await db.accounts.get(id)
      if (!account) throw new Error(`Account ${id} not found`)
      await db.accounts.update(id, { balance: account.balance + deltaCents })
    }),
}
