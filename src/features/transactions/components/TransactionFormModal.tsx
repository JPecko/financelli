import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { fromCents } from '@/domain/money'
import { addSharedExpense, updateSharedExpense, settleAllOpenSharedExpenses } from '@/shared/hooks/useSharedExpenses'
import { addTransaction, updateTransaction } from '@/shared/hooks/useTransactions'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { isoToday } from '@/shared/utils/format'
import type { Transaction, TransactionType, SharedExpense } from '@/domain/types'
import { useT } from '@/shared/i18n'

interface SEFormValues {
  payer:        'me' | 'other'
  accountId:    string
  description:  string
  date:         string
  category:     string
  totalAmount:  string
  mySharePct:   string   // percentage, e.g. "50"
  myShareEur:   string   // euro amount, e.g. "25.00"
  payerLabel:   string
}

interface Props {
  open:              boolean
  onClose:           () => void
  transaction?:      Transaction
  expense?:          SharedExpense   // edit SE payer='other'
  linkedSE?:         SharedExpense   // SE linked to tx (payer='me')
  defaultType?:      TransactionType | 'splitwise'
  defaultAccountId?: string
}

const EXPENSE_CATS = EXPENSE_CATEGORIES.filter(
  c => c.id !== 'roundup' && c.id !== 'cashback' && c.id !== 'investing',
)

function eurToPct(eur: string, total: string): string {
  const eurF   = parseFloat(String(eur).replace(',', '.'))
  const totalF = parseFloat(String(total).replace(',', '.'))
  if (isNaN(eurF) || isNaN(totalF) || totalF <= 0) return ''
  return ((eurF / totalF) * 100).toFixed(1)
}

function pctToEur(pct: string, total: string): string {
  const pctF   = parseFloat(String(pct).replace(',', '.'))
  const totalF = parseFloat(String(total).replace(',', '.'))
  if (isNaN(pctF) || isNaN(totalF) || totalF <= 0) return ''
  return (totalF * pctF / 100).toFixed(2)
}

function shareFromCents(totalCents: number, shareCents: number): { eur: string; pct: string } {
  const totalF = fromCents(totalCents)
  const shareF = fromCents(shareCents)
  const pct    = totalF > 0 ? ((shareF / totalF) * 100).toFixed(1) : '50'
  return { eur: String(shareF), pct }
}

export default function TransactionFormModal({
  open, onClose, transaction, expense, linkedSE, defaultType, defaultAccountId,
}: Props) {
  const t = useT()
  const { data: accounts = [] } = useSortedAccounts()

  const isEditTx    = transaction != null
  const isEditSE    = expense != null
  const isEdit      = isEditTx || isEditSE
  const hasLinkedSE = linkedSE != null && isEditTx

  // ── View type (active tab) ────────────────────────────────────────────────
  const [viewType, setViewType] = useState<TransactionType | 'splitwise'>('expense')

  // ── Settle-up toggle (standard tabs only) ────────────────────────────────
  const [isSettleUp, setIsSettleUp] = useState(false)

  // ── SE form (Splitwise tab + linked-SE editing section) ──────────────────
  const seForm = useForm<SEFormValues>({
    defaultValues: {
      payer:       'other',
      accountId:   '',
      description: '',
      date:        isoToday(),
      category:    'food',
      totalAmount: '',
      mySharePct:  '50',
      myShareEur:  '',
      payerLabel:  '',
    },
  })
  const {
    register: seReg,
    watch: seWatch,
    setValue: seSet,
    getValues: seGet,
    handleSubmit: seHandle,
    reset: seReset,
    formState: { errors: seErr, isSubmitting: seSubmitting },
  } = seForm

  const sePayer    = seWatch('payer')
  const seTotalRaw = seWatch('totalAmount')

  // ── Standard tx form ─────────────────────────────────────────────────────
  const txHook = useTransactionForm({
    open:             open && viewType !== 'splitwise',
    onClose,
    transaction:      viewType !== 'splitwise' ? transaction : undefined,
    defaultType:      viewType !== 'splitwise' ? viewType as TransactionType : 'expense',
    defaultAccountId,
    onAfterSubmit:    async () => {
      if (hasLinkedSE && linkedSE!.id != null) {
        const eurF = parseFloat(String(seWatch('myShareEur')).replace(',', '.'))
        const myShareCents = isNaN(eurF) ? 0 : Math.round(eurF * 100)
        await updateSharedExpense(linkedSE!.id, {
          myShare:    myShareCents,
          payerLabel: seWatch('payerLabel') || undefined,
        })
      }
      if (isSettleUp) {
        await settleAllOpenSharedExpenses()
      }
    },
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
    handleTypeChange,
    handleFromChange,
    onSubmit,
  } = txHook
  const { register, watch, setValue, formState: { errors, isSubmitting } } = form
  const isShared = watch('isShared')

  // ── Reset state when modal opens ─────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setIsSettleUp(false)

    if (expense != null) {
      const share = shareFromCents(expense.totalAmount, expense.myShare)
      setViewType('splitwise')
      seReset({
        payer:       expense.payer,
        accountId:   accounts[0]?.id ? String(accounts[0].id) : '',
        description: expense.description,
        date:        expense.date,
        category:    expense.category,
        totalAmount: String(fromCents(expense.totalAmount)),
        mySharePct:  share.pct,
        myShareEur:  share.eur,
        payerLabel:  expense.payerLabel ?? '',
      })
    } else if (linkedSE != null) {
      const share = shareFromCents(linkedSE.totalAmount, linkedSE.myShare)
      setViewType(transaction!.type)
      seReset({
        payer:       'me',
        accountId:   String(transaction!.accountId),
        description: linkedSE.description,
        date:        linkedSE.date,
        category:    linkedSE.category,
        totalAmount: String(fromCents(linkedSE.totalAmount)),
        mySharePct:  share.pct,
        myShareEur:  share.eur,
        payerLabel:  linkedSE.payerLabel ?? '',
      })
    } else if (transaction != null) {
      setViewType(transaction.type)
      seReset({
        payer: 'other', accountId: '', description: '', date: isoToday(),
        category: 'food', totalAmount: '', mySharePct: '50', myShareEur: '', payerLabel: '',
      })
    } else {
      const vt = defaultType ?? 'expense'
      setViewType(vt)
      seReset({
        payer:       'other',
        accountId:   defaultAccountId ?? (accounts[0]?.id ? String(accounts[0].id) : ''),
        description: '',
        date:        isoToday(),
        category:    'food',
        totalAmount: '',
        mySharePct:  '50',
        myShareEur:  '',
        payerLabel:  '',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense, linkedSE, transaction, defaultType, defaultAccountId])

  // Handle tab change
  const handleViewTypeChange = (vt: TransactionType | 'splitwise') => {
    setViewType(vt)
    if (vt !== 'splitwise') handleTypeChange(vt as TransactionType)
  }

  // ── Share sync helpers ────────────────────────────────────────────────────
  const onTotalChange = (val: string) => {
    seSet('totalAmount', val)
    // Keep % fixed, recompute €
    const newEur = pctToEur(seGet('mySharePct'), val)
    if (newEur) seSet('myShareEur', newEur)
  }

  const onShareEurChange = (val: string) => {
    seSet('myShareEur', val)
    const newPct = eurToPct(val, seGet('totalAmount'))
    if (newPct) seSet('mySharePct', newPct)
  }

  const onSharePctChange = (val: string) => {
    seSet('mySharePct', val)
    const newEur = pctToEur(val, seGet('totalAmount'))
    if (newEur) seSet('myShareEur', newEur)
  }

  // ── Splitwise submit ──────────────────────────────────────────────────────
  const onSubmitSW = seHandle(async (values) => {
    const totalCents = Math.round(parseFloat(String(values.totalAmount).replace(',', '.')) * 100)
    const eurF       = parseFloat(String(values.myShareEur).replace(',', '.'))
    const shareCents = isNaN(eurF) ? 0 : Math.round(eurF * 100)

    if (values.payer === 'other') {
      const seData: Omit<SharedExpense, 'id' | 'createdAt'> = {
        description:  values.description,
        date:         values.date,
        category:     values.category,
        totalAmount:  totalCents,
        myShare:      shareCents,
        payer:        'other',
        payerLabel:   values.payerLabel || undefined,
        status:       expense?.status ?? 'open',
        source:       'manual',
      }
      if (isEditSE && expense!.id != null) {
        await updateSharedExpense(expense!.id, seData)
      } else {
        await addSharedExpense(seData)
      }
    } else {
      // payer='me'
      if (isEditTx && transaction != null && linkedSE != null) {
        await updateTransaction(transaction.id!, {
          accountId:   parseInt(values.accountId),
          amount:      -totalCents,
          type:        'expense',
          category:    values.category,
          description: values.description,
          date:        values.date,
          isPersonal:  true,
        })
        if (linkedSE.id != null) {
          await updateSharedExpense(linkedSE.id, {
            description:  values.description,
            date:         values.date,
            category:     values.category,
            totalAmount:  totalCents,
            myShare:      shareCents,
            payerLabel:   values.payerLabel || undefined,
          })
        }
      } else {
        const newId = await addTransaction({
          accountId:   parseInt(values.accountId),
          amount:      -totalCents,
          type:        'expense',
          category:    values.category,
          description: values.description,
          date:        values.date,
          isPersonal:  true,
        })
        await addSharedExpense({
          description:   values.description,
          date:          values.date,
          category:      values.category,
          totalAmount:   totalCents,
          myShare:       shareCents,
          payer:         'me',
          payerLabel:    values.payerLabel || undefined,
          status:        'open',
          source:        'manual',
          transactionId: newId,
        })
      }
    }
    onClose()
  })

  // ── Derived state ─────────────────────────────────────────────────────────
  const isRoundupEdit       = isEditTx && transaction?.category === 'roundup'
  const showSettleUpToggle  = viewType !== 'splitwise' && viewType !== 'transfer' && !isRoundupEdit
  const showLinkedSESection = hasLinkedSE && viewType !== 'splitwise' && !isRoundupEdit

  const swTotalF  = parseFloat(String(seTotalRaw).replace(',', '.'))
  const swEurF    = parseFloat(String(seWatch('myShareEur')).replace(',', '.'))
  const swCanSubmit = !isNaN(swTotalF) && swTotalF > 0 && !isNaN(swEurF) && swEurF >= 0
    && (sePayer === 'other' || seWatch('accountId') !== '')

  const stdCanSubmit = accounts.length > 0 && isValid

  // ── Toggle UI helper ──────────────────────────────────────────────────────
  function Toggle({ on, color = 'bg-primary' }: { on: boolean; color?: string }) {
    return (
      <div className="relative shrink-0">
        <div className={`h-5 w-9 rounded-full transition-colors ${on ? color : 'bg-muted'}`} />
        <div className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-transform ${on ? 'left-5' : 'left-1'}`} />
      </div>
    )
  }


  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('transactions.editTitle') : t('transactions.newTitle')}</DialogTitle>
        </DialogHeader>

        {/* ── Splitwise form ───────────────────────────────────────────────── */}
        {viewType === 'splitwise' ? (
          <form onSubmit={onSubmitSW} className="space-y-4 py-2">
            <TransactionTypeTabs value={viewType} onChange={handleViewTypeChange} />

            {/* Payer toggle */}
            <div className="space-y-1.5">
              <Label>Who paid?</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${sePayer === 'me' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
                  onClick={() => seSet('payer', 'me')}
                >
                  {t('sharedExpenses.payerMe')}
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${sePayer === 'other' ? 'bg-amber-500 text-white border-amber-500' : 'hover:bg-accent'}`}
                  onClick={() => seSet('payer', 'other')}
                >
                  {t('sharedExpenses.payerOther')}
                </button>
              </div>
            </div>

            {/* Account (payer='me') */}
            {sePayer === 'me' && (
              <div className="space-y-1">
                <Label>Account</Label>
                <Select value={seWatch('accountId')} onValueChange={v => seSet('accountId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={String(acc.id)}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="sw-desc">Description</Label>
              <Input
                id="sw-desc"
                placeholder={sePayer === 'me' ? 'e.g. Restaurant dinner' : 'e.g. Dinner at restaurant'}
                {...seReg('description', { required: sePayer === 'other' })}
              />
              {seErr.description && <p className="text-xs text-destructive">Required</p>}
            </div>

            {/* Date + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sw-date">Date</Label>
                <Input id="sw-date" type="date" {...seReg('date', { required: true })} />
              </div>
              <CategorySelect
                categories={EXPENSE_CATS}
                value={seWatch('category')}
                onChange={v => seSet('category', v)}
              />
            </div>

            {/* Amount paid / total */}
            <div className="space-y-1">
              <Label htmlFor="sw-total">
                {sePayer === 'me' ? 'Amount paid' : t('sharedExpenses.totalAmount')}
              </Label>
              <Input
                id="sw-total"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={seTotalRaw}
                onChange={e => onTotalChange(e.target.value)}
              />
              {seErr.totalAmount && <p className="text-xs text-destructive">{seErr.totalAmount.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>{t('sharedExpenses.myShare')}</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="pr-7"
                    value={seWatch('myShareEur')}
                    onChange={e => onShareEurChange(e.target.value)}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none select-none">€</span>
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="50"
                    className="pr-7"
                    value={seWatch('mySharePct')}
                    onChange={e => onSharePctChange(e.target.value)}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none select-none">%</span>
                </div>
              </div>
            </div>

            {/* Payer label */}
            <div className="space-y-1">
              <Label htmlFor="sw-label">
                {sePayer === 'me' ? t('sharedExpenses.owesYou') : t('sharedExpenses.payerLabel')}
              </Label>
              <Input
                id="sw-label"
                placeholder={sePayer === 'me' ? 'João, Maria...' : 'João, Splitwise...'}
                {...seReg('payerLabel')}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
              <Button type="submit" loading={seSubmitting} disabled={!swCanSubmit}>
                {isEdit ? t('common.save') : t('transactions.addTransaction')}
              </Button>
            </DialogFooter>
          </form>

        ) : (
          /* ── Standard form ─────────────────────────────────────────────── */
          <form onSubmit={onSubmit} className="space-y-4 py-2">
            <TransactionTypeTabs value={viewType} onChange={handleViewTypeChange} />

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
                    required: !isSettleUp,
                    validate: v => isSettleUp || parseFloat(String(v).replace(',', '.')) >= 0.01 || 'Must be > 0',
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

            {!isTransfer && (
              <div className="rounded-lg border overflow-hidden">
                <label
                  className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-accent/60 transition-colors"
                  onClick={e => { e.preventDefault(); setValue('isShared', !isShared) }}
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
              </div>
            )}

            {selectedType === 'expense' && (
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

            {/* Settle-up toggle */}
            {showSettleUpToggle && (
              <label
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border cursor-pointer hover:bg-accent/60 transition-colors"
                onClick={e => { e.preventDefault(); setIsSettleUp(v => !v) }}
              >
                <div>
                  <p className="text-sm font-medium leading-none">{t('sharedExpenses.settleUpToggle')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('sharedExpenses.settleUpDesc')}</p>
                </div>
                <Toggle on={isSettleUp} color="bg-violet-600" />
              </label>
            )}

            {/* Linked SE section (edit mode with a payer='me' linked SE) */}
            {showLinkedSESection && (
              <div className="rounded-lg border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Splitwise details</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-1">
              <Label>{t('sharedExpenses.myShare')}</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="pr-7"
                    value={seWatch('myShareEur')}
                    onChange={e => onShareEurChange(e.target.value)}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none select-none">€</span>
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="50"
                    className="pr-7"
                    value={seWatch('mySharePct')}
                    onChange={e => onSharePctChange(e.target.value)}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none select-none">%</span>
                </div>
              </div>
            </div>
                  <div className="space-y-1">
                    <Label>{t('sharedExpenses.owesYou')}</Label>
                    <Input placeholder="João, Maria..." {...seReg('payerLabel')} />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>{t('common.cancel')}</Button>
              <Button type="submit" loading={isSubmitting} disabled={!stdCanSubmit}>
                {isEdit ? t('common.save') : t('transactions.addTransaction')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
