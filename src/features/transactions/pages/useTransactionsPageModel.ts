import { useMemo, useState } from 'react'
import { getYear, getMonth } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { useTransactionsByMonth, useRunningBalances, removeTransaction } from '@/shared/hooks/useTransactions'
import { useSharedExpensesByMonth, removeSharedExpense, updateSharedExpense } from '@/shared/hooks/useSharedExpenses'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { useTransactionsFilterStore } from '@/shared/store/transactionsFilterStore'
import { useMyGroupExpenses } from '@/shared/hooks/useGroups'
import { groupsRepo } from '@/data/repositories/groupsRepo'
import type { Transaction, Account, SharedExpense, GroupExpenseItem } from '@/domain/types'

export type ListItem =
  | { kind: 'tx';            data: Transaction }
  | { kind: 'se';            data: SharedExpense }
  | { kind: 'group-expense'; data: GroupExpenseItem }

export function useTransactionsPageModel() {
  const [year, setYear] = useState(() => getYear(new Date()))
  const [month, setMonth] = useState(() => getMonth(new Date()) + 1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | undefined>()
  const [editingSE, setEditingSE] = useState<SharedExpense | undefined>()

  const { filterAccountId, filterCategory, filterSource, setFilterAccountId, setFilterCategory, setFilterSource } =
    useTransactionsFilterStore()

  const { data: transactions    = [], isLoading } = useTransactionsByMonth(year, month)
  const { data: sharedExpenses  = [] }            = useSharedExpensesByMonth(year, month)
  const { data: accounts        = [] }            = useSortedAccounts()
  const { data: myGroupExpenses = [] }            = useMyGroupExpenses(year, month)
  const runningBalances                           = useRunningBalances(year, month)

  // Map transactionId → { groupId, groupName } for linked group entries
  const txIds = useMemo(() => transactions.map(t => t.id!).filter(Boolean), [transactions])
  const { data: txGroupMap = {} } = useQuery({
    queryKey: ['txLinkedGroups', txIds],
    queryFn:  () => groupsRepo.getLinkedGroups(txIds),
    enabled:  txIds.length > 0,
    staleTime: 30_000,
  })

  // Map seId → { groupId, groupName } for SE rows linked to a group entry
  const seIds = useMemo(
    () => sharedExpenses.filter(se => se.payer !== 'me').map(se => se.id!).filter(Boolean),
    [sharedExpenses],
  )
  const { data: seGroupMap = {} } = useQuery({
    queryKey: ['seLinkedGroups', seIds],
    queryFn:  () => groupsRepo.getLinkedGroupsForSEs(seIds),
    enabled:  seIds.length > 0,
    staleTime: 30_000,
  })

  const accountsById = useMemo(
    () => Object.fromEntries(accounts.map(a => [a.id!, a])) as Record<number, Account>,
    [accounts],
  )

  // Map transactionId → SharedExpense for payer='me' (shown as badge on TransactionRow)
  const txSeMap = useMemo<Record<number, SharedExpense>>(() => {
    const map: Record<number, SharedExpense> = {}
    for (const se of sharedExpenses) {
      if (se.payer === 'me' && se.transactionId != null) {
        map[se.transactionId] = se
      }
    }
    return map
  }, [sharedExpenses])

  const currentDate = useMemo(() => new Date(year, month - 1, 1), [year, month])

  // Categories present in the current month (from transactions, SEs, and group expenses)
  const categoriesInMonth = useMemo(
    () => [...new Set([
      ...transactions.map(tx => tx.category),
      ...sharedExpenses.map(se => se.category),
      ...myGroupExpenses.map(ge => ge.category),
    ])],
    [transactions, sharedExpenses, myGroupExpenses],
  )

  // Merged + sorted list with discriminated union
  const listItems = useMemo<ListItem[]>(() => {
    const txItems: ListItem[] = transactions
      .filter(tx => {
        // Reimbursable transactions linked to a group entry are represented by the group-expense row
        if (tx.isReimbursable && tx.id != null && txGroupMap[tx.id] != null) return false
        if (filterSource === 'shared' && (tx.id == null || txSeMap[tx.id] == null) && (tx.id == null || txGroupMap[tx.id] == null)) return false
        if (filterAccountId !== null && tx.accountId !== filterAccountId && tx.toAccountId !== filterAccountId) return false
        if (filterCategory !== null && tx.category !== filterCategory) return false
        return true
      })
      .map(tx => ({ kind: 'tx' as const, data: tx }))

    const seItems: ListItem[] = sharedExpenses
      .filter(se => {
        if (se.payer === 'me') return false                    // shown as badge on TransactionRow
        if (se.id != null && seGroupMap[se.id] != null) return false  // superseded by group-expense row
        if (filterSource === 'bank') return false
        if (filterAccountId !== null) return false             // payer='other': no account link
        if (filterCategory !== null && se.category !== filterCategory) return false
        return true
      })
      .map(se => ({ kind: 'se' as const, data: se }))

    const groupExpenseItems: ListItem[] = myGroupExpenses
      .filter(ge => {
        if (filterSource === 'bank') return false
        if (filterAccountId !== null) {
          if (!ge.paidByMe) return false
          if (ge.paymentAccountId !== filterAccountId) return false
        }
        if (filterCategory !== null && ge.category !== filterCategory) return false
        return true
      })
      .map(ge => ({ kind: 'group-expense' as const, data: ge }))

    return [...txItems, ...seItems, ...groupExpenseItems].sort((a, b) => {
      const byDate = b.data.date.localeCompare(a.data.date)
      if (byDate !== 0) return byDate
      return b.data.createdAt.localeCompare(a.data.createdAt)
    })
  }, [transactions, sharedExpenses, myGroupExpenses, txSeMap, txGroupMap, seGroupMap, filterAccountId, filterCategory, filterSource])

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); return }
    setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); return }
    setMonth(m => m + 1)
  }

  const openCreateModal = () => {
    setEditingTx(undefined)
    setEditingSE(undefined)
    setModalOpen(true)
  }

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx)
    setEditingSE(undefined)
    setModalOpen(true)
  }

  const handleEditSE = (se: SharedExpense) => {
    setEditingSE(se)
    setEditingTx(undefined)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingTx(undefined)
    setEditingSE(undefined)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Delete this transaction?')) {
      await removeTransaction(id)
    }
  }

  const handleDeleteSE = async (id: number) => {
    if (confirm('Delete this shared expense?')) {
      await removeSharedExpense(id)
    }
  }

  const handleReopen = async (id: number) => {
    await updateSharedExpense(id, { status: 'open' })
  }

  return {
    year,
    month,
    currentDate,
    modalOpen,
    editingTx,
    editingSE,
    listItems,
    txSeMap,
    txGroupMap,
    seGroupMap,
    isLoading,
    accounts,
    accountsById,
    runningBalances,
    categoriesInMonth,
    filterAccountId,
    filterCategory,
    filterSource,
    setFilterAccountId,
    setFilterCategory,
    setFilterSource,
    prevMonth,
    nextMonth,
    openCreateModal,
    handleEdit,
    handleEditSE,
    handleClose,
    handleDelete,
    handleDeleteSE,
    handleReopen,
  }
}
