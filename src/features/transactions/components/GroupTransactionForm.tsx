import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { DialogFooter } from '@/shared/components/ui/dialog'
import CategorySelect from './CategorySelect'
import PlainSelect from '@/shared/components/PlainSelect'
import AmountInput from '@/shared/components/AmountInput'
import DateInput from '@/shared/components/DateInput'
import FormToggle from '@/shared/components/FormToggle'
import SplitSection from '@/features/groups/components/SplitSection'
import { buildGroupedAccountSelectOptions } from './accountSelectOptions'
import { GROUP_EXPENSE_CATS, type GrpFormValues } from './useGroupTransactionForm'
import type { SplitMode, SplitRow } from '@/features/groups/hooks/useSplitState'
import { fromCents } from '@/domain/money'
import { useT } from '@/shared/i18n'
import type { UseFormRegister, UseFormSetValue } from 'react-hook-form'
import type { GroupMember, Account, GroupEntry } from '@/domain/types'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onClose:      () => void
  onSubmit:     (e?: React.BaseSyntheticEvent) => Promise<void>
  groups:       { id: number; name: string }[]
  accounts:     Account[]
  // form bindings
  register:     UseFormRegister<GrpFormValues>
  watch:        (field: keyof GrpFormValues) => string
  setValue:     UseFormSetValue<GrpFormValues>
  errors:       Partial<Record<keyof GrpFormValues, { message?: string }>>
  isSubmitting: boolean
  // state
  members:      GroupMember[]
  splits:       SplitRow[]
  splitMode:    SplitMode
  setSplitMode: (m: SplitMode) => void
  percents:     Record<number, string>
  splitError:   string
  createTx:     boolean
  setCreateTx:  (v: boolean) => void
  roundupEnabled: boolean
  setRoundupEnabled: (v: boolean) => void
  txAccount?:   Account
  linkedEntry:  GroupEntry | null
  myMember:     GroupMember | undefined
  myShareCents: number
  othersOweCents: number
  totalCents:   number
  canSubmit:    boolean
  currentUserId?: string
  handlePercentChange: (memberId: number, pct: number) => void
  handleAmountChange:  (memberId: number, euros: string) => void
  setMemberFull:       (memberId: number) => void
  setMemberEmpty:      (memberId: number) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GroupTransactionForm({
  onClose, onSubmit, groups, accounts,
  register, watch, setValue, errors, isSubmitting,
  members, splits, splitMode, setSplitMode,
  percents, splitError,
  createTx, setCreateTx, roundupEnabled, setRoundupEnabled, txAccount, myMember,
  myShareCents, othersOweCents, totalCents, canSubmit,
  currentUserId, handlePercentChange, handleAmountChange, setMemberFull, setMemberEmpty,
}: Props) {
  const t        = useT()
  const navigate = useNavigate()

  const groupId       = watch('groupId')
  const payerType     = watch('payerType')
  const accountId     = watch('accountId')
  const payerMemberId = watch('payerMemberId')
  const category      = watch('category')
  const groupOptions   = groups.map(group => ({ value: String(group.id), label: group.name }))
  const accountOptions = buildGroupedAccountSelectOptions(accounts, t)
  const memberOptions  = members
    .filter(member => member.userId !== currentUserId)
    .map(member => ({ value: String(member.id), label: member.name }))

  if (groups.length === 0) {
    return (
      <form onSubmit={onSubmit} className="space-y-4 py-2">
        <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">{t('groups.noGroupsTabMsg')}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => { onClose(); navigate('/groups') }}>
            {t('groups.goToGroups')}
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
        </DialogFooter>
      </form>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 py-2">
      {/* Group selector */}
      <div className="space-y-1.5">
        <Label>{t('groups.title')}</Label>
        <PlainSelect
          value={groupId}
          onChange={v => setValue('groupId', v)}
          options={groupOptions}
          placeholder={t('groups.selectGroup')}
          className={!groupId && errors.groupId ? 'border-destructive' : ''}
        />
        {groupId && members.length > 0 && !myMember && (
          <p className="text-xs text-amber-600">{t('groups.notMember')}</p>
        )}
      </div>

      {groupId && members.length > 0 && (
        <>
          {/* Who paid */}
          <div className="space-y-1.5">
            <Label>{t('groups.paidBy')}</Label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${payerType === 'me' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
                onClick={() => setValue('payerType', 'me')}
              >
                {t('groups.iPaid')}
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${payerType === 'member' ? 'bg-amber-500 text-white border-amber-500' : 'hover:bg-accent'}`}
                onClick={() => setValue('payerType', 'member')}
              >
                {t('groups.memberPaid')}
              </button>
            </div>
          </div>

          {/* Create bank transaction toggle */}
          {payerType === 'me' && (
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
                    value={accountId}
                    onChange={v => setValue('accountId', v)}
                    options={accountOptions}
                    placeholder="Select account..."
                  />
                </div>
              )}
              {createTx && !!txAccount?.roundupMultiplier && (
                <label
                  className="flex items-center justify-between gap-3 px-4 py-3 border-t cursor-pointer hover:bg-accent/60 transition-colors"
                  onClick={e => { e.preventDefault(); setRoundupEnabled(!roundupEnabled) }}
                >
                  <div>
                    <p className="text-sm font-medium leading-none">{t('transactions.roundup')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('transactions.roundupDesc')}</p>
                  </div>
                  <FormToggle on={roundupEnabled} />
                </label>
              )}
            </div>
          )}

          {/* Member who paid */}
          {payerType === 'member' && (
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

          {/* Total + Date — same order/position as the personal expense form's Amount + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="grp-total">{t('groups.totalAmount')}</Label>
              <AmountInput
                id="grp-total"
                placeholder="0.00"
                {...register('totalAmount', {
                  required: true,
                  validate: v => parseFloat(String(v).replace(',', '.')) >= 0.01 || 'Must be > 0',
                })}
                className={errors.totalAmount ? 'border-destructive' : ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grp-date">{t('transactions.colDate')}</Label>
              <DateInput id="grp-date" value={watch('date') ?? ''} onChange={v => setValue('date', v)} />
            </div>
          </div>

          <CategorySelect categories={GROUP_EXPENSE_CATS} value={category} onChange={v => setValue('category', v)} />

          <div className="space-y-1.5">
            <Label htmlFor="grp-desc">{t('transactions.colDescription')}</Label>
            <Input id="grp-desc" placeholder="Jantar, táxi..." {...register('description')} />
          </div>

          {/* Split mode */}
          <SplitSection
            members={members}
            splits={splits}
            splitMode={splitMode}
            setSplitMode={setSplitMode}
            percents={percents}
            splitError={splitError}
            currentUserId={currentUserId}
            onPercentChange={handlePercentChange}
            onAmountChange={handleAmountChange}
            onSetFull={setMemberFull}
            onSetEmpty={setMemberEmpty}
          />

          {/* Summary */}
          {totalCents > 0 && myMember && (
            <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('groups.yourShare')}</span>
                <span className="font-medium">{fromCents(myShareCents).toFixed(2)} €</span>
              </div>
              {payerType === 'me' && othersOweCents > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('groups.othersOweYou')}</span>
                  <span className="text-emerald-600 font-medium">{fromCents(othersOweCents).toFixed(2)} €</span>
                </div>
              )}
              {payerType === 'me' && createTx && othersOweCents > 0 && (
                <p className="text-xs text-muted-foreground pt-1 border-t">
                  {t('groups.reimbursableNote', { amount: `${fromCents(othersOweCents).toFixed(2)} €` })}
                </p>
              )}
            </div>
          )}
        </>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="submit" disabled={isSubmitting || !canSubmit}>
          {t('transactions.addTransaction')}
        </Button>
      </DialogFooter>
    </form>
  )
}

