import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PrivacyStore {
  hideBalances: boolean
  toggle: () => void
}

export const usePrivacyStore = create<PrivacyStore>()(
  persist(
    (set, get) => ({
      hideBalances: false,
      toggle: () => set({ hideBalances: !get().hideBalances }),
    }),
    { name: 'finance-privacy' },
  ),
)
