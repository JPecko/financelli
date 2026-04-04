import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { cn } from '@/lib/utils'
import PlainSelect from '@/shared/components/PlainSelect'
import AmountInput from '@/shared/components/AmountInput'
import DateInput from '@/shared/components/DateInput'
import { toCents, fromCents } from '@/domain/money'
import { CATEGORIES, tCategory } from '@/domain/categories'
import { addGroupEntry, updateGroupEntry } from '@/shared/hooks/useGroups'
import { addTransaction, updateTransaction, removeTransaction } from '@/shared/hooks/useTransactions'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { buildAccountSelectOption } from '@/features/transactions/components/accountSelectOptions'
import { supabase } from '@/data/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { useT } from '@/shared/i18n'
import type { GroupEntry, GroupEntrySplit, GroupMember } from '@/domain/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseMoney = (v: string) => parseFloat(String(v).replace(',', '.')) || 0

function today() {
  return new Date().toISOString().slice(0, 10)
}

function distributeEvenly(totalCents: number, memberIds: number[]): Record<number, number> {
  if (memberIds.length === 0) return {}
  const base      = Math.floor(totalCents / memberIds.length)
  const remainder = totalCents - base * memberIds.length
  return Object.fromEntries(
    memberIds.map((id, i) => [id, i < remainder ? base + 1 : base])
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormValues {
  description:    string
  date:           string
  category:       string
  totalAmount:    string
  paidByMemberId: string
  notes:          string
}

interface SplitRow {
  memberId: number
  amount:   string
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
      description:    '',
      date:           today(),
      category:       'other',
      totalAmount:    '',
      paidByMemberId: '',
      notes:          '',
    },
  })

  const { data: accounts = [] } = useSortedAccounts()
  const [splits,     setSplits]     = useState<SplitRow[]>([])
  const [splitMode,  setSplitMode]  = useState<'even' | 'custom'>('even')
  const [splitError, setSplitError] = useState('')
  const [txAccountId, setTxAccountId] = useState('')

  const myMember        = members.find(m => m.userId === user?.id)
  const watchedPaidById = watch('paidByMemberId')
  const iAmPayer        = myMember != null && watchedPaidById === String(myMember.id)

  const categoryOptions = CATEGORIES.map(c => ({ value: c.id, label: tCategory(c.id, t) }))
  const memberOptions   = members.map(m => ({ value: String(m.id), label: m.name }))
  const accountOptions  = [
    { value: '', label: t('groups.noLinkedAccount') },
    ...accounts.map(buildAccountSelectOption),
  ]

  // ── Initialise when modal opens ───────────────────────────────────────────

  useEffect(() => {
    if (!open) return

    const defaultPayer = members[0]?.id?.toString() ?? ''

    if (isEdit && entry) {
      reset({
        description:    entry.description,
        date:           entry.date,
        category:       entry.category,
        totalAmount:    fromCents(entry.totalAmount).toFixed(2),
        paidByMemberId: String(entry.paidByMemberId),
        notes:          entry.notes ?? '',
      })
      if (existingSplits && existingSplits.length > 0) {
        setSplits(existingSplits.map(s => ({
          memberId: s.memberId,
          amount:   fromCents(s.amount).toFixed(2),
        })))
        setSplitMode('custom')
      } else {
        setSplits(members.map(m => ({ memberId: m.id!, amount: '' })))
        setSplitMode('even')
      }
      // Pre-fill account from linked transaction if it exists
      if (entry.transactionId) {
        supabase
          .from('transactions')
          .select('account_id')
          .eq('id', entry.transactionId)
          .single()
          .then(({ data }) => {
            setTxAccountId(data ? String((data as { account_id: number }).account_id) : '')
          })
      } else {
        setTxAccountId('')
      }
    } else {
      reset({
        description:    '',
        date:           today(),
        category:       'other',
        totalAmount:    '',
        paidByMemberId: defaultPayer,
        notes:          '',
      })
      setSplits(members.map(m => ({ memberId: m.id!, amount: '' })))
      setSplitMode('even')
      setTxAccountId(accounts[0]?.id ? String(accounts[0].id) : '')
    }
    setSplitError('')
  }, [open, entry, existingSplits, members, isEdit, reset, accounts])

  // ── Recompute even splits when total changes ──────────────────────────────

  const totalAmountStr = watch('totalAmount')
  useEffect(() => {
    if (splitMode !== 'even') return
    const totalCents  = toCents(parseMoney(totalAmountStr))
    const distributed = distributeEvenly(totalCents, members.map(m => m.id!))
    setSplits(members.map(m => ({
      memberId: m.id!,
      amount:   fromCents(distributed[m.id!] ?? 0).toFixed(2),
    })))
  }, [totalAmountStr, splitMode, members])

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleSplitModeChange(mode: 'even' | 'custom') {
    setSplitMode(mode)
    setSplitError('')
    if (mode === 'even') {
      const totalCents  = toCents(parseMoney(totalAmountStr))
      const distributed = distributeEvenly(totalCents, members.map(m => m.id!))
      setSplits(members.map(m => ({
        memberId: m.id!,
        amount:   fromCents(distributed[m.id!] ?? 0).toFixed(2),
      })))
    }
  }

  function handleSplitAmountChange(memberId: number, value: string) {
    setSplits(prev => prev.map(s => s.memberId === memberId ? { ...s, amount: value } : s))
    setSplitError('')
  }

  async function onSubmit(values: FormValues) {
    if (!user) return
    setSplitError('')

    const totalCents = toCents(parseMoney(values.totalAmount))
    if (totalCents <= 0) return

    const splitCents = splits.map(s => ({
      memberId: s.memberId,
      amount:   toCents(parseMoney(s.amount)),
    }))
    const splitSum = splitCents.reduce((sum, s) => sum + s.amount, 0)
    if (Math.abs(splitSum - totalCents) > members.length) {
      setSplitError(t('groups.splitSumMismatch'))
      return
    }

    const iPayer       = myMember != null && parseInt(values.paidByMemberId) === myMember.id
    const shouldLinkTx = iPayer && txAccountId !== ''
    const accountIdNum = txAccountId ? parseInt(txAccountId) : null

    const baseEntry = {
      groupId,
      description:    values.description.trim(),
      date:           values.date,
      category:       values.category,
      totalAmount:    totalCents,
      paidByMemberId: parseInt(values.paidByMemberId),
      notes:          values.notes.trim() || undefined,
      createdBy:      user.id,
    }

    const splitsData: Omit<GroupEntrySplit, 'id'>[] = splitCents.map(s => ({
      entryId:  entry?.id ?? 0,
      memberId: s.memberId,
      amount:   s.amount,
    }))

    const txPayload = shouldLinkTx && accountIdNum != null ? {
      accountId:      accountIdNum,
      amount:         -totalCents,
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
        if (prevTxId != null) {
          await updateTransaction(prevTxId, txPayload)
          newTxId = prevTxId
        } else {
          newTxId = await addTransaction(txPayload) ?? undefined
        }
      } else if (prevTxId != null) {
        await removeTransaction(prevTxId)
      }

      await updateGroupEntry(entry.id, groupId, { ...baseEntry, transactionId: newTxId }, splitsData)
    } else {
      let txId: number | undefined
      if (txPayload) {
        txId = await addTransaction(txPayload) ?? undefined
      }
      await addGroupEntry({ ...baseEntry, transactionId: txId }, splitsData)
    }

    onClose()
  }

  const memberById = Object.fromEntries(members.map(m => [m.id!, m]))

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('groups.editEntry') : t('groups.newEntry')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ge-description">{t('transactions.colDescription')}</Label>
            <Input
              id="ge-description"
              placeholder="Dinner, taxi, groceries..."
              {...register('description', { required: true })}
              className={errors.description ? 'border-destructive' : ''}
            />
          </div>

          {/* Date + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ge-date">{t('transactions.colDate')}</Label>
              <DateInput id="ge-date" value={watch('date') ?? ''} onChange={v => setValue('date', v)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('transactions.category')}</Label>
              <PlainSelect
                value={watch('category')}
                onChange={v => setValue('category', v)}
                options={categoryOptions}
              />
            </div>
          </div>

          {/* Total amount + Paid by */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label>{t('groups.paidBy')}</Label>
              <PlainSelect
                value={watch('paidByMemberId')}
                onChange={v => setValue('paidByMemberId', v)}
                options={memberOptions}
                placeholder="Who paid?"
              />
            </div>
          </div>

          {/* Payment account — shown when the current user is the payer */}
          {iAmPayer && (
            <div className="space-y-1.5">
              <Label>{t('groups.debitAccount')}</Label>
              <PlainSelect
                value={txAccountId}
                onChange={setTxAccountId}
                options={accountOptions}
                placeholder={t('groups.noLinkedAccount')}
              />
            </div>
          )}

          {/* Split mode toggle */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label>{t('groups.splitAmong')}</Label>
              <div className="flex rounded-md border overflow-hidden ml-auto text-xs">
                <button
                  type="button"
                  onClick={() => handleSplitModeChange('even')}
                  className={`px-3 py-1 transition-colors ${splitMode === 'even' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  {t('groups.splitEvenly')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSplitModeChange('custom')}
                  className={`px-3 py-1 transition-colors border-l ${splitMode === 'custom' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  {t('groups.splitCustom')}
                </button>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              {splits.map(split => (
                <div key={split.memberId} className="flex items-center gap-3">
                  <span className="flex-1 text-sm truncate">{memberById[split.memberId]?.name ?? '?'}</span>
                  <AmountInput
                    value={split.amount}
                    onChange={e => handleSplitAmountChange(split.memberId, e.target.value)}
                    readOnly={splitMode === 'even'}
                    className={cn('w-28 text-right', splitMode === 'even' && 'bg-muted text-muted-foreground')}
                  />
                </div>
              ))}
            </div>
            {splitError && <p className="text-sm text-destructive">{splitError}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="ge-notes">Notes (optional)</Label>
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
