import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import AmountInput from '@/shared/components/AmountInput'
import DateInput from '@/shared/components/DateInput'
import BalanceValue from '@/shared/components/BalanceValue'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import GoalAccountsPicker from './GoalAccountsPicker'
import { useGoalForm } from '../hooks/useGoalForm'
import type { SavingsGoalInput } from '@/data/repositories/savingsGoalsRepo'
import type { Account, SavingsGoal } from '@/domain/types'

const MISSING_KEYS = {
  name:     'goals.missing.name',
  target:   'goals.missing.target',
  accounts: 'goals.missing.accounts',
} as const

interface Props {
  goal?:        SavingsGoal
  accounts:     Account[]
  accountsById: Record<number, Account>
  balances:     Record<number, number>
  onSave:       (input: SavingsGoalInput) => Promise<void>
  onDelete:     (goal: SavingsGoal) => void
  onClose:      () => void
}

export default function GoalFormModal({ goal, accounts, accountsById, balances, onSave, onDelete, onClose }: Props) {
  const t = useT()
  const f = useGoalForm(goal, balances, onSave)

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{goal ? t('goals.editTitle') : t('goals.newTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={f.handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="goal-name">{t('goals.name')}</Label>
            <Input id="goal-name" value={f.name} onChange={e => f.setName(e.target.value)} placeholder={t('goals.namePlaceholder')} className="text-base md:text-base" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-amount">{t('goals.target')}</Label>
            <AmountInput id="goal-amount" value={f.amount} onChange={e => f.setAmount(e.target.value)} suffix="€" className="text-base md:text-base" />
            <p className="text-xs text-muted-foreground">{t('goals.targetHint')}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-date">{t('goals.targetDate')}</Label>
            <DateInput id="goal-date" value={f.targetDate} onChange={f.setTargetDate} />
            <p className="text-xs text-muted-foreground">
              {t('goals.targetDateHint')}
              {f.targetDate && (
                <>
                  {' '}
                  <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => f.setTargetDate('')}>
                    {t('goals.clearDate')}
                  </button>
                </>
              )}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>{t('goals.accounts')}</Label>
            <GoalAccountsPicker accounts={accounts} accountsById={accountsById} balances={balances} selected={f.accountIds} onToggle={f.toggleAccount} />
            {f.accountIds.length > 0 && (
              <BalanceValue>
                <p className="text-xs text-muted-foreground">{t('goals.linkedBalance', { amount: formatMoney(f.linkedBalance) })}</p>
              </BalanceValue>
            )}
          </div>

          {f.missing && <p className="text-xs text-amber-600 dark:text-amber-400">{t(MISSING_KEYS[f.missing])}</p>}

          {f.error && <p className="text-sm text-destructive">{t('goals.saveError', { message: f.error })}</p>}

          <DialogFooter>
            {goal && (
              <Button type="button" variant="ghost" className="text-destructive" onClick={() => onDelete(goal)}>
                {t('common.delete')}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" loading={f.saving} disabled={!f.canSubmit}>{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
