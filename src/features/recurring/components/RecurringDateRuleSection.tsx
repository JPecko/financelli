import FormToggle from '@/shared/components/FormToggle'
import { useT } from '@/shared/i18n'
import type { DateRuleMode } from '@/domain/recurringDate'
import type { RecurringFrequency } from '@/domain/types'

interface Props {
  frequency:           RecurringFrequency
  dateRule:            DateRuleMode
  onDateRuleChange:    (v: DateRuleMode) => void
  adjustToBusinessDay: boolean
  onAdjustChange:      (v: boolean) => void
}

export default function RecurringDateRuleSection({
  frequency, dateRule, onDateRuleChange, adjustToBusinessDay, onAdjustChange,
}: Props) {
  const t = useT()
  // "First business day of month" only makes sense when the rule has a month to anchor to
  const showFirstBusinessDay = frequency !== 'weekly'

  return (
    <div className="space-y-2">
      {showFirstBusinessDay && (
        <div className="flex rounded-md border overflow-hidden text-xs w-fit">
          <button
            type="button"
            onClick={() => onDateRuleChange('exact')}
            className={`px-3 py-1.5 transition-colors ${dateRule === 'exact' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {t('recurring.dateRuleExact')}
          </button>
          <button
            type="button"
            onClick={() => onDateRuleChange('firstBusinessDay')}
            className={`px-3 py-1.5 transition-colors border-l ${dateRule === 'firstBusinessDay' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {t('recurring.dateRuleFirstBusinessDay')}
          </button>
        </div>
      )}

      {dateRule === 'exact' && (
        <label
          className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border cursor-pointer hover:bg-accent/60 transition-colors"
          onClick={e => { e.preventDefault(); onAdjustChange(!adjustToBusinessDay) }}
        >
          <div>
            <p className="text-sm font-medium leading-none">{t('recurring.adjustToBusinessDay')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('recurring.adjustToBusinessDayDesc')}</p>
          </div>
          <FormToggle on={adjustToBusinessDay} />
        </label>
      )}
    </div>
  )
}
