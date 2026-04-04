import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { DialogFooter } from '@/shared/components/ui/dialog'
import AccountSelector from './AccountSelector'
import CategorySelect from './CategorySelect'
import PlainSelect from '@/shared/components/PlainSelect'
import AmountInput from '@/shared/components/AmountInput'
import DateInput from '@/shared/components/DateInput'
import FormToggle from '@/shared/components/FormToggle'
import { useT } from '@/shared/i18n'
import type { useTransactionForm } from './useTransactionForm'
import type { Holding, Asset } from '@/domain/types'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  txHook:          ReturnType<typeof useTransactionForm>
  isEditTx:        boolean
  isRoundupEdit:   boolean
  isInvestAccount: boolean
  accountHoldings: Holding[]
  assetMap:        Record<number, Asset>
  currentUserId?:  string
  onClose:         () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StandardTransactionForm({
  txHook, isEditTx, isRoundupEdit, isInvestAccount,
  accountHoldings, assetMap, currentUserId, onClose,
}: Props) {
  const t = useT()

  const {
    form,
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
    holdingId,
    isSharedAccount,
    sharedAccountParticipants,
    handleFromChange,
    onSubmit,
  } = txHook

  const { register, watch, setValue, formState: { errors, isSubmitting } } = form
  const isShared   = watch('isShared')
  const stdCanSubmit = isValid

  return (
    <form onSubmit={onSubmit} className="space-y-4 py-2">
      <AccountSelector
        type={selectedType}
        accounts={accounts}
        fromId={selectedFrom}
        toId={selectedTo}
        onFromChange={handleFromChange}
        onToChange={v => setValue('toId', v)}
        accountOptions={accountOptions}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="tx-amount">Amount</Label>
          <AmountInput
            id="tx-amount"
            placeholder="0.00"
            {...register('amount', {
              required: true,
              validate: v => parseFloat(String(v).replace(',', '.')) >= 0.01 || 'Must be > 0',
            })}
          />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tx-date">Date</Label>
          <DateInput id="tx-date" value={watch('date') ?? ''} onChange={v => setValue('date', v)} />
        </div>
      </div>

      <CategorySelect
        categories={categories}
        value={form.watch('category')}
        onChange={v => setValue('category', v)}
      />

      <div className="space-y-1.5">
        <Label htmlFor="tx-desc">Description</Label>
        <Input id="tx-desc" placeholder="e.g. Electricity bill" {...register('description')} />
      </div>

      {!isTransfer && !isRoundupEdit && (
        <SharedToggle
          isShared={isShared}
          splitN={splitN}
          isSharedAccount={isSharedAccount}
          sharedAccountParticipants={sharedAccountParticipants}
          personalUserId={personalUserId}
          currentUserId={currentUserId}
          onToggleShared={() => {
            setValue('isShared', !isShared)
            if (isShared && isSharedAccount) setValue('personalUserId', currentUserId ?? '')
          }}
          onPersonalUserChange={v => setValue('personalUserId', v)}
          register={register}
        />
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
          <FormToggle on={isReimbursable} color="bg-amber-500" />
        </label>
      )}

      {isInvestAccount && (
        <InvestmentDetails
          accountHoldings={accountHoldings}
          assetMap={assetMap}
          holdingId={holdingId}
          onHoldingChange={v => setValue('holdingId', v)}
          register={register}
        />
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={!stdCanSubmit}>
          {isEditTx ? t('common.save') : t('transactions.addTransaction')}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ── SharedToggle ──────────────────────────────────────────────────────────────

interface SharedToggleProps {
  isShared:                  boolean
  splitN:                    number
  isSharedAccount:           boolean
  sharedAccountParticipants: { userId: string; name: string; isMe: boolean }[]
  personalUserId:            string
  currentUserId?:            string
  onToggleShared:            () => void
  onPersonalUserChange:      (v: string) => void
  register:                  ReturnType<typeof useTransactionForm>['form']['register']
}

function SharedToggle({
  isShared, splitN, isSharedAccount, sharedAccountParticipants,
  personalUserId, onToggleShared, onPersonalUserChange, register,
}: SharedToggleProps) {
  const t = useT()
  const participantOptions = sharedAccountParticipants.map(participant => ({
    value: participant.userId,
    label: `${participant.name}${participant.isMe ? ` (${t('groups.youInGroup')})` : ''}`,
  }))

  return (
    <div className="rounded-lg border overflow-hidden">
      <label
        className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-accent/60 transition-colors"
        onClick={e => { e.preventDefault(); onToggleShared() }}
      >
        <div>
          <p className="text-sm font-medium leading-none">{t('transactions.sharedWithParticipants')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('transactions.sharedWithParticipantsDesc')}</p>
        </div>
        <FormToggle on={isShared} />
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
          <PlainSelect
            value={personalUserId || ''}
            onChange={onPersonalUserChange}
            options={participantOptions}
            placeholder="Select participant..."
            className="h-8 text-sm"
          />
        </div>
      )}
    </div>
  )
}

// ── InvestmentDetails ─────────────────────────────────────────────────────────

interface InvestmentDetailsProps {
  accountHoldings:  Holding[]
  assetMap:         Record<number, Asset>
  holdingId:        string
  onHoldingChange:  (v: string) => void
  register:         ReturnType<typeof useTransactionForm>['form']['register']
}

function InvestmentDetails({ accountHoldings, assetMap, holdingId, onHoldingChange, register }: InvestmentDetailsProps) {
  const t = useT()
  const holdingOptions = [
    { value: '', label: t('investments.noLink') },
    ...accountHoldings.map(holding => {
      const asset = assetMap[holding.assetId]
      return {
        value: String(holding.id),
        label: `${asset?.name ?? `Holding #${holding.id}`}${asset?.ticker ? ` (${asset.ticker.toUpperCase()})` : ''}`,
      }
    }),
  ]

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/30 border-b">
        <p className="text-sm font-medium">{t('investments.investmentDetails')}</p>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="space-y-1.5">
          <Label>{t('investments.holding')}</Label>
          <PlainSelect
            value={holdingId ?? ''}
            onChange={onHoldingChange}
            options={holdingOptions}
          />
        </div>
        {holdingId && (
          <div className="space-y-1.5">
            <Label htmlFor="tx-units">{t('investments.units')}</Label>
            <Input id="tx-units" type="number" step="0.000001" min="0" placeholder="0" {...register('units')} />
          </div>
        )}
      </div>
    </div>
  )
}
