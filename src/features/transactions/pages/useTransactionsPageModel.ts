import { useMemo, useState } from 'react'
import { getYear, getMonth } from 'date-fns'
import { useTransactionsByMonth, useRunningBalances, removeTransaction } from '@/shared/hooks/useTransactions'
import { useAccounts } from '@/shared/hooks/useAccounts'
import type { Transaction } from '@/domain/types'

export function useTransactionsPageModel() {
  const [year, setYear] = useState(() => getYear(new Date()))
  const [month, setMonth] = useState(() => getMonth(new Date()) + 1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>()

  const { data: transactions = [], isLoading } = useTransactionsByMonth(year, month)
  const { data: accounts = [] } = useAccounts()
  const runningBalances = useRunningBalances(year, month)

  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map(a => [a.id!, a.name])) as Record<number, string>,
    [accounts],
  )

  const currentDate = useMemo(() => new Date(year, month - 1, 1), [year, month])

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear(y => y - 1)
      return
    }
    setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear(y => y + 1)
      return
    }
    setMonth(m => m + 1)
  }

  const openCreateModal = () => {
    setEditing(undefined)
    setModalOpen(true)
  }

  const handleEdit = (tx: Transaction) => {
    setEditing(tx)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditing(undefined)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Delete this transaction?')) {
      await removeTransaction(id)
    }
  }

  return {
    year,
    month,
    currentDate,
    modalOpen,
    editing,
    transactions,
    isLoading,
    accountMap,
    runningBalances,
    prevMonth,
    nextMonth,
    openCreateModal,
    handleEdit,
    handleClose,
    handleDelete,
  }
}
