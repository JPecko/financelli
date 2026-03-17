import { useLayoutEffect } from 'react'
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
  isShared:       boolean  // true = split enabled; false = full expense mine
  splitN:         number   // only when isShared = true
  isReimbursable: boolean  // exclude from personal stats
  personalUserId: string   // non-empty & !isShared → only this user owns the expense
  holdingId:      string   // '' = no link, '123' = holding ID (investment accounts)
  units:          string   // units bought/sold (investment accounts)
}

// ── Payload builder ────────────────────────────────────────────────────────────

function buildPayload(v: TransactionFormValues): Omit<Transaction, 'id' | 'createdAt'> {
  const abs        = toCents(parseFloat(v.amount.replace(',', '.')) || 0)
  const fromIsReal = v.fromId !== EXTERNAL
  const toIsReal   = v.toId   !== EXTERNAL
  const base = {
    type:           v.type,
    category:       v.category,
    description:    v.description.trim(),
    date:           v.date,
    isPersonal:     !v.isShared,
    splitN:         v.isShared ? Math.max(2, Math.round(v.splitN ?? 2)) : null,
    isReimbursable: v.isReimbursable,
    personalUserId: !v.isShared && v.personalUserId ? v.personalUserId : undefined,
    holdingId:      v.holdingId ? parseInt(v.holdingId) : undefined,
    units:          v.holdingId && v.units ? parseFloat(v.units) : undefined,
  }
  if (v.type === 'transfer') {
    if (fromIsReal && toIsReal) return { ...base, accountId: parseInt(v.fromId), toAccountId: parseInt(v.toId), amount: -abs }
    return fromIsReal
      ? { ...base, accountId: parseInt(v.fromId), amount: -abs }
      : { ...base, accountId: parseInt(v.toId),   amount: +abs }
  }
  return { ...base, accountId: parseInt(fromIsReal ? v.fromId : v.toId), amount: (v.type === 'income' ? 1 : -1) * abs }
}

// ── Form value builders ────────────────────────────────────────────────────────

function makeDefaults(
  type: TransactionType, firstId: string, secondId: string, splitN: number, isShared: boolean,
): TransactionFormValues {
  return {
    type,
    fromId:         type === 'income'   ? EXTERNAL : firstId,
    toId:           type === 'income'   ? firstId  : type === 'transfer' ? secondId : EXTERNAL,
    amount:         '',
    category:       type === 'transfer' ? 'transfer' : 'other',
    description:    '',
    date:           isoToday(),
    isShared:       type !== 'income' && isShared,
    splitN,
    isReimbursable: false,
    personalUserId: '',
    holdingId:      '',
    units:          '',
  }
}

function makeEditValues(tx: Transaction, account: { participants?: number } | undefined): TransactionFormValues {
  const n        = account?.participants ?? 1
  const isShared = tx.isPersonal ? false : tx.splitN != null ? true : n > 1

  let fromId: string, toId: string
  if (tx.type === 'income')           { fromId = EXTERNAL;             toId = String(tx.accountId) }
  else if (tx.type === 'expense')     { fromId = String(tx.accountId); toId = EXTERNAL }
  else if (tx.toAccountId != null)    { fromId = String(tx.accountId); toId = String(tx.toAccountId) }
  else {
    // External transfer: direction from amount sign
    fromId = tx.amount < 0 ? String(tx.accountId) : EXTERNAL
    toId   = tx.amount < 0 ? EXTERNAL : String(tx.accountId)
  }

  return {
    type:           tx.type,
    fromId, toId,
    amount:         Math.abs(fromCents(tx.amount)).toFixed(2),
    category:       tx.category,
    description:    tx.description,
    date:           tx.date,
    isShared,
    splitN:         tx.splitN ?? (isShared ? n : 2),
    isReimbursable: tx.isReimbursable ?? false,
    personalUserId: tx.personalUserId ?? '',
    holdingId:      tx.holdingId != null ? String(tx.holdingId) : '',
    units:          tx.units     != null ? String(tx.units)     : '',
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

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
  const { user } = useAuth()
  const { data: accounts = [] } = useSortedAccounts()

  const firstId     = defaultAccountId ?? (accounts[0]?.id != null ? String(accounts[0].id) : '')
  const secondId    = accounts.find(a => String(a.id) !== firstId)?.id != null
    ? String(accounts.find(a => String(a.id) !== firstId)!.id) : EXTERNAL
  const primary     = accounts.find(a => String(a.id) === firstId)
  const isSharedDef = (primary?.participants ?? 1) > 1
  const splitNDef   = isSharedDef ? primary!.participants! : 2
  const editAccount = transaction ? accounts.find(a => a.id === transaction.accountId) : undefined

  const form = useForm<TransactionFormValues>({
    defaultValues: makeDefaults(defaultType, firstId, secondId, splitNDef, isSharedDef),
  })
  const { setValue, watch, reset, handleSubmit } = form

  const selectedType   = watch('type')
  const selectedFrom   = watch('fromId')
  const selectedTo     = watch('toId')
  const splitN         = watch('splitN')
  const isReimbursable = watch('isReimbursable')
  const personalUserId = watch('personalUserId')
  const holdingId      = watch('holdingId')

  const selectedAccount         = accounts.find(a => String(a.id) === selectedFrom)
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

  const accountOptions = (exclude?: string) => accounts.filter(a => String(a.id) !== exclude)

  const applyShared = (accountId: string, type = selectedType) => {
    if (type === 'income') { setValue('isShared', false); setValue('splitN', 2); return }
    const acct   = accounts.find(a => String(a.id) === accountId)
    const shared = (acct?.participants ?? 1) > 1
    setValue('isShared', shared)
    setValue('splitN', shared ? (acct!.participants ?? 2) : 2)
  }

  const handleFromChange = (v: string) => { setValue('fromId', v); if (!isTransfer) applyShared(v) }

  const handleTypeChange = (t: TransactionType) => {
    const prev = form.getValues('type')
    setValue('type', t)
    setValue('category', t === 'transfer' ? 'transfer' : 'other')
    if (t !== prev) {
      if      (t === 'income')  { setValue('fromId', EXTERNAL); setValue('toId', firstId)  }
      else if (t === 'expense') { setValue('fromId', firstId);  setValue('toId', EXTERNAL) }
      else                      { setValue('fromId', firstId);  setValue('toId', secondId) }
    }
    if (t !== 'transfer') applyShared(firstId, t)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!open) return
    reset(transaction ? makeEditValues(transaction, editAccount) : makeDefaults(defaultType, firstId, secondId, splitNDef, isSharedDef))
  }, [open, transaction, firstId, secondId, splitNDef, isSharedDef, editAccount, reset])

  const onSubmit = handleSubmit(async (values) => {
    const payload = buildPayload(values)
    if (transaction?.id != null) {
      await updateTransaction(transaction.id, payload)
      await onAfterSubmit?.()
    } else {
      const id = await addTransaction(payload)
      await onAfterSubmit?.(id)
    }
    onClose()
  })

  return {
    form, isTransfer, isValid, categories, accounts, accountOptions,
    selectedType, selectedFrom, selectedTo, splitN, isReimbursable, personalUserId, holdingId,
    isSharedAccount: isSharedAccountSelected, sharedAccountParticipants, selectedAccount,
    handleTypeChange, handleFromChange, onSubmit,
  }
}
