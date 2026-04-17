import { cn } from '@/lib/utils'
import AmountInput from '@/shared/components/AmountInput'
import { Label } from '@/shared/components/ui/label'
import { useT } from '@/shared/i18n'
import type { GroupMember } from '@/domain/types'

export interface SplitRow {
  memberId: number
  amount:   string
}

interface Props {
  members:               GroupMember[]
  splits:                SplitRow[]
  setSplits:             React.Dispatch<React.SetStateAction<SplitRow[]>>
  splitMode:             'even' | 'percent' | 'custom'
  setSplitMode:          (m: 'even' | 'percent' | 'custom') => void
  setSplitError:         (e: string) => void
  percents:              Record<number, string>
  setPercents:           React.Dispatch<React.SetStateAction<Record<number, string>>>
  splitError:            string
  currentUserId?:        string
  handleSwitchToPercent: () => void
}

export default function SplitSection({
  members, splits, setSplits, splitMode, setSplitMode, setSplitError,
  percents, setPercents, splitError, currentUserId, handleSwitchToPercent,
}: Props) {
  const t = useT()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label>{t('groups.splitAmong')}</Label>
        <div className="flex rounded-md border overflow-hidden ml-auto text-xs">
          <button
            type="button"
            onClick={() => { setSplitMode('even'); setSplitError('') }}
            className={`px-3 py-1 transition-colors ${splitMode === 'even' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {t('groups.splitEvenly')}
          </button>
          <button
            type="button"
            onClick={handleSwitchToPercent}
            className={`px-3 py-1 transition-colors border-l ${splitMode === 'percent' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {t('groups.splitByPercent')}
          </button>
          <button
            type="button"
            onClick={() => { setSplitMode('custom'); setSplitError('') }}
            className={`px-3 py-1 transition-colors border-l ${splitMode === 'custom' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {t('groups.splitCustom')}
          </button>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        {splits.map(split => {
          const member = members.find(m => m.id === split.memberId)
          const isMe   = member?.userId === currentUserId
          return (
            <div key={split.memberId} className="flex items-center gap-3">
              <span className="flex-1 text-sm truncate">
                {member?.name ?? '?'}
                {isMe && <span className="ml-1 text-xs text-muted-foreground">({t('groups.youInGroup')})</span>}
              </span>
              {splitMode === 'percent' ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <AmountInput
                    value={percents[split.memberId] ?? ''}
                    onChange={e => {
                      setPercents(prev => ({ ...prev, [split.memberId]: e.target.value }))
                      setSplitError('')
                    }}
                    className="w-20 text-right"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
                    {split.amount} €
                  </span>
                </div>
              ) : (
                <AmountInput
                  value={split.amount}
                  onChange={e => {
                    setSplits(prev => prev.map(s => s.memberId === split.memberId ? { ...s, amount: e.target.value } : s))
                    setSplitError('')
                  }}
                  readOnly={splitMode === 'even'}
                  className={cn('w-28 text-right', splitMode === 'even' && 'bg-muted text-muted-foreground')}
                />
              )}
            </div>
          )
        })}

        {splitMode === 'percent' && members.length > 0 && (() => {
          const pctSum = members.reduce((s, m) => s + parseFloat(String(percents[m.id!] || '0').replace(',', '.')), 0)
          const diff   = Math.abs(pctSum - 100)
          return (
            <div className={`text-xs text-right pt-1 border-t tabular-nums ${diff > 0.5 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {pctSum.toFixed(2)}% / 100%
            </div>
          )
        })()}
      </div>

      {splitError && <p className="text-sm text-destructive">{splitError}</p>}
    </div>
  )
}
