import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/features/auth/AuthContext'
import { groupsRepo } from '@/data/repositories/groupsRepo'
import { addTransaction } from '@/shared/hooks/useTransactions'
import { addGroupEntry, updateGroupEntry } from '@/shared/hooks/useGroups'
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

function distributeEvenly(totalCents: number, memberIds: number[]): Record<number, number> {
  if (memberIds.length === 0) return {}
  const base      = Math.floor(totalCents / memberIds.length)
  const remainder = totalCents - base * memberIds.length
  return Object.fromEntries(memberIds.map((id, i) => [id, i < remainder ? base + 1 : base]))
}

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

function makeTransactionDefaults(
  transaction: Transaction | undefined, fallbackAccountId: string, override?: SharedFormOverride,
): GrpFormValues {
  return {
    groupId: '',
    payerType: 'me',
    payerMemberId: '',
    accountId: transaction ? String(transaction.accountId) : fallbackAccountId,
    description: transaction?.description ?? override?.description ?? '',
    date: transaction?.date ?? override?.date ?? isoToday(),
    category: transaction?.category ?? 'food',
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

export interface GrpSplitRow {
  memberId: number
  amount:   string
}

interface Props {
  open:             boolean
  onClose:          () => void
  transaction?:     Transaction
  sharedExpense?:   SharedExpense
  accounts:         Account[]
  groups:           { id: number; name: string }[]
  initialOverride?: SharedFormOverride
  onValuesChange?:  (values: SharedFormOverride) => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGroupTransactionForm({
  open, onClose, transaction, sharedExpense, accounts, groups, initialOverride, onValuesChange,
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
  const [splits,     setSplits]     = useState<GrpSplitRow[]>([])
  const [splitMode,  setSplitMode]  = useState<'even' | 'percent' | 'custom'>('even')
  const [percents,   setPercents]   = useState<Record<number, string>>({})
  const [splitError, setSplitError] = useState('')
  const [createTx,   setCreateTx]   = useState(false)

  const [linkedEntry,  setLinkedEntry]  = useState<GroupEntry | null>(null)
  const [linkedSplits, setLinkedSplits] = useState<GroupEntrySplit[]>([])

  const myMember = members.find(m => m.userId === user?.id)

  // ── Load linked group entry ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setLinkedEntry(null)
      setLinkedSplits([])
      return
    }

    let cancelled = false
    const lookup = transaction?.id
      ? groupsRepo.getEntryByTransactionId(transaction.id)
      : sharedExpense?.id
        ? groupsRepo.getEntryBySharedExpenseId(sharedExpense.id)
        : Promise.resolve(null)
    lookup
      .then(result => {
        if (cancelled) return
        setLinkedEntry(result?.entry ?? null)
        setLinkedSplits(result?.splits ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setLinkedEntry(null)
        setLinkedSplits([])
      })

    return () => { cancelled = true }
  }, [open, transaction?.id, sharedExpense?.id])

  // ── Pre-fill form from linked entry ───────────────────────────────────────
  useEffect(() => {
    if (!linkedEntry || !open) return
    reset(prev => ({
      ...prev,
      groupId:     String(linkedEntry.groupId),
      description: linkedEntry.description,
      date:        linkedEntry.date,
      category:    linkedEntry.category,
      totalAmount: fromCents(linkedEntry.totalAmount).toFixed(2),
      accountId:   transaction ? String(transaction.accountId) : prev.accountId,
    }))
  }, [linkedEntry, open])

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    if (sharedExpense) {
      reset(makeSharedExpenseDefaults(sharedExpense, fallbackAccountId))
    } else {
      reset(makeTransactionDefaults(transaction, fallbackAccountId, initialOverride))
    }
    setMembers([])
    setSplits([])
    setSplitMode('even')
    setPercents({})
    setSplitError('')
    // Default to creating a real bank transaction when the user is the payer
    setCreateTx(!sharedExpense && !transaction)
    // initialOverride excluded: it's rebuilt every keystroke and would loop the reset forever
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset, transaction, sharedExpense, fallbackAccountId])

  // Report description/totalAmount/date to the parent modal so switching to the Personal tab can carry them over
  useEffect(() => {
    if (!onValuesChange) return
    const sub = watch(values => onValuesChange({
      description: values.description ?? '',
      amount:      values.totalAmount ?? '',
      date:        values.date ?? '',
    }))
    return () => sub.unsubscribe()
  }, [watch, onValuesChange])

  // ── Auto-select the only group when there's just one ─────────────────────
  useEffect(() => {
    if (!open || groups.length !== 1 || groupId !== '') return
    setValue('groupId', String(groups[0].id))
  }, [open, groups, groupId, setValue])

  // ── Load members when group changes ───────────────────────────────────────
  useEffect(() => {
    if (!groupId) {
      setMembers([])
      setSplits([])
      return
    }

    let cancelled = false
    groupsRepo.getMembers(parseInt(groupId))
      .then(ms => {
        if (cancelled) return
        setMembers(ms)
        setSplitError('')
        const myM      = ms.find(m => m.userId === user?.id)
        const isLinked = linkedEntry && linkedEntry.groupId === parseInt(groupId)
        if (isLinked && linkedSplits.length > 0) {
          setSplits(linkedSplits.map(s => ({ memberId: s.memberId, amount: fromCents(s.amount).toFixed(2) })))
          setSplitMode('custom')
          if (myM && linkedEntry!.paidByMemberId === myM.id) {
            setValue('payerType', 'me'); setValue('payerMemberId', '')
          } else {
            setValue('payerType', 'member'); setValue('payerMemberId', String(linkedEntry!.paidByMemberId))
          }
        } else {
          setSplits(ms.map(m => ({ memberId: m.id!, amount: '' })))
          setSplitMode('even')
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
  }, [groupId, linkedEntry, linkedSplits, setValue, user?.id])

  // ── Recompute even splits ──────────────────────────────────────────────────
  useEffect(() => {
    if (splitMode !== 'even' || members.length === 0) return
    const totalCents  = toCents(parseMoney(total))
    const distributed = distributeEvenly(totalCents, members.map(m => m.id!))
    setSplits(members.map(m => ({ memberId: m.id!, amount: fromCents(distributed[m.id!] ?? 0).toFixed(2) })))
  }, [total, splitMode, members])

  // ── Recompute percent splits ───────────────────────────────────────────────
  useEffect(() => {
    if (splitMode !== 'percent' || members.length === 0) return
    const totalCents = toCents(parseMoney(total))
    setSplits(members.map(m => {
      const pct = parseFloat(percents[m.id!] || '0') / 100
      return { memberId: m.id!, amount: fromCents(Math.round(totalCents * pct)).toFixed(2) }
    }))
  }, [total, splitMode, percents, members])

  // ── Switch to percent mode ─────────────────────────────────────────────────
  const handleSwitchToPercent = () => {
    const totalCents  = toCents(parseMoney(total))
    const newPercents: Record<number, string> = {}
    if (splitMode === 'custom' && totalCents > 0) {
      members.forEach(m => {
        const split = splits.find(s => s.memberId === m.id)
        const pct   = (toCents(parseFloat(split?.amount || '0')) / totalCents) * 100
        newPercents[m.id!] = pct.toFixed(2)
      })
    } else {
      const even = members.length > 0 ? 100 / members.length : 0
      members.forEach((m, i) => {
        newPercents[m.id!] = i < members.length - 1
          ? even.toFixed(2)
          : (100 - even * (members.length - 1)).toFixed(2)
      })
    }
    setPercents(newPercents)
    setSplitMode('percent')
    setSplitError('')
  }

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
          date: values.date, isReimbursable: true,
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
    members, splits, setSplits,
    splitMode, setSplitMode, setSplitError,
    percents, setPercents,
    splitError, createTx, setCreateTx,
    linkedEntry, myMember,
    totalCents, myShareCents, othersOweCents,
    canSubmit, onSubmit,
    handleSwitchToPercent,
  }
}
