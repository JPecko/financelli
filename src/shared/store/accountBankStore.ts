import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BANK_OPTIONS, bankApiLogoUrl } from '@/shared/config/banks'

export interface AccountBankMeta {
  bankCode: string
  bankName: string
  bankLogoUrl: string
}

interface AccountBankState {
  bankByAccountId: Record<number, AccountBankMeta>
  setBankMeta: (accountId: number, meta: AccountBankMeta) => void
  clearBankMeta: (accountId: number) => void
}

export const useAccountBankStore = create<AccountBankState>()(
  persist(
    (set) => ({
      bankByAccountId: {},
      setBankMeta: (accountId, meta) => set(state => ({
        bankByAccountId: { ...state.bankByAccountId, [accountId]: meta },
      })),
      clearBankMeta: (accountId) => set(state => {
        const next = { ...state.bankByAccountId }
        delete next[accountId]
        return { bankByAccountId: next }
      }),
    }),
    {
      name: 'finance-account-banks',
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as AccountBankState | undefined
        if (!state?.bankByAccountId) return persistedState as AccountBankState

        const byCode = Object.fromEntries(BANK_OPTIONS.map(b => [b.code, bankApiLogoUrl(b.logoDomain)]))
        const next = { ...state.bankByAccountId }

        for (const [id, meta] of Object.entries(next)) {
          const logoPath = byCode[meta.bankCode]
          if (!logoPath) continue
          next[Number(id)] = { ...meta, bankLogoUrl: logoPath }
        }

        return { ...state, bankByAccountId: next }
      },
    },
  ),
)
