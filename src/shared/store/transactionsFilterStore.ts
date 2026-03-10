import { create } from 'zustand'

interface TransactionsFilterStore {
  filterAccountId: number | null
  filterCategory:  string | null
  setFilterAccountId: (id: number | null) => void
  setFilterCategory:  (cat: string | null) => void
}

export const useTransactionsFilterStore = create<TransactionsFilterStore>((set) => ({
  filterAccountId: null,
  filterCategory:  null,
  setFilterAccountId: (id)  => set({ filterAccountId: id }),
  setFilterCategory:  (cat) => set({ filterCategory: cat }),
}))
