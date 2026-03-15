import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toCents, fromCents } from '@/domain/money'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORIES } from '@/domain/categories'
import { addTransaction, updateTransaction } from '@/shared/hooks/useTransactions'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { useAuth } from '@/features/auth/AuthContext'
import { isoToday } from '@/shared/utils/format'
import type { Transaction, TransactionType } from '@/domain/types'

export const EXTERNAL = '__external__'

export interface TransactionFormValues {
  type:           TransactionType
  fromId:         string
  toId:           string
  amount:         string
  category:       string
  description:    string
  date:           string
  isShared:       boolean  // true = split enabled (default), false = full expense mine
  splitN:         number   // how many people to split between (only used when isShared = true)
  isReimbursable: boolean  // true = exclude entirely from personal stats
  personalUserId: string   // if non-empty and !isShared, only this user owns the expense
}

function buildPayload(values: TransactionFormValues): Omit<Transaction, 'id' | 'createdAt'> {
  const absAmount  = toCents(parseFloat(values.amount.replace(',', '.')) || 0)
  const fromIsReal = values.fromId !== EXTERNAL
  const toIsReal   = values.toId   !== EXTERNAL
  const base = {
    type:        values.type,
    category:    values.category,
    description: values.description.trim(),
    date:        values.date,
    isPersonal:     !values.isShared,
    splitN:         values.isShared ? Math.max(2, Math.round(values.splitN ?? 2)) : null,
    isReimbursable: values.isReimbursable,
    personalUserId: !values.isShared && values.personalUserId ? values.personalUserId : undefined,
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
  defaultSplitN: number,
  isSharedAccount: boolean,
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
    isShared:       defaultType === 'income' ? false : isSharedAccount,
    splitN:         defaultSplitN,
    isReimbursable: false,
    personalUserId: '',
  }
}

function buildEditValues(transaction: Transaction, account: { participants?: number } | undefined): TransactionFormValues {
  const isInternalTransfer  = transaction.type === 'transfer' && transaction.toAccountId != null
  const accountParticipants = account?.participants ?? 1
  const isSharedAccount     = accountParticipants > 1

  // Priority: explicit isPersonal → explicit splitN → account default
  const isShared = transaction.isPersonal
    ? false
    : transaction.splitN != null
    ? true
    : isSharedAccount

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
    isShared,
    splitN:         transaction.splitN ?? (isShared ? accountParticipants : 2),
    isReimbursable: transaction.isReimbursable ?? false,
    personalUserId: transaction.personalUserId ?? '',
  }
}

interface UseTransactionFormProps {
  open:              boolean
  onClose:           () => void
  transaction?:      Transaction
  defaultType?:      TransactionType
  defaultAccountId?: string
  onAfterSubmit?:    (id?: number) => Promise<void>
}

export function useTransactionForm({
  open, onClose, transaction, defaultType = 'expense', defaultAccountId, onAfterSubmit,
}: UseTransactionFormProps) {
  const isEdit   = !!transaction
  const { user } = useAuth()
  const { data: accounts = [] } = useSortedAccounts()
  const firstId  = defaultAccountId ?? (accounts[0]?.id != null ? String(accounts[0].id) : '')
  const secondId = accounts.find(a => String(a.id) !== firstId)?.id != null
    ? String(accounts.find(a => String(a.id) !== firstId)!.id)
    : EXTERNAL

  const primaryAccount  = accounts.find(a => String(a.id) === firstId)
  const isSharedAccount = (primaryAccount?.participants ?? 1) > 1
  const defaultSplitN   = isSharedAccount ? primaryAccount!.participants! : 2
  const editAccount     = transaction ? accounts.find(a => a.id === transaction.accountId) : undefined

  const form = useForm<TransactionFormValues>({
    defaultValues: buildDefaultValues(defaultType, firstId, secondId, defaultSplitN, isSharedAccount),
  })

  const { setValue, watch, reset, handleSubmit } = form
  const selectedType = watch('type')
  const selectedFrom = watch('fromId')
  const selectedTo   = watch('toId')
  const splitN           = watch('splitN')
  const isReimbursable   = watch('isReimbursable')
  const personalUserId   = watch('personalUserId')

  // Shared account participants list (for "personal for" selector when split is off)
  const selectedAccount = accounts.find(a => String(a.id) === selectedFrom)
  const isSharedAccountSelected = (selectedAccount?.participants ?? 1) > 1
  const sharedAccountParticipants = isSharedAccountSelected && selectedAccount
    ? [
        { userId: selectedAccount.ownerId ?? '', name: selectedAccount.ownerFullName || selectedAccount.ownerEmail || 'Owner', isMe: selectedAccount.ownerId === user?.id },
        ...(selectedAccount.sharedWith ?? []).map(s => ({ userId: s.userId, name: s.fullName || s.email, isMe: s.userId === user?.id })),
      ].filter(p => p.userId)
    : []

  const isTransfer = selectedType === 'transfer'
  const isValid    = !isTransfer || selectedFrom !== EXTERNAL || selectedTo !== EXTERNAL

  const categories =
    selectedType === 'income'   ? INCOME_CATEGORIES :
    selectedType === 'transfer' ? CATEGORIES.filter(c => ['invest-move', 'transfer', 'capital', 'other'].includes(c.id)) :
    EXPENSE_CATEGORIES

  const accountOptions = (exclude?: string) =>
    accounts.filter(a => String(a.id) !== exclude)

  const applySharedDefaults = (accountId: string, type: TransactionType = selectedType) => {
    if (type === 'income') {
      setValue('isShared', false)
      setValue('splitN', 2)
      return
    }
    const acct   = accounts.find(a => String(a.id) === accountId)
    const shared = (acct?.participants ?? 1) > 1
    setValue('isShared', shared)
    setValue('splitN', shared ? (acct!.participants ?? 2) : 2)
  }

  const handleFromChange = (v: string) => {
    setValue('fromId', v)
    if (!isTransfer) applySharedDefaults(v)
  }

  const handleTypeChange = (t: TransactionType) => {
    setValue('type', t)
    setValue('category', t === 'transfer' ? 'transfer' : 'other')
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
    if (t !== 'transfer') applySharedDefaults(firstId, t)
  }

  useEffect(() => {
    if (!open) return
    reset(transaction ? buildEditValues(transaction, editAccount) : buildDefaultValues(defaultType, firstId, secondId, defaultSplitN, isSharedAccount))
  }, [open, transaction, firstId, secondId, defaultType, defaultSplitN, isSharedAccount, editAccount, reset])

  const onSubmit = handleSubmit(async (values) => {
    const payload = buildPayload(values)
    if (isEdit && transaction?.id != null) {
      await updateTransaction(transaction.id, payload)
      if (onAfterSubmit) await onAfterSubmit(undefined)
    } else {
      const id = await addTransaction(payload)
      if (onAfterSubmit) await onAfterSubmit(id)
    }
    onClose()
  })

  return {
    form,
    isEdit,
    isTransfer,
    isValid,
    categories,
    accounts,
    accountOptions,
    selectedType,
    selectedFrom,
    selectedTo,
    splitN,
    isReimbursable,
    personalUserId,
    isSharedAccount: isSharedAccountSelected,
    sharedAccountParticipants,
    handleTypeChange,
    handleFromChange,
    onSubmit,
  }
}
