import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import PlainSelect from '@/shared/components/PlainSelect'
import AmountInput from '@/shared/components/AmountInput'
import DateInput from '@/shared/components/DateInput'
import FormToggle from '@/shared/components/FormToggle'
import CategorySelect from '@/features/transactions/components/CategorySelect'
import SplitSection from './SplitSection'
import type { SplitRow } from './SplitSection'
import { toCents, fromCents } from '@/domain/money'
import { GROUP_EXPENSE_CATS } from '@/features/transactions/components/useGroupTransactionForm'
import { addGroupEntry, updateGroupEntry } from '@/shared/hooks/useGroups'
import { addTransaction, updateTransaction, removeTransaction } from '@/shared/hooks/useTransactions'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { buildAccountSelectOption } from '@/features/transactions/components/accountSelectOptions'
import { supabase } from '@/data/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { useT } from '@/shared/i18n'
import { isoToday } from '@/shared/utils/format'
import type { GroupEntry, GroupEntrySplit, GroupMember } from '@/domain/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseMoney = (v: string) => parseFloat(String(v).replace(',', '.')) || 0

function distributeEvenly(totalCents: number, memberIds: number[]): Record<number, number> {
  if (memberIds.length === 0) return {}
  const base      = Math.floor(totalCents / memberIds.length)
  const remainder = totalCents - base * memberIds.length
  return Object.fromEntries(memberIds.map((id, i) => [id, i < remainder ? base + 1 : base]))
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormValues {
  description:   string
  date:          string
  category:      string
  totalAmount:   string
  payerType:     'me' | 'member'
  payerMemberId: string
  notes:         string
}

interface Props {
  open:            boolean
  onClose:         () => void
  groupId:         number
  members:         GroupMember[]
  entry?:          GroupEntry
  existingSplits?: GroupEntrySplit[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GroupEntryModal({ open, onClose, groupId, members, entry, existingSplits }: Props) {
  const t        = useT()
  const { user } = useAuth()
  const isEdit   = !!entry

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      description: '', date: isoToday(), category: 'food',
      totalAmount: '', payerType: 'me', payerMemberId: '', notes: '',
    },
  })

  const { data: accounts = [] } = useSortedAccounts()
  const [splits,     setSplits]     = useState<SplitRow[]>([])
  const [splitMode,  setSplitMode]  = useState<'even' | 'percent' | 'custom'>('even')
  const [percents,   setPercents]   = useState<Record<number, string>>({})
  const [splitError, setSplitError] = useState('')
  const [createTx,   setCreateTx]   = useState(true)
  const [txAccountId, setTxAccountId] = useState('')

  const myMember    = members.find(m => m.userId === user?.id)
  const payerType   = watch('payerType')
  const payerMemberId = watch('payerMemberId')
  const totalStr    = watch('totalAmount')
  const iAmPayer    = payerType === 'me'

  const memberOptions = members
    .filter(m => m.userId !== user?.id)
    .map(m => ({ value: String(m.id), label: m.name }))
  const accountOptions = accounts.map(buildAccountSelectOption)

  // ── Derived summary ───────────────────────────────────────────────────────

  const totalCents    = toCents(parseMoney(totalStr))
  const myShareCents  = splits.find(s => s.memberId === myMember?.id)
    ? toCents(parseMoney(splits.find(s => s.memberId === myMember?.id)!.amount))
    : 0
  const othersOweCents = totalCents - myShareCents

  // ── Init when modal opens ─────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return

    const defaultPayerMemberId = memberOptions[0]?.value ?? ''

    if (isEdit && entry) {
      const entryPaidByMe = myMember != null && entry.paidByMemberId === myMember.id
      reset({
        description:   entry.description,
        date:          entry.date,
        category:      entry.category,
        totalAmount:   fromCents(entry.totalAmount).toFixed(2),
        payerType:     entryPaidByMe ? 'me' : 'member',
        payerMemberId: entryPaidByMe ? '' : String(entry.paidByMemberId),
        notes:         entry.notes ?? '',
      })
      if (existingSplits && existingSplits.length > 0) {
        setSplits(existingSplits.map(s => ({ memberId: s.memberId, amount: fromCents(s.amount).toFixed(2) })))
        setSplitMode('custom')
      } else {
        setSplits(members.map(m => ({ memberId: m.id!, amount: '' })))
        setSplitMode('even')
      }
      if (entry.transactionId) {
        supabase.from('transactions').select('account_id').eq('id', entry.transactionId).single()
          .then(({ data }) => {
            if (data) {
              setTxAccountId(String((data as { account_id: number }).account_id))
              setCreateTx(true)
            } else {
              setTxAccountId(accounts[0]?.id ? String(accounts[0].id) : '')
              setCreateTx(false)
            }
          })
      } else {
        setTxAccountId(accounts[0]?.id ? String(accounts[0].id) : '')
        setCreateTx(false)
      }
    } else {
      reset({
        description: '', date: isoToday(), category: 'food',
        totalAmount: '', payerType: 'me', payerMemberId: defaultPayerMemberId, notes: '',
      })
      setSplits(members.map(m => ({ memberId: m.id!, amount: '' })))
      setSplitMode('even')
      setPercents({})
      setCreateTx(true)
      setTxAccountId(accounts[0]?.id ? String(accounts[0].id) : '')
    }
    setSplitError('')
  }, [open, entry, existingSplits, members, isEdit, reset, accounts, myMember])

  // ── Recompute even splits ─────────────────────────────────────────────────

  useEffect(() => {
    if (splitMode !== 'even' || members.length === 0) return
    const distributed = distributeEvenly(toCents(parseMoney(totalStr)), members.map(m => m.id!))
    setSplits(members.map(m => ({ memberId: m.id!, amount: fromCents(distributed[m.id!] ?? 0).toFixed(2) })))
  }, [totalStr, splitMode, members])

  // ── Recompute percent splits ──────────────────────────────────────────────

  useEffect(() => {
    if (splitMode !== 'percent' || members.length === 0) return
    const cents = toCents(parseMoney(totalStr))
    setSplits(members.map(m => {
      const pct = parseFloat(percents[m.id!] || '0') / 100
      return { memberId: m.id!, amount: fromCents(Math.round(cents * pct)).toFixed(2) }
    }))
  }, [totalStr, splitMode, percents, members])

  // ── Switch to percent mode ────────────────────────────────────────────────

  function handleSwitchToPercent() {
    const cents = toCents(parseMoney(totalStr))
    const newPcts: Record<number, string> = {}
    if (splitMode === 'custom' && cents > 0) {
      members.forEach(m => {
        const split = splits.find(s => s.memberId === m.id)
        newPcts[m.id!] = ((toCents(parseMoney(split?.amount || '0')) / cents) * 100).toFixed(2)
      })
    } else {
      const even = members.length > 0 ? 100 / members.length : 0
      members.forEach((m, i) => {
        newPcts[m.id!] = i < members.length - 1 ? even.toFixed(2) : (100 - even * (members.length - 1)).toFixed(2)
      })
    }
    setPercents(newPcts)
    setSplitMode('percent')
    setSplitError('')
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    if (!user) return
    setSplitError('')

    const total = toCents(parseMoney(values.totalAmount))
    if (total <= 0) return

    const splitCents = splits.map(s => ({ memberId: s.memberId, amount: toCents(parseMoney(s.amount)) }))
    const splitSum   = splitCents.reduce((sum, s) => sum + s.amount, 0)
    if (Math.abs(splitSum - total) > members.length) {
      setSplitError(t('groups.splitSumMismatch'))
      return
    }

    const paidByMemberId = values.payerType === 'me'
      ? (myMember?.id ?? parseInt(values.payerMemberId))
      : parseInt(values.payerMemberId)

    const iPayer       = values.payerType === 'me' && myMember != null
    const shouldLinkTx = iPayer && createTx && txAccountId !== ''

    const baseEntry = {
      groupId,
      description:    values.description.trim(),
      date:           values.date,
      category:       values.category,
      totalAmount:    total,
      paidByMemberId,
      notes:          values.notes.trim() || undefined,
      createdBy:      user.id,
    }

    const splitsData: Omit<GroupEntrySplit, 'id'>[] = splitCents.map(s => ({
      entryId:  entry?.id ?? 0,
      memberId: s.memberId,
      amount:   s.amount,
    }))

    const txPayload = shouldLinkTx ? {
      accountId:      parseInt(txAccountId),
      amount:         -total,
      type:           'expense' as const,
      category:       values.category,
      description:    values.description.trim(),
      date:           values.date,
      isReimbursable: true,
    } : null

    if (isEdit && entry?.id != null) {
      const prevTxId = entry.transactionId
      let newTxId: number | undefined
      if (txPayload) {
        if (prevTxId != null) { await updateTransaction(prevTxId, txPayload); newTxId = prevTxId }
        else { newTxId = await addTransaction(txPayload) ?? undefined }
      } else if (prevTxId != null) {
        await removeTransaction(prevTxId)
      }
      await updateGroupEntry(entry.id, groupId, { ...baseEntry, transactionId: newTxId }, splitsData)
    } else {
      let txId: number | undefined
      if (txPayload) txId = await addTransaction(txPayload) ?? undefined
      await addGroupEntry({ ...baseEntry, transactionId: txId }, splitsData)
    }

    onClose()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('groups.editEntry') : t('groups.newEntry')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">

          {/* Who paid — tabs */}
          <div className="space-y-1.5">
            <Label>{t('groups.paidBy')}</Label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${iAmPayer ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
                onClick={() => setValue('payerType', 'me')}
              >
                {t('groups.iPaid')}
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${!iAmPayer ? 'bg-amber-500 text-white border-amber-500' : 'hover:bg-accent'}`}
                onClick={() => setValue('payerType', 'member')}
              >
                {t('groups.memberPaid')}
              </button>
            </div>
          </div>

          {/* I paid — reimbursable toggle + account */}
          {iAmPayer && (
            <div className="rounded-lg border">
              <label
                className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-accent/60 transition-colors"
                onClick={e => { e.preventDefault(); setCreateTx(!createTx) }}
              >
                <div>
                  <p className="text-sm font-medium leading-none">{t('transactions.reimbursable')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('transactions.reimbursableDesc')}</p>
                </div>
                <FormToggle on={createTx} />
              </label>
              {createTx && (
                <div className="px-4 pb-3 border-t bg-muted/20 pt-3">
                  <Label className="text-xs mb-1.5 block">{t('groups.debitAccount')}</Label>
                  <PlainSelect
                    value={txAccountId}
                    onChange={setTxAccountId}
                    options={accountOptions}
                    placeholder="Select account..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Member paid — who? */}
          {!iAmPayer && (
            <div className="space-y-1.5">
              <Label>{t('groups.paidBy')}</Label>
              <PlainSelect
                value={payerMemberId}
                onChange={v => setValue('payerMemberId', v)}
                options={memberOptions}
                placeholder="Select member..."
              />
            </div>
          )}

          {/* Description + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ge-desc">{t('transactions.colDescription')}</Label>
              <Input
                id="ge-desc"
                placeholder="Dinner, taxi, groceries..."
                {...register('description', { required: true })}
                className={errors.description ? 'border-destructive' : ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ge-date">{t('transactions.colDate')}</Label>
              <DateInput id="ge-date" value={watch('date') ?? ''} onChange={v => setValue('date', v)} />
            </div>
          </div>

          {/* Category + Total */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CategorySelect
              categories={GROUP_EXPENSE_CATS}
              value={watch('category')}
              onChange={v => setValue('category', v)}
            />
            <div className="space-y-1.5">
              <Label htmlFor="ge-total">{t('groups.totalAmount')}</Label>
              <AmountInput
                id="ge-total"
                placeholder="0.00"
                {...register('totalAmount', {
                  required: true,
                  validate: v => parseMoney(v) >= 0.01 || 'Must be > 0',
                })}
                className={errors.totalAmount ? 'border-destructive' : ''}
              />
            </div>
          </div>

          {/* Split */}
          <SplitSection
            members={members}
            splits={splits}
            setSplits={setSplits}
            splitMode={splitMode}
            setSplitMode={setSplitMode}
            setSplitError={setSplitError}
            percents={percents}
            setPercents={setPercents}
            splitError={splitError}
            currentUserId={user?.id}
            handleSwitchToPercent={handleSwitchToPercent}
          />

          {/* Summary */}
          {totalCents > 0 && myMember && (
            <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('groups.yourShare')}</span>
                <span className="font-medium">{fromCents(myShareCents).toFixed(2)} €</span>
              </div>
              {iAmPayer && othersOweCents > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('groups.othersOweYou')}</span>
                  <span className="text-emerald-600 font-medium">{fromCents(othersOweCents).toFixed(2)} €</span>
                </div>
              )}
              {iAmPayer && createTx && othersOweCents > 0 && (
                <p className="text-xs text-muted-foreground pt-1 border-t">
                  {t('groups.reimbursableNote', { amount: `${fromCents(othersOweCents).toFixed(2)} €` })}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="ge-notes">{t('common.notes') ?? 'Notes (optional)'}</Label>
            <Input id="ge-notes" placeholder="Optional note..." {...register('notes')} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={isSubmitting}>{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
