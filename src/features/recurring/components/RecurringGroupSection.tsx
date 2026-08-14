import { Label } from '@/shared/components/ui/label'
import PlainSelect from '@/shared/components/PlainSelect'
import FormToggle from '@/shared/components/FormToggle'
import AmountInput from '@/shared/components/AmountInput'
import SplitSection from '@/features/groups/components/SplitSection'
import { buildGroupedAccountSelectOptions } from '@/features/transactions/components/accountSelectOptions'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { useT } from '@/shared/i18n'
import type { useRecurringGroupSplit } from '../hooks/useRecurringGroupSplit'

interface Props {
  groups:         { id: number; name: string }[]
  groupId:        string
  onGroupChange:  (v: string) => void
  amount:         string
  onAmountChange: (v: string) => void
  amountError?:   string
  payerType:      'me' | 'member'
  onPayerTypeChange: (v: 'me' | 'member') => void
  payerMemberId:  string
  onPayerMemberChange: (v: string) => void
  createTx:       boolean
  onCreateTxChange: (v: boolean) => void
  accountId:      string
  onAccountChange: (v: string) => void
  currentUserId?: string
  split:          ReturnType<typeof useRecurringGroupSplit>
}

export default function RecurringGroupSection({
  groups, groupId, onGroupChange, amount, onAmountChange, amountError,
  payerType, onPayerTypeChange, payerMemberId, onPayerMemberChange,
  createTx, onCreateTxChange, accountId, onAccountChange, currentUserId, split,
}: Props) {
  const t = useT()
  const { data: accounts = [] } = useSortedAccounts()
  const { members, myMember, splitMode, setSplitMode, splitError, percents, splits,
    handlePercentChange: handleMemberPercentChange, handleAmountChange: handleMemberAmountChange,
    setMemberFull, setMemberEmpty } = split

  const groupOptions  = groups.map(g => ({ value: String(g.id), label: g.name }))
  const memberOptions = members.filter(m => m.userId !== currentUserId).map(m => ({ value: String(m.id), label: m.name }))
  const iAmPayer       = payerType === 'me'

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="space-y-1.5">
        <Label>{t('groups.group')}</Label>
        <PlainSelect value={groupId} onChange={onGroupChange} options={groupOptions} placeholder={t('groups.selectGroup')} />
      </div>

      {groupId && (
        <div className="space-y-1.5">
          <Label>{t('groups.totalAmount')}</Label>
          <AmountInput
            placeholder="0.00"
            value={amount}
            onChange={e => onAmountChange(e.target.value)}
          />
          {amountError && <p className="text-xs text-destructive">{amountError}</p>}
        </div>
      )}

      {groupId && members.length > 0 && (
        <>
          <div className="space-y-1.5">
            <Label>{t('groups.paidBy')}</Label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${iAmPayer ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
                onClick={() => onPayerTypeChange('me')}
              >
                {t('groups.iPaid')}
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${!iAmPayer ? 'bg-amber-500 text-white border-amber-500' : 'hover:bg-accent'}`}
                onClick={() => onPayerTypeChange('member')}
              >
                {t('groups.memberPaid')}
              </button>
            </div>
          </div>

          {!iAmPayer && (
            <PlainSelect value={payerMemberId} onChange={onPayerMemberChange} options={memberOptions} placeholder={t('groups.paidBy')} />
          )}

          {iAmPayer && (
            <div className="rounded-lg border overflow-hidden">
              <label
                className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer hover:bg-accent/60 transition-colors"
                onClick={e => { e.preventDefault(); onCreateTxChange(!createTx) }}
              >
                <div>
                  <p className="text-sm font-medium leading-none">{t('transactions.reimbursable')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('transactions.reimbursableDesc')}</p>
                </div>
                <FormToggle on={createTx} />
              </label>
              {createTx && (
                <div className="px-3 pb-3 border-t bg-muted/20 pt-3">
                  <Label className="text-xs mb-1.5 block">{t('groups.debitAccount')}</Label>
                  <PlainSelect
                    value={accountId}
                    onChange={onAccountChange}
                    options={buildGroupedAccountSelectOptions(accounts, t)}
                    placeholder={t('recurring.selectAccount')}
                  />
                </div>
              )}
            </div>
          )}

          <SplitSection
            members={members}
            splits={splits}
            splitMode={splitMode}
            setSplitMode={setSplitMode}
            percents={percents}
            splitError={splitError}
            currentUserId={currentUserId}
            onPercentChange={handleMemberPercentChange}
            onAmountChange={handleMemberAmountChange}
            onSetFull={setMemberFull}
            onSetEmpty={setMemberEmpty}
            modes={['even', 'percent']}
          />

          {!myMember && (
            <p className="text-xs text-muted-foreground">{t('recurring.groupNotAMember')}</p>
          )}
        </>
      )}
    </div>
  )
}
