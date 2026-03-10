import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toCents, fromCents } from '@/domain/money'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORIES } from '@/domain/categories'
import { addTransaction, updateTransaction } from '@/shared/hooks/useTransactions'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { isoToday } from '@/shared/utils/format'
import type { Transaction, TransactionType } from '@/domain/types'

export const EXTERNAL = '__external__'

export interface TransactionFormValues {
  type:        TransactionType
  fromId:      string
  toId:        string
  amount:      string
  category:    string
  description: string
  date:        string
  isShared:    boolean  // UI field: true = shared (default for shared accounts), false = personal
}

function buildPayload(values: TransactionFormValues): Omit<Transaction, 'id' | 'createdAt'> {
  const absAmount  = toCents(parseFloat(values.amount) || 0)
  const fromIsReal = values.fromId !== EXTERNAL
  const toIsReal   = values.toId   !== EXTERNAL
  const base = {
    type:        values.type,
    category:    values.category,
    description: values.description.trim(),
    date:        values.date,
    isPersonal:  !values.isShared,   // invert: shared=false → isPersonal=false; unshared=true → isPersonal=true
  }

  if (values.type === 'transfer') {
    if (fromIsReal && toIsReal) {
      return { ...base, accountId: parseInt(values.fromId), toAccountId: parseInt(values.toId), amount: -absAmount }
    }
    if (fromIsReal) {
      return { ...base, accountId: parseInt(values.fromId), amount: -absAmount }
    }
    return { ...base, accountId: parseInt(values.toId), amount: +absAmount }
  }

  const sign = values.type === 'income' ? 1 : -1
  return { ...base, accountId: parseInt(fromIsReal ? values.fromId : values.toId), amount: sign * absAmount }
}

function buildDefaultValues(
  defaultType: TransactionType,
  firstId: string,
  secondId: string,
): TransactionFormValues {
  return {
    type:        defaultType,
    fromId:      defaultType === 'income'   ? EXTERNAL : firstId,
    toId:        defaultType === 'income'   ? firstId
               : defaultType === 'transfer' ? secondId
               : EXTERNAL,
    amount:      '',
    category:    defaultType === 'transfer' ? 'transfer' : 'other',
    description: '',
    date:        isoToday(),
    isShared:    true,
  }
}

function buildEditValues(transaction: Transaction): TransactionFormValues {
  const isInternalTransfer = transaction.type === 'transfer' && transaction.toAccountId != null
  return {
    type:        transaction.type,
    fromId:      transaction.type === 'income' ? EXTERNAL : String(transaction.accountId),
    toId:        isInternalTransfer
      ? String(transaction.toAccountId)
      : transaction.type === 'expense' ? EXTERNAL : String(transaction.accountId),
    amount:      Math.abs(fromCents(transaction.amount)).toFixed(2),
    category:    transaction.category,
    description: transaction.description,
    date:        transaction.date,
    isShared:    !(transaction.isPersonal ?? false),
  }
}

interface UseTransactionFormProps {
  open:              boolean
  onClose:           () => void
  transaction?:      Transaction
  defaultType?:      TransactionType
  defaultAccountId?: string
}

export function useTransactionForm({
  open, onClose, transaction, defaultType = 'expense', defaultAccountId,
}: UseTransactionFormProps) {
  const isEdit   = !!transaction
  const { data: accounts = [] } = useSortedAccounts()
  const firstId  = defaultAccountId ?? (accounts[0]?.id != null ? String(accounts[0].id) : '')
  const secondId = accounts.find(a => String(a.id) !== firstId)?.id != null
    ? String(accounts.find(a => String(a.id) !== firstId)!.id)
    : EXTERNAL

  const form = useForm<TransactionFormValues>({
    defaultValues: buildDefaultValues(defaultType, firstId, secondId),
  })

  const { setValue, watch, reset, handleSubmit } = form
  const selectedType = watch('type')
  const selectedFrom = watch('fromId')
  const selectedTo   = watch('toId')

  const isTransfer = selectedType === 'transfer'
  const isValid    = !isTransfer || selectedFrom !== EXTERNAL || selectedTo !== EXTERNAL

  // Which account is "primary" for shared-split purposes
  const primaryAccountId = isTransfer ? null
    : selectedType === 'income' ? parseInt(selectedTo) : parseInt(selectedFrom)
  const isSharedAccount = primaryAccountId != null &&
    (accounts.find(a => a.id === primaryAccountId)?.participants ?? 1) > 1

  const categories =
    selectedType === 'income'   ? INCOME_CATEGORIES :
    selectedType === 'transfer' ? CATEGORIES.filter(c => ['invest-move', 'transfer', 'capital', 'other'].includes(c.id)) :
    EXPENSE_CATEGORIES

  const accountOptions = (exclude?: string) =>
    accounts.filter(a => String(a.id) !== exclude)

  const handleTypeChange = (t: TransactionType) => {
    setValue('type', t)
    setValue('category', t === 'transfer' ? 'transfer' : 'other')
    setValue('isShared', true)
    if (t === 'income') {
      setValue('fromId', EXTERNAL)
      setValue('toId',   firstId)
    } else if (t === 'expense') {
      setValue('fromId', firstId)
      setValue('toId',   EXTERNAL)
    } else {
      setValue('fromId', firstId)
      setValue('toId',   secondId)
    }
  }

  useEffect(() => {
    if (!open) return
    reset(transaction ? buildEditValues(transaction) : buildDefaultValues(defaultType, firstId, secondId))
  }, [open, transaction, firstId, secondId, defaultType, reset])

  const onSubmit = handleSubmit(async (values) => {
    const payload = buildPayload(values)
    if (isEdit && transaction?.id != null) {
      await updateTransaction(transaction.id, payload)
    } else {
      await addTransaction(payload)
    }
    onClose()
  })

  return {
    form,
    isEdit,
    isTransfer,
    isValid,
    isSharedAccount,
    categories,
    accounts,
    accountOptions,
    selectedType,
    selectedFrom,
    selectedTo,
    handleTypeChange,
    onSubmit,
  }
}
