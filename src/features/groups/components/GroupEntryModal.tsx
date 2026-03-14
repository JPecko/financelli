import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { toCents, fromCents } from '@/domain/money'
import { CATEGORIES } from '@/domain/categories'
import { addGroupEntry, updateGroupEntry } from '@/shared/hooks/useGroups'
import { useAuth } from '@/features/auth/AuthContext'
import { useT } from '@/shared/i18n'
import type { GroupEntry, GroupEntrySplit, GroupMember } from '@/domain/types'

interface FormValues {
  description: string
  date: string
  category: string
  totalAmount: string
  paidByMemberId: string
  notes: string
}

interface SplitRow {
  memberId: number
  amount: string  // display euros, converted on save
}

interface Props {
  open:     boolean
  onClose:  () => void
  groupId:  number
  members:  GroupMember[]
  entry?:   GroupEntry
  existingSplits?: GroupEntrySplit[]
}

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

export default function GroupEntryModal({ open, onClose, groupId, members, entry, existingSplits }: Props) {
  const t      = useT()
  const { user } = useAuth()
  const isEdit = !!entry

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

  const [splits,    setSplits]    = useState<SplitRow[]>([])
  const [splitMode, setSplitMode] = useState<'even' | 'custom'>('even')
  const [splitError, setSplitError] = useState('')

  // Initialise when modal opens
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
    }
    setSplitError('')
  }, [open, entry, existingSplits, members, isEdit, reset])

  // When total changes in 'even' mode, recompute split previews
  const totalAmountStr = watch('totalAmount')
  useEffect(() => {
    if (splitMode !== 'even') return
    const totalCents = toCents(parseFloat(totalAmountStr) || 0)
    const distributed = distributeEvenly(totalCents, members.map(m => m.id!))
    setSplits(members.map(m => ({
      memberId: m.id!,
      amount:   fromCents(distributed[m.id!] ?? 0).toFixed(2),
    })))
  }, [totalAmountStr, splitMode, members])

  function handleSplitModeChange(mode: 'even' | 'custom') {
    setSplitMode(mode)
    setSplitError('')
    if (mode === 'even') {
      const totalCents = toCents(parseFloat(totalAmountStr) || 0)
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

    const totalCents = toCents(parseFloat(values.totalAmount) || 0)
    if (totalCents <= 0) return

    // Build split cents
    const splitCents = splits.map(s => ({
      memberId: s.memberId,
      amount:   toCents(parseFloat(s.amount) || 0),
    }))

    // Validate sum
    const splitSum = splitCents.reduce((sum, s) => sum + s.amount, 0)
    if (Math.abs(splitSum - totalCents) > members.length) {
      setSplitError(t('groups.splitSumMismatch'))
      return
    }

    const entryData = {
      groupId:          groupId,
      description:      values.description.trim(),
      date:             values.date,
      category:         values.category,
      totalAmount:      totalCents,
      paidByMemberId:   parseInt(values.paidByMemberId),
      notes:            values.notes.trim() || undefined,
      createdBy:        user.id,
    }

    const splitsData: Omit<GroupEntrySplit, 'id'>[] = splitCents.map(s => ({
      entryId:  entry?.id ?? 0,   // will be replaced inside addGroupEntry
      memberId: s.memberId,
      amount:   s.amount,
    }))

    if (isEdit && entry?.id != null) {
      await updateGroupEntry(entry.id, groupId, entryData, splitsData)
    } else {
      await addGroupEntry(entryData, splitsData)
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
            <Label htmlFor="description">{t('transactions.colDescription')}</Label>
            <Input
              id="description"
              placeholder="Dinner, taxi, groceries..."
              {...register('description', { required: true })}
              className={errors.description ? 'border-destructive' : ''}
            />
          </div>

          {/* Date + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">{t('transactions.colDate')}</Label>
              <Input id="date" type="date" {...register('date', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('transactions.category')}</Label>
              <Select value={watch('category')} onValueChange={v => setValue('category', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Total amount + Paid by */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="totalAmount">{t('groups.totalAmount')}</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                {...register('totalAmount', { required: true, min: 0.01 })}
                className={errors.totalAmount ? 'border-destructive' : ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('groups.paidBy')}</Label>
              <Select value={watch('paidByMemberId')} onValueChange={v => setValue('paidByMemberId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Who paid?" />
                </SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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

            {/* Split rows */}
            <div className="space-y-2 rounded-lg border p-3">
              {splits.map(split => (
                <div key={split.memberId} className="flex items-center gap-3">
                  <span className="flex-1 text-sm truncate">{memberById[split.memberId]?.name ?? '?'}</span>
                  <div className="w-28">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={split.amount}
                      onChange={e => handleSplitAmountChange(split.memberId, e.target.value)}
                      readOnly={splitMode === 'even'}
                      className={`text-right ${splitMode === 'even' ? 'bg-muted text-muted-foreground' : ''}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            {splitError && <p className="text-sm text-destructive">{splitError}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" placeholder="Optional note..." {...register('notes')} />
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
