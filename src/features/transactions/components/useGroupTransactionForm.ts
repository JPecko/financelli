import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/features/auth/AuthContext'
import { groupsRepo } from '@/data/repositories/groupsRepo'
import { addTransaction } from '@/shared/hooks/useTransactions'
import { addGroupEntry, updateGroupEntry } from '@/shared/hooks/useGroups'
import { useSplitState } from '@/features/groups/hooks/useSplitState'
import { toCents, fromCents } from '@/domain/money'
import { isoToday } from '@/shared/utils/format'
import { EXPENSE_CATEGORIES } from '@/domain/categories'
import { useT } from '@/shared/i18n'
import type { SharedFormOverride } from './useTransactionForm'
import type { Transaction, GroupMember, GroupEntry, GroupEntrySplit, SharedExpense, Account } from '@/domain/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Same category list as a personal expense — group and personal expenses should offer identical options
export const GROUP_EXPENSE_CATS = EXPENSE_CATEGORIES

// Normalises European comma decimal separator before parsing
const parseMoney = (v: string) => parseFloat(String(v).replace(',', '.')) || 0

function makeSharedExpenseDefaults(sharedExpense: SharedExpense, fallbackAccountId: string): GrpFormValues {
  return {
    groupId: '',
    payerType: 'member',
    payerMemberId: '',
    accountId: fallbackAccountId,
    description: sharedExpense.description ?? '',
    date: sharedExpense.date ?? isoToday(),
    category: sharedExpense.category ?? 'food',
    totalAmount: fromCents(sharedExpense.totalAmount).toFixed(2),
  }
}

// Drops carried ids/categories the group form can't offer
function validOverride(
  override: SharedFormOverride | undefined, accounts: Account[], groups: { id: number }[],
): SharedFormOverride | undefined {
  if (!override) return undefined
  return {
    ...override,
    accountId: accounts.some(a => String(a.id) === override.accountId) ? override.accountId : undefined,
    groupId:   groups.some(g => String(g.id) === override.groupId) ? override.groupId : undefined,
    category:  GROUP_EXPENSE_CATS.some(c => c.id === override.category) ? override.category : undefined,
  }
}

function makeTransactionDefaults(
  transaction: Transaction | undefined, fallbackAccountId: string, override?: SharedFormOverride,
): GrpFormValues {
  return {
    groupId: override?.groupId ?? '',
    payerType: 'me',
    payerMemberId: '',
    accountId: transaction ? String(transaction.accountId) : (override?.accountId ?? fallbackAccountId),
    description: transaction?.description ?? override?.description ?? '',
    date: transaction?.date ?? (override?.date || isoToday()),
    category: transaction?.category ?? override?.category ?? 'food',
    totalAmount: transaction ? fromCents(Math.abs(transaction.amount)).toFixed(2) : (override?.amount ?? ''),
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GrpFormValues {
  groupId:       string
  payerType:     'me' | 'member'
  payerMemberId: string
  accountId:     string
  description:   string
  date:          string
  category:      string
  totalAmount:   string
}

interface Props {
  open:             boolean
  onClose:          () => void
  transaction?:     Transaction
  duplicateFrom?:   Transaction  // template whose group entry and splits are copied into a new entry
  sharedExpense?:   SharedExpense
  accounts:         Account[]
  groups:           { id: number; name: string }[]
  initialOverride?: SharedFormOverride
  onValuesChange?:  (values: SharedFormOverride) => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGroupTransactionForm({
  open, onClose, transaction, duplicateFrom, sharedExpense, accounts, groups, initialOverride, onValuesChange,
}: Props) {
  const t        = useT()
  const { user } = useAuth()
  const fallbackAccountId = accounts[0]?.id ? String(accounts[0].id) : ''

  const { register, watch, setValue, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<GrpFormValues>({
      defaultValues: {
        groupId: '', payerType: 'me', payerMemberId: '', accountId: '',
        description: '', date: isoToday(), category: 'food', totalAmount: '',
      },
    })

  const groupId       = watch('groupId')
  const payerType     = watch('payerType')
  const total         = watch('totalAmount')
  const accountId     = watch('accountId')
  const payerMemberId = watch('payerMemberId')

  const [members,    setMembers]    = useState<GroupMember[]>([])
  const [createTx,   setCreateTx]   = useState(false)
  const [roundupEnabled, setRoundupEnabled] = useState(true)

  const txAccount = accounts.find(a => String(a.id) === accountId)

  // When duplicating, the source entry only pre-fills the form; there's no entry to update
  const [sourceEntry,  setSourceEntry]  = useState<GroupEntry | null>(null)
  const [linkedSplits, setLinkedSplits] = useState<GroupEntrySplit[]>([])
  const linkedEntry = duplicateFrom ? null : sourceEntry
  const sourceTx    = transaction ?? duplicateFrom

  const myMember = members.find(m => m.userId === user?.id)
  const {
    splitMode, setSplitMode, splitError, setSplitError, splits, percents,
    resetEven, applyCustomSplits, handlePercentChange, handleAmountChange, setMemberFull, setMemberEmpty,
  } = useSplitState(members, toCents(parseMoney(total)))

  // ── Load linked group entry ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setSourceEntry(null)
      setLinkedSplits([])
      return
    }

    let cancelled = false
    const lookup = sourceTx?.id
      ? groupsRepo.getEntryByTransactionId(sourceTx.id)
      : sharedExpense?.id
        ? groupsRepo.getEntryBySharedExpenseId(sharedExpense.id)
        : Promise.resolve(null)
    lookup
      .then(result => {
        if (cancelled) return
        setSourceEntry(result?.entry ?? null)
        setLinkedSplits(result?.splits ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setSourceEntry(null)
        setLinkedSplits([])
      })

    return () => { cancelled = true }
  }, [open, sourceTx?.id, sharedExpense?.id])

  // ── Pre-fill form from linked entry ───────────────────────────────────────
  useEffect(() => {
    if (!sourceEntry || !open) return
    reset(prev => ({
      ...prev,
      groupId:     String(sourceEntry.groupId),
      description: sourceEntry.description,
      date:        duplicateFrom ? isoToday() : sourceEntry.date,
      category:    sourceEntry.category,
      totalAmount: fromCents(sourceEntry.totalAmount).toFixed(2),
      accountId:   sourceTx ? String(sourceTx.accountId) : prev.accountId,
    }))
  }, [sourceEntry, open])

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    if (sharedExpense) {
      reset(makeSharedExpenseDefaults(sharedExpense, fallbackAccountId))
    } else {
      reset(makeTransactionDefaults(transaction, fallbackAccountId, validOverride(initialOverride, accounts, groups)))
    }
    setMembers([])
    resetEven([], 0)
    // Default to creating a real bank transaction when the user is the payer
    setCreateTx(!sharedExpense && !transaction)
    setRoundupEnabled(initialOverride?.roundupEnabled ?? true)
    // initialOverride/groups excluded: only discrete open/entity changes should reset the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset, transaction, sharedExpense, fallbackAccountId, groups.length])

  // Report shared fields to the parent modal so switching tabs can carry them over
  useEffect(() => {
    if (!onValuesChange) return
    const sub = watch((values, { name }) => onValuesChange({
      description: values.description,
      amount:      values.totalAmount,
      date:        values.date,
      accountId:   values.accountId || undefined,
      groupId:     values.groupId || undefined,
      category:    name === 'category' ? values.category : undefined,
    }))
    return () => sub.unsubscribe()
  }, [watch, onValuesChange])

  useEffect(() => { onValuesChange?.({ roundupEnabled }) }, [roundupEnabled, onValuesChange])

  // ── Auto-select the only group when there's just one ─────────────────────
  useEffect(() => {
    if (!open || groups.length !== 1 || groupId !== '') return
    setValue('groupId', String(groups[0].id))
  }, [open, groups, groupId, setValue])

  // ── Load members when group changes ───────────────────────────────────────
  useEffect(() => {
    if (!groupId) {
      setMembers([])
      return
    }

    let cancelled = false
    groupsRepo.getMembers(parseInt(groupId))
      .then(ms => {
        if (cancelled) return
        setMembers(ms)
        const myM      = ms.find(m => m.userId === user?.id)
        const isLinked = sourceEntry && sourceEntry.groupId === parseInt(groupId)
        if (isLinked && linkedSplits.length > 0) {
          applyCustomSplits(linkedSplits)
          if (myM && sourceEntry!.paidByMemberId === myM.id) {
            setValue('payerType', 'me'); setValue('payerMemberId', '')
          } else {
            setValue('payerType', 'member'); setValue('payerMemberId', String(sourceEntry!.paidByMemberId))
          }
        } else {
          resetEven(ms.map(m => m.id!), toCents(parseMoney(total)))
          const firstOther = ms.find(m => m.userId !== user?.id)
          if (firstOther) setValue('payerMemberId', String(firstOther.id))
          else if (ms.length > 0) setValue('payerMemberId', String(ms[0].id))
        }
      })
      .catch(() => {
        if (cancelled) return
        setMembers([])
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, sourceEntry, linkedSplits, setValue, user?.id])

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = handleSubmit(async (values) => {
    if (!user) return
    const gId = parseInt(values.groupId)
    if (!gId || members.length === 0) return
    const totalCents = toCents(parseMoney(values.totalAmount))
    if (totalCents <= 0) return

    const splitCents = splits.map(s => ({ memberId: s.memberId, amount: toCents(parseMoney(s.amount)) }))
    const splitSum   = splitCents.reduce((sum, s) => sum + s.amount, 0)
    if (Math.abs(splitSum - totalCents) > members.length) {
      setSplitError(t('groups.splitSumMismatch'))
      return
    }

    const paidByMemberId = values.payerType === 'me'
      ? (myMember?.id ?? parseInt(values.payerMemberId))
      : parseInt(values.payerMemberId)

    if (linkedEntry?.id != null) {
      await updateGroupEntry(
        linkedEntry.id, gId,
        { description: values.description.trim() || values.category, date: values.date, category: values.category, totalAmount: totalCents, paidByMemberId },
        splitCents.map(s => ({ entryId: linkedEntry.id!, memberId: s.memberId, amount: s.amount })),
      )
    } else {
      let newTxId: number | undefined
      if (values.payerType === 'me' && createTx && values.accountId) {
        newTxId = await addTransaction({
          accountId: parseInt(values.accountId), amount: -totalCents, type: 'expense',
          category: values.category, description: values.description.trim() || values.category,
          date: values.date, isReimbursable: true, skipRoundup: !roundupEnabled,
        })
      }
      await addGroupEntry(
        {
          groupId: gId, description: values.description.trim() || values.category, date: values.date,
          category: values.category, totalAmount: totalCents, paidByMemberId,
          transactionId: newTxId ?? transaction?.id, sharedExpenseId: sharedExpense?.id, createdBy: user.id,
        },
        splitCents.map(s => ({ entryId: 0, memberId: s.memberId, amount: s.amount })),
      )
    }
    onClose()
  })

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalCents     = toCents(parseMoney(total))
  const myShare        = splits.find(s => s.memberId === myMember?.id)
  const myShareCents   = myShare ? toCents(parseMoney(myShare.amount)) : 0
  const othersOweCents = totalCents - myShareCents
  const canSubmit      = groupId !== '' && members.length > 0 && !!myMember
    && (!createTx || accountId !== '') && parseMoney(total) > 0

  return {
    register, watch, setValue, errors, isSubmitting,
    groupId, payerType, total, accountId, payerMemberId,
    members, splits,
    splitMode, setSplitMode,
    percents,
    splitError, createTx, setCreateTx,
    roundupEnabled, setRoundupEnabled, txAccount,
    linkedEntry, myMember,
    totalCents, myShareCents, othersOweCents,
    canSubmit, onSubmit,
    handlePercentChange, handleAmountChange, setMemberFull, setMemberEmpty,
  }
}
