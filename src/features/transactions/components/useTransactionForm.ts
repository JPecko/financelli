import { useEffect, useLayoutEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toCents, fromCents } from '@/domain/money'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORIES } from '@/domain/categories'
import { addTransaction, updateTransaction } from '@/shared/hooks/useTransactions'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { useAuth } from '@/features/auth/AuthContext'
import { isoToday } from '@/shared/utils/format'
import type { Transaction, TransactionType } from '@/domain/types'

export const EXTERNAL = '__external__'

// Fields carried over when switching tabs (expense/income/transfer/groups) of the same modal
export interface SharedFormOverride {
  description?:    string
  amount?:         string
  date?:           string
  accountId?:      string
  toAccountId?:    string
  category?:       string
  groupId?:        string
  roundupEnabled?: boolean
}

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
  roundupEnabled: boolean  // false = skip roundup generation for this expense
}

export function categoriesFor(type: TransactionType) {
  if (type === 'income')   return INCOME_CATEGORIES
  if (type === 'transfer') return CATEGORIES.filter(c => ['invest-move', 'transfer', 'capital', 'other'].includes(c.id))
  return EXPENSE_CATEGORIES
}

// A carried category only applies when the target type offers it
function carriedCategory(type: TransactionType, category?: string) {
  return category && categoriesFor(type).some(c => c.id === category) ? category : undefined
}

function toCarryOver(v: Partial<TransactionFormValues>, changed?: string): SharedFormOverride {
  const accountId = v.fromId !== EXTERNAL ? v.fromId : v.toId
  return {
    description:    v.description,
    amount:         v.amount,
    date:           v.date,
    accountId:      accountId !== EXTERNAL ? accountId : undefined,
    toAccountId:    v.type === 'transfer' && v.toId !== EXTERNAL ? v.toId : undefined,
    // Only an explicit pick is carried, so a type's default category doesn't leak into another tab
    category:       changed === 'category' ? v.category : undefined,
    roundupEnabled: v.roundupEnabled,
  }
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
    skipRoundup:    v.type === 'expense' && !v.roundupEnabled,
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
  override?: SharedFormOverride,
): TransactionFormValues {
  const carriedTo = override?.toAccountId && override.toAccountId !== firstId ? override.toAccountId : undefined
  return {
    type,
    fromId:         type === 'income'   ? EXTERNAL : firstId,
    toId:           type === 'income'   ? firstId  : type === 'transfer' ? carriedTo ?? secondId : EXTERNAL,
    amount:         override?.amount ?? '',
    category:       carriedCategory(type, override?.category) ?? (type === 'transfer' ? 'transfer' : 'other'),
    description:    override?.description ?? '',
    date:           override?.date || isoToday(),
    isShared:       type !== 'income' && isShared,
    splitN,
    isReimbursable: false,
    personalUserId: '',
    holdingId:      '',
    units:          '',
    roundupEnabled: override?.roundupEnabled ?? true,
  }
}

function makeEditValues(tx: Transaction, participants?: number): TransactionFormValues {
  const n        = participants ?? 1
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
    roundupEnabled: !tx.skipRoundup,
  }
}

function makeResetValues(
  transaction: Transaction | undefined,
  targetType: TransactionType,
  firstId: string,
  secondId: string,
  splitN: number,
  isShared: boolean,
  participants?: number,
  override?: SharedFormOverride,
): TransactionFormValues {
  const defaults = makeDefaults(targetType, firstId, secondId, splitN, isShared, override)
  if (!transaction) return defaults

  const editValues = makeEditValues(transaction, participants)
  if (transaction.type === targetType) return editValues

  const primaryAccountId =
    editValues.fromId !== EXTERNAL ? editValues.fromId :
    editValues.toId !== EXTERNAL ? editValues.toId :
    firstId

  if (targetType === 'income') {
    return {
      ...defaults,
      amount: editValues.amount,
      category: 'other',
      description: editValues.description,
      date: editValues.date,
      toId: primaryAccountId,
      holdingId: editValues.holdingId,
      units: editValues.units,
    }
  }

  if (targetType === 'expense') {
    return {
      ...defaults,
      amount: editValues.amount,
      category: editValues.category === 'transfer' ? 'other' : editValues.category,
      description: editValues.description,
      date: editValues.date,
      fromId: primaryAccountId,
      isShared: editValues.isShared,
      splitN: editValues.splitN,
      isReimbursable: editValues.isReimbursable,
      personalUserId: editValues.personalUserId,
      holdingId: editValues.holdingId,
      units: editValues.units,
      roundupEnabled: editValues.roundupEnabled,
    }
  }

  const fallbackToId =
    editValues.toId !== EXTERNAL && editValues.toId !== primaryAccountId
      ? editValues.toId
      : secondId

  return {
    ...defaults,
    amount: editValues.amount,
    description: editValues.description,
    date: editValues.date,
    fromId: primaryAccountId,
    toId: fallbackToId,
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseTransactionFormProps {
  open:              boolean
  onClose:           () => void
  transaction?:      Transaction
  duplicate?:        boolean  // transaction is only a template — submit creates a new one
  defaultType?:      TransactionType
  defaultAccountId?: string
  onAfterSubmit?:    (id?: number) => Promise<void>
  initialOverride?:  SharedFormOverride
  onValuesChange?:   (values: SharedFormOverride) => void
}

export function useTransactionForm({
  open, onClose, transaction, duplicate = false, defaultType = 'expense', defaultAccountId, onAfterSubmit,
  initialOverride, onValuesChange,
}: UseTransactionFormProps) {
  const { user } = useAuth()
  const { data: accounts = [] } = useSortedAccounts()

  const isKnownAccount = (id?: string) => id != null && accounts.some(a => String(a.id) === id)
  const carriedId   = isKnownAccount(initialOverride?.accountId) ? initialOverride!.accountId : undefined
  const firstId     = carriedId ?? defaultAccountId ?? (accounts[0]?.id != null ? String(accounts[0].id) : '')
  const secondId    = accounts.find(a => String(a.id) !== firstId)?.id != null
    ? String(accounts.find(a => String(a.id) !== firstId)!.id) : EXTERNAL
  const override    = initialOverride && {
    ...initialOverride,
    toAccountId: isKnownAccount(initialOverride.toAccountId) ? initialOverride.toAccountId : undefined,
  }
  const primary     = accounts.find(a => String(a.id) === firstId)
  const isSharedDef = (primary?.participants ?? 1) > 1
  const splitNDef   = isSharedDef ? primary!.participants! : 2
  const editAccount = transaction ? accounts.find(a => a.id === transaction.accountId) : undefined
  const editParticipants = editAccount?.participants

  const resetValues = useMemo(
    () => makeResetValues(
      transaction,
      defaultType,
      firstId,
      secondId,
      splitNDef,
      isSharedDef,
      editParticipants,
      override,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transaction, editParticipants, defaultType, firstId, secondId, splitNDef, isSharedDef],
  )

  const form = useForm<TransactionFormValues>({
    defaultValues: makeDefaults(defaultType, firstId, secondId, splitNDef, isSharedDef, override),
  })
  const { setValue, watch, reset, handleSubmit } = form

  const selectedType   = watch('type')
  const selectedFrom   = watch('fromId')
  const selectedTo     = watch('toId')
  const splitN         = watch('splitN')
  const isReimbursable = watch('isReimbursable')
  const personalUserId = watch('personalUserId')
  const holdingId      = watch('holdingId')
  const roundupEnabled = watch('roundupEnabled')

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

  const categories = categoriesFor(selectedType)

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

  useLayoutEffect(() => {
    if (!open) return
    reset(resetValues)
  }, [open, reset, resetValues])

  // Report shared fields to the parent modal so switching tabs can carry them over
  useEffect(() => {
    if (!onValuesChange) return
    const sub = watch((values, { name }) => onValuesChange(toCarryOver(values, name)))
    return () => sub.unsubscribe()
  }, [watch, onValuesChange])

  const onSubmit = handleSubmit(async (values) => {
    const payload = buildPayload(values)
    if (transaction?.id != null && !duplicate) {
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
    selectedType, selectedFrom, selectedTo, splitN, isReimbursable, personalUserId, holdingId, roundupEnabled,
    isSharedAccount: isSharedAccountSelected, sharedAccountParticipants, selectedAccount,
    handleTypeChange, handleFromChange, onSubmit,
  }
}
