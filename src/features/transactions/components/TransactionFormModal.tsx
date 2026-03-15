import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { useTransactionForm } from './useTransactionForm'
import TransactionTypeTabs from './TransactionTypeTabs'
import AccountSelector from './AccountSelector'
import CategorySelect from './CategorySelect'
import { EXPENSE_CATEGORIES } from '@/domain/categories'
import { toCents, fromCents } from '@/domain/money'
import { addTransaction } from '@/shared/hooks/useTransactions'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { useHoldingsByAccount } from '@/shared/hooks/useHoldings'
import { useGroups, addGroupEntry, updateGroupEntry } from '@/shared/hooks/useGroups'
import { groupsRepo } from '@/data/repositories/groupsRepo'
import { useAuth } from '@/features/auth/AuthContext'
import { isoToday } from '@/shared/utils/format'
import type { Transaction, TransactionType, GroupMember, GroupEntry, GroupEntrySplit, SharedExpense } from '@/domain/types'
import { useT } from '@/shared/i18n'

// ── Helpers ───────────────────────────────────────────────────────────────────

function distributeEvenly(totalCents: number, memberIds: number[]): Record<number, number> {
  if (memberIds.length === 0) return {}
  const base      = Math.floor(totalCents / memberIds.length)
  const remainder = totalCents - base * memberIds.length
  return Object.fromEntries(memberIds.map((id, i) => [id, i < remainder ? base + 1 : base]))
}

const EXPENSE_CATS = EXPENSE_CATEGORIES.filter(
  c => c.id !== 'roundup' && c.id !== 'cashback' && c.id !== 'investing',
)

// ── Types ─────────────────────────────────────────────────────────────────────

interface GrpFormValues {
  groupId:       string
  payerType:     'me' | 'member'
  payerMemberId: string
  accountId:     string
  description:   string
  date:          string
  category:      string
  totalAmount:   string
}

interface GrpSplitRow {
  memberId: number
  amount:   string   // euros, converted on save
}

interface Props {
  open:              boolean
  onClose:           () => void
  transaction?:      Transaction
  sharedExpense?:    SharedExpense
  defaultType?:      TransactionType | 'groups'
  defaultAccountId?: string
}

// ── Toggle UI helper ──────────────────────────────────────────────────────────

function Toggle({ on, color = 'bg-primary' }: { on: boolean; color?: string }) {
  return (
    <div className="relative shrink-0">
      <div className={`h-5 w-9 rounded-full transition-colors ${on ? color : 'bg-muted'}`} />
      <div className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-transform ${on ? 'left-5' : 'left-1'}`} />
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TransactionFormModal({
  open, onClose, transaction, sharedExpense, defaultType, defaultAccountId,
}: Props) {
  const t        = useT()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: accounts = [] } = useSortedAccounts()
  const { data: groups   = [] } = useGroups()

  const isEditTx = transaction != null || sharedExpense != null

  // ── Active tab ────────────────────────────────────────────────────────────
  const [viewType, setViewType] = useState<TransactionType | 'groups'>('expense')

  // ── Groups form ───────────────────────────────────────────────────────────
  const {
    register:    grpReg,
    watch:       grpWatch,
    setValue:    grpSet,
    handleSubmit: grpHandle,
    reset:       grpReset,
    formState:   { errors: grpErr, isSubmitting: grpSubmitting },
  } = useForm<GrpFormValues>({
    defaultValues: {
      groupId:       '',
      payerType:     'me',
      payerMemberId: '',
      accountId:     '',
      description:   '',
      date:          isoToday(),
      category:      'food',
      totalAmount:   '',
    },
  })

  const grpGroupId   = grpWatch('groupId')
  const grpPayerType = grpWatch('payerType')
  const grpTotal     = grpWatch('totalAmount')

  const [grpMembers,    setGrpMembers]    = useState<GroupMember[]>([])
  const [grpSplits,     setGrpSplits]     = useState<GrpSplitRow[]>([])
  const [grpSplitMode,  setGrpSplitMode]  = useState<'even' | 'percent' | 'custom'>('even')
  const [grpPercents,   setGrpPercents]   = useState<Record<number, string>>({})
  const [grpSplitError, setGrpSplitError] = useState('')
  const [grpCreateTx,   setGrpCreateTx]   = useState(false)

  // Linked group entry (when editing a transaction that was already associated with a group)
  const [linkedGrpEntry,  setLinkedGrpEntry]  = useState<GroupEntry | null>(null)
  const [linkedGrpSplits, setLinkedGrpSplits] = useState<GroupEntrySplit[]>([])

  const grpMyMember = grpMembers.find(m => m.userId === user?.id)

  // ── Standard tx form ──────────────────────────────────────────────────────
  const txHook = useTransactionForm({
    open:             open && viewType !== 'groups',
    onClose,
    transaction:      viewType !== 'groups' ? transaction : undefined,
    defaultType:      viewType !== 'groups' ? viewType as TransactionType : 'expense',
    defaultAccountId,
  })

  const {
    form,
    isTransfer,
    isValid,
    categories,
    accountOptions,
    selectedType,
    selectedFrom,
    selectedTo,
    splitN,
    isReimbursable,
    personalUserId,
    holdingId,
    isSharedAccount,
    sharedAccountParticipants,
    selectedAccount,
    handleTypeChange,
    handleFromChange,
    onSubmit,
  } = txHook
  const { register, watch, setValue, formState: { errors, isSubmitting } } = form
  const isShared = watch('isShared')

  // Investment account detection
  const isInvestmentAccount = selectedAccount?.type === 'investment' && !isTransfer
  const investAccountId = isInvestmentAccount && selectedAccount?.id != null ? selectedAccount.id : undefined
  const { data: accountHoldings = [] } = useHoldingsByAccount(investAccountId)

  // ── Load linked group entry when editing a transaction or SE ────────────
  useEffect(() => {
    if (!open) { setLinkedGrpEntry(null); setLinkedGrpSplits([]); return }
    const lookup = transaction?.id
      ? groupsRepo.getEntryByTransactionId(transaction.id)
      : sharedExpense?.id
        ? groupsRepo.getEntryBySharedExpenseId(sharedExpense.id)
        : Promise.resolve(null)
    lookup
      .then(result => {
        if (result) {
          setLinkedGrpEntry(result.entry)
          setLinkedGrpSplits(result.splits)
        } else {
          setLinkedGrpEntry(null)
          setLinkedGrpSplits([])
        }
      })
      .catch(() => { setLinkedGrpEntry(null); setLinkedGrpSplits([]) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction?.id, sharedExpense?.id])

  // ── Pre-fill grp form from linked entry once it loads ─────────────────────
  useEffect(() => {
    if (!linkedGrpEntry || !open) return
    const txAmount = fromCents(linkedGrpEntry.totalAmount).toFixed(2)
    grpReset(prev => ({
      ...prev,
      groupId:     String(linkedGrpEntry.groupId),
      description: linkedGrpEntry.description,
      date:        linkedGrpEntry.date,
      category:    linkedGrpEntry.category,
      totalAmount: txAmount,
      accountId:   transaction ? String(transaction.accountId) : prev.accountId,
    }))
    // Switch to groups tab so the pre-filled form is immediately visible
    setViewType('groups')
    // splits + payerType will be resolved once members load (members effect reads linkedGrp*)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedGrpEntry, open])

  // ── Reset on modal open ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const vt = defaultType ?? 'expense'
    setViewType(vt)
    if (transaction) setViewType(transaction.type)

    const fallbackAccount = defaultAccountId ?? (accounts[0]?.id ? String(accounts[0].id) : '')

    if (sharedExpense) {
      // SE with payer=other: open Groups tab pre-filled from SE data
      setViewType('groups')
      grpReset({
        groupId:       '',
        payerType:     'member',
        payerMemberId: '',
        accountId:     fallbackAccount,
        description:   sharedExpense.description ?? '',
        date:          sharedExpense.date ?? isoToday(),
        category:      sharedExpense.category ?? 'food',
        totalAmount:   fromCents(sharedExpense.totalAmount).toFixed(2),
      })
    } else {
      // Pre-fill from existing transaction when available
      const txAmount = transaction ? fromCents(Math.abs(transaction.amount)).toFixed(2) : ''
      grpReset({
        groupId:       '',
        payerType:     'me',
        payerMemberId: '',
        accountId:     transaction ? String(transaction.accountId) : fallbackAccount,
        description:   transaction?.description ?? '',
        date:          transaction?.date ?? isoToday(),
        category:      transaction?.category ?? 'food',
        totalAmount:   txAmount,
      })
    }
    setGrpMembers([])
    setGrpSplits([])
    setGrpSplitMode('even')
    setGrpPercents({})
    setGrpSplitError('')
    setGrpCreateTx(false)
    setLinkedGrpEntry(null)
    setLinkedGrpSplits([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction, sharedExpense, defaultType, defaultAccountId])

  // ── Load group members when group changes ─────────────────────────────────
  useEffect(() => {
    if (!grpGroupId) { setGrpMembers([]); setGrpSplits([]); return }
    groupsRepo.getMembers(parseInt(grpGroupId))
      .then(ms => {
        setGrpMembers(ms)
        setGrpSplitError('')
        const myM       = ms.find(m => m.userId === user?.id)
        const isLinked  = linkedGrpEntry && linkedGrpEntry.groupId === parseInt(grpGroupId)

        if (isLinked && linkedGrpSplits.length > 0) {
          // Pre-fill from linked entry
          setGrpSplits(linkedGrpSplits.map(s => ({
            memberId: s.memberId,
            amount:   fromCents(s.amount).toFixed(2),
          })))
          setGrpSplitMode('custom')
          // Resolve payerType
          if (myM && linkedGrpEntry!.paidByMemberId === myM.id) {
            grpSet('payerType', 'me')
            grpSet('payerMemberId', '')
          } else {
            grpSet('payerType', 'member')
            grpSet('payerMemberId', String(linkedGrpEntry!.paidByMemberId))
          }
        } else {
          setGrpSplits(ms.map(m => ({ memberId: m.id!, amount: '' })))
          setGrpSplitMode('even')
          const firstOther = ms.find(m => m.userId !== user?.id)
          if (firstOther) grpSet('payerMemberId', String(firstOther.id))
          else if (ms.length > 0) grpSet('payerMemberId', String(ms[0].id))
        }
      })
      .catch(() => setGrpMembers([]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grpGroupId, linkedGrpEntry, linkedGrpSplits])

  // ── Recompute even splits when total or members change ────────────────────
  useEffect(() => {
    if (grpSplitMode !== 'even' || grpMembers.length === 0) return
    const totalCents  = toCents(parseFloat(grpTotal) || 0)
    const distributed = distributeEvenly(totalCents, grpMembers.map(m => m.id!))
    setGrpSplits(grpMembers.map(m => ({
      memberId: m.id!,
      amount:   fromCents(distributed[m.id!] ?? 0).toFixed(2),
    })))
  }, [grpTotal, grpSplitMode, grpMembers])

  // ── Recompute percent splits when total or percents change ─────────────────
  useEffect(() => {
    if (grpSplitMode !== 'percent' || grpMembers.length === 0) return
    const totalCents = toCents(parseFloat(grpTotal) || 0)
    setGrpSplits(grpMembers.map(m => {
      const pct      = parseFloat(grpPercents[m.id!] || '0') / 100
      const amtCents = Math.round(totalCents * pct)
      return { memberId: m.id!, amount: fromCents(amtCents).toFixed(2) }
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grpTotal, grpSplitMode, grpPercents, grpMembers])

  // ── Tab change ────────────────────────────────────────────────────────────
  const handleViewTypeChange = (vt: TransactionType | 'groups') => {
    setViewType(vt)
    if (vt !== 'groups') {
      handleTypeChange(vt as TransactionType)
    } else if (!linkedGrpEntry) {
      // Pre-fill from standard form only when no linked entry exists
      const stdValues = form.getValues()
      const stdAmount = parseFloat(String(stdValues.amount).replace(',', '.'))
      grpReset(prev => ({
        ...prev,
        description: stdValues.description || prev.description,
        date:        stdValues.date        || prev.date,
        category:    stdValues.category    || prev.category,
        totalAmount: !isNaN(stdAmount) && stdAmount > 0
          ? stdAmount.toFixed(2)
          : prev.totalAmount,
      }))
    }
    // If linkedGrpEntry exists, form is already pre-filled from the linkedGrpEntry effect
  }

  // ── Groups submit ─────────────────────────────────────────────────────────
  const onSubmitGrp = grpHandle(async (values) => {
    if (!user) return
    const groupId = parseInt(values.groupId)
    if (!groupId || grpMembers.length === 0) return

    const totalCents = toCents(parseFloat(values.totalAmount) || 0)
    if (totalCents <= 0) return

    // Build split cents
    const splitCents = grpSplits.map(s => ({
      memberId: s.memberId,
      amount:   toCents(parseFloat(s.amount) || 0),
    }))

    // Validate sum
    const splitSum = splitCents.reduce((sum, s) => sum + s.amount, 0)
    if (Math.abs(splitSum - totalCents) > grpMembers.length) {
      setGrpSplitError(t('groups.splitSumMismatch'))
      return
    }

    const paidByMemberId = values.payerType === 'me'
      ? (grpMyMember?.id ?? parseInt(values.payerMemberId))
      : parseInt(values.payerMemberId)

    if (linkedGrpEntry?.id != null) {
      // Update existing linked group entry (idempotent if unchanged)
      await updateGroupEntry(
        linkedGrpEntry.id,
        groupId,
        {
          description:    values.description.trim() || values.category,
          date:           values.date,
          category:       values.category,
          totalAmount:    totalCents,
          paidByMemberId,
        },
        splitCents.map(s => ({ entryId: linkedGrpEntry.id!, memberId: s.memberId, amount: s.amount })),
      )
    } else {
      // Create new group entry + optionally a bank transaction
      let newTxId: number | undefined
      if (values.payerType === 'me' && grpCreateTx && values.accountId) {
        newTxId = await addTransaction({
          accountId:      parseInt(values.accountId),
          amount:         -totalCents,
          type:           'expense',
          category:       values.category,
          description:    values.description.trim() || values.category,
          date:           values.date,
          isReimbursable: true,
        })
      }
      await addGroupEntry(
        {
          groupId,
          description:      values.description.trim() || values.category,
          date:             values.date,
          category:         values.category,
          totalAmount:      totalCents,
          paidByMemberId,
          transactionId:    newTxId ?? transaction?.id,   // link to bank tx if available
          sharedExpenseId:  sharedExpense?.id,            // link to SE (payer=other) if editing one
          createdBy:        user.id,
        },
        splitCents.map(s => ({ entryId: 0, memberId: s.memberId, amount: s.amount })),
      )
    }

    onClose()
  })

  // ── Derived ───────────────────────────────────────────────────────────────
  const isRoundupEdit = isEditTx && transaction?.category === 'roundup'

  const grpCanSubmit =
    grpGroupId !== '' &&
    grpMembers.length > 0 &&
    !!grpMyMember &&
    (!grpCreateTx || grpWatch('accountId') !== '') &&
    parseFloat(grpWatch('totalAmount')) > 0

  const stdCanSubmit = accounts.length > 0 && isValid

  // My share & owed amount (for summary)
  const grpTotalCents = toCents(parseFloat(grpTotal) || 0)
  const grpMyShare    = grpSplits.find(s => s.memberId === grpMyMember?.id)
  const grpMyShareCents = grpMyShare ? toCents(parseFloat(grpMyShare.amount) || 0) : 0
  const grpOthersOwe    = grpTotalCents - grpMyShareCents

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEditTx ? t('transactions.editTitle') : t('transactions.newTitle')}</DialogTitle>
        </DialogHeader>

        {/* ── Groups form ────────────────────────────────────────────────── */}
        {viewType === 'groups' ? (
          <form onSubmit={onSubmitGrp} className="space-y-4 py-2">
            <TransactionTypeTabs value={viewType} onChange={handleViewTypeChange} activeTabs={linkedGrpEntry ? ['groups'] : []} />

            {/* No groups yet */}
            {groups.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">{t('groups.noGroupsTabMsg')}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { onClose(); navigate('/groups') }}
                >
                  {t('groups.goToGroups')}
                </Button>
              </div>
            ) : (
              <>
                {/* Group selector */}
                <div className="space-y-1.5">
                  <Label>{t('groups.title')}</Label>
                  <Select value={grpGroupId} onValueChange={v => grpSet('groupId', v)}>
                    <SelectTrigger className={!grpGroupId && grpErr.groupId ? 'border-destructive' : ''}>
                      <SelectValue placeholder={t('groups.selectGroup')} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map(g => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {grpGroupId && grpMembers.length > 0 && !grpMyMember && (
                    <p className="text-xs text-amber-600">{t('groups.notMember')}</p>
                  )}
                </div>

                {grpGroupId && grpMembers.length > 0 && (
                  <>
                    {/* Who paid */}
                    <div className="space-y-1.5">
                      <Label>{t('groups.paidBy')}</Label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${grpPayerType === 'me' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
                          onClick={() => grpSet('payerType', 'me')}
                        >
                          {t('groups.iPaid')}
                        </button>
                        <button
                          type="button"
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${grpPayerType === 'member' ? 'bg-amber-500 text-white border-amber-500' : 'hover:bg-accent'}`}
                          onClick={() => grpSet('payerType', 'member')}
                        >
                          {t('groups.memberPaid')}
                        </button>
                      </div>
                    </div>

                    {/* Create bank transaction toggle (only when I paid) */}
                    {grpPayerType === 'me' && (
                      <div className="rounded-lg border overflow-hidden">
                        <label
                          className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-accent/60 transition-colors"
                          onClick={e => { e.preventDefault(); setGrpCreateTx(v => !v) }}
                        >
                          <div>
                            <p className="text-sm font-medium leading-none">{t('transactions.reimbursable')}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t('transactions.reimbursableDesc')}</p>
                          </div>
                          <Toggle on={grpCreateTx} />
                        </label>
                        {grpCreateTx && (
                          <div className="px-4 pb-3 border-t bg-muted/20 pt-3">
                            <Label className="text-xs mb-1.5 block">{t('groups.debitAccount')}</Label>
                            <Select value={grpWatch('accountId')} onValueChange={v => grpSet('accountId', v)}>
                              <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                              <SelectContent>
                                {accounts.map(acc => (
                                  <SelectItem key={acc.id} value={String(acc.id)}>{acc.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Member who paid (if member paid) — excludes me */}
                    {grpPayerType === 'member' && (
                      <div className="space-y-1.5">
                        <Label>{t('groups.paidBy')}</Label>
                        <Select value={grpWatch('payerMemberId')} onValueChange={v => grpSet('payerMemberId', v)}>
                          <SelectTrigger><SelectValue placeholder="Select member..." /></SelectTrigger>
                          <SelectContent>
                            {grpMembers
                              .filter(m => m.userId !== user?.id)
                              .map(m => (
                                <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Description + Date */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="grp-desc">{t('transactions.colDescription')}</Label>
                        <Input
                          id="grp-desc"
                          placeholder="Jantar, táxi..."
                          {...grpReg('description')}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="grp-date">{t('transactions.colDate')}</Label>
                        <Input id="grp-date" type="date" {...grpReg('date', { required: true })} />
                      </div>
                    </div>

                    {/* Category + Total */}
                    <div className="grid grid-cols-2 gap-3">
                      <CategorySelect
                        categories={EXPENSE_CATS}
                        value={grpWatch('category')}
                        onChange={v => grpSet('category', v)}
                      />
                      <div className="space-y-1.5">
                        <Label htmlFor="grp-total">{t('groups.totalAmount')}</Label>
                        <Input
                          id="grp-total"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          {...grpReg('totalAmount', { required: true, min: 0.01 })}
                          className={grpErr.totalAmount ? 'border-destructive' : ''}
                        />
                      </div>
                    </div>

                    {/* Split mode */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label>{t('groups.splitAmong')}</Label>
                        <div className="flex rounded-md border overflow-hidden ml-auto text-xs">
                          <button
                            type="button"
                            onClick={() => { setGrpSplitMode('even'); setGrpSplitError('') }}
                            className={`px-3 py-1 transition-colors ${grpSplitMode === 'even' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                          >
                            {t('groups.splitEvenly')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const totalCents = toCents(parseFloat(grpWatch('totalAmount')) || 0)
                              const percents: Record<number, string> = {}
                              if (grpSplitMode === 'custom' && totalCents > 0) {
                                grpMembers.forEach(m => {
                                  const split = grpSplits.find(s => s.memberId === m.id)
                                  const pct = (toCents(parseFloat(split?.amount || '0')) / totalCents) * 100
                                  percents[m.id!] = pct.toFixed(2)
                                })
                              } else {
                                const even = grpMembers.length > 0 ? 100 / grpMembers.length : 0
                                grpMembers.forEach((m, i) => {
                                  percents[m.id!] = i < grpMembers.length - 1
                                    ? even.toFixed(2)
                                    : (100 - even * (grpMembers.length - 1)).toFixed(2)
                                })
                              }
                              setGrpPercents(percents)
                              setGrpSplitMode('percent')
                              setGrpSplitError('')
                            }}
                            className={`px-3 py-1 transition-colors border-l ${grpSplitMode === 'percent' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                          >
                            {t('groups.splitByPercent')}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setGrpSplitMode('custom'); setGrpSplitError('') }}
                            className={`px-3 py-1 transition-colors border-l ${grpSplitMode === 'custom' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                          >
                            {t('groups.splitCustom')}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 rounded-lg border p-3">
                        {grpSplits.map(split => {
                          const member = grpMembers.find(m => m.id === split.memberId)
                          const isMe   = member?.userId === user?.id
                          return (
                            <div key={split.memberId} className="flex items-center gap-3">
                              <span className="flex-1 text-sm truncate">
                                {member?.name ?? '?'}
                                {isMe && <span className="ml-1 text-xs text-muted-foreground">({t('groups.youInGroup')})</span>}
                              </span>
                              {grpSplitMode === 'percent' ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={grpPercents[split.memberId] ?? ''}
                                    onChange={e => {
                                      setGrpPercents(prev => ({ ...prev, [split.memberId]: e.target.value }))
                                      setGrpSplitError('')
                                    }}
                                    className="w-20 text-right"
                                  />
                                  <span className="text-xs text-muted-foreground">%</span>
                                  <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
                                    {split.amount} €
                                  </span>
                                </div>
                              ) : (
                                <div className="w-28">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={split.amount}
                                    onChange={e => {
                                      setGrpSplits(prev => prev.map(s => s.memberId === split.memberId ? { ...s, amount: e.target.value } : s))
                                      setGrpSplitError('')
                                    }}
                                    readOnly={grpSplitMode === 'even'}
                                    className={`text-right ${grpSplitMode === 'even' ? 'bg-muted text-muted-foreground' : ''}`}
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {grpSplitMode === 'percent' && grpMembers.length > 0 && (() => {
                          const pctSum = grpMembers.reduce((s, m) => s + parseFloat(grpPercents[m.id!] || '0'), 0)
                          const diff = Math.abs(pctSum - 100)
                          return (
                            <div className={`text-xs text-right pt-1 border-t tabular-nums ${diff > 0.5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {pctSum.toFixed(2)}% / 100%
                            </div>
                          )
                        })()}
                      </div>
                      {grpSplitError && <p className="text-sm text-destructive">{grpSplitError}</p>}
                    </div>

                    {/* Summary */}
                    {grpTotalCents > 0 && grpMyMember && (
                      <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('groups.yourShare')}</span>
                          <span className="font-medium">{fromCents(grpMyShareCents).toFixed(2)} €</span>
                        </div>
                        {grpPayerType === 'me' && grpOthersOwe > 0 && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{t('groups.othersOweYou')}</span>
                            <span className="text-emerald-600 font-medium">{fromCents(grpOthersOwe).toFixed(2)} €</span>
                          </div>
                        )}
                        {grpPayerType === 'me' && grpCreateTx && grpOthersOwe > 0 && (
                          <p className="text-xs text-muted-foreground pt-1 border-t">
                            {t('groups.reimbursableNote', { amount: `${fromCents(grpOthersOwe).toFixed(2)} €` })}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
              {groups.length > 0 && (
                <Button type="submit" disabled={grpSubmitting || !grpCanSubmit}>
                  {t('transactions.addTransaction')}
                </Button>
              )}
            </DialogFooter>
          </form>

        ) : (
          /* ── Standard form ─────────────────────────────────────────────── */
          <form onSubmit={onSubmit} className="space-y-4 py-2">
            <TransactionTypeTabs value={viewType} onChange={handleViewTypeChange} activeTabs={linkedGrpEntry ? ['groups'] : []} />

            <AccountSelector
              isTransfer={isTransfer}
              fromId={selectedFrom}
              toId={selectedTo}
              onFromChange={handleFromChange}
              onToChange={v => setValue('toId', v)}
              accountOptions={accountOptions}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="tx-amount">Amount</Label>
                <Input
                  id="tx-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  {...register('amount', {
                    required: true,
                    validate: v => parseFloat(String(v).replace(',', '.')) >= 0.01 || 'Must be > 0',
                  })}
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="tx-date">Date</Label>
                <Input id="tx-date" type="date" {...register('date', { required: true })} />
              </div>
            </div>

            <CategorySelect
              categories={categories}
              value={form.watch('category')}
              onChange={v => setValue('category', v)}
            />

            <div className="space-y-1">
              <Label htmlFor="tx-desc">Description</Label>
              <Input id="tx-desc" placeholder="e.g. Electricity bill" {...register('description')} />
            </div>

            {!isTransfer && !isRoundupEdit && (
              <div className="rounded-lg border overflow-hidden">
                <label
                  className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-accent/60 transition-colors"
                  onClick={e => {
                    e.preventDefault()
                    setValue('isShared', !isShared)
                    if (isShared && isSharedAccount) {  // turning OFF sharing
                      setValue('personalUserId', user?.id ?? '')
                    }
                  }}
                >
                  <div>
                    <p className="text-sm font-medium leading-none">{t('transactions.sharedWithParticipants')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('transactions.sharedWithParticipantsDesc')}</p>
                  </div>
                  <Toggle on={isShared} />
                </label>
                {isShared && (
                  <div className="flex items-center gap-2 px-4 py-2.5 border-t bg-muted/30">
                    <span className="text-xs text-muted-foreground">{t('transactions.splitBy')}</span>
                    <Input
                      type="number"
                      min={2}
                      step={1}
                      className="h-7 w-16 text-sm text-center"
                      {...register('splitN', { valueAsNumber: true, min: 2 })}
                    />
                    <span className="text-xs text-muted-foreground">
                      {t('transactions.people')}
                      {splitN >= 2 && (
                        <span className="ml-1 text-muted-foreground/60">
                          · {t('transactions.myShare')}: {Math.round(100 / splitN)}%
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {!isShared && isSharedAccount && sharedAccountParticipants.length > 1 && (
                  <div className="px-4 pb-3 border-t bg-muted/20 pt-3 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('transactions.personalFor')}</Label>
                    <Select
                      value={personalUserId || ''}
                      onValueChange={v => setValue('personalUserId', v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select participant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sharedAccountParticipants.map(p => (
                          <SelectItem key={p.userId} value={p.userId}>
                            {p.name}{p.isMe ? ` (${t('groups.youInGroup')})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {selectedType === 'expense' && !isRoundupEdit && (
              <label
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border cursor-pointer hover:bg-accent/60 transition-colors"
                onClick={e => { e.preventDefault(); setValue('isReimbursable', !isReimbursable) }}
              >
                <div>
                  <p className="text-sm font-medium leading-none">{t('transactions.reimbursable')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('transactions.reimbursableDesc')}</p>
                </div>
                <Toggle on={isReimbursable} color="bg-amber-500" />
              </label>
            )}

            {/* Investment details — only for investment accounts */}
            {isInvestmentAccount && (
              <div className="rounded-lg border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b">
                  <p className="text-sm font-medium">{t('investments.investmentDetails')}</p>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label>{t('investments.holding')}</Label>
                    <Select
                      value={holdingId ?? ''}
                      onValueChange={v => setValue('holdingId', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('investments.noLink')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t('investments.noLink')}</SelectItem>
                        {accountHoldings.map(h => (
                          <SelectItem key={h.id} value={String(h.id)}>
                            {h.name}{h.ticker ? ` (${h.ticker.toUpperCase()})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {holdingId && (
                    <div className="space-y-1.5">
                      <Label htmlFor="tx-units">{t('investments.units')}</Label>
                      <Input
                        id="tx-units"
                        type="number"
                        step="0.000001"
                        min="0"
                        placeholder="0"
                        {...register('units')}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>{t('common.cancel')}</Button>
              <Button type="submit" loading={isSubmitting} disabled={!stdCanSubmit}>
                {isEditTx ? t('common.save') : t('transactions.addTransaction')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
