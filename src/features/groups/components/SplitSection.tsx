import { cn } from '@/lib/utils'
import AmountInput from '@/shared/components/AmountInput'
import { Label } from '@/shared/components/ui/label'
import { useT } from '@/shared/i18n'
import type { SplitMode, SplitRow } from '../hooks/useSplitState'
import type { GroupMember } from '@/domain/types'

interface Props {
  members:        GroupMember[]
  splits:         SplitRow[]
  splitMode:      SplitMode
  setSplitMode:   (m: SplitMode) => void
  percents:       Record<number, string>
  splitError:     string
  currentUserId?: string
  onPercentChange: (memberId: number, pct: number) => void
  onAmountChange:  (memberId: number, euros: string) => void
  onSetFull:       (memberId: number) => void
  onSetEmpty:      (memberId: number) => void
  /** Which mode buttons to show — defaults to all three. Recurring rules only offer even/percent. */
  modes?: SplitMode[]
}

export default function SplitSection({
  members, splits, splitMode, setSplitMode, percents, splitError, currentUserId,
  onPercentChange, onAmountChange, onSetFull, onSetEmpty, modes = ['even', 'percent', 'custom'],
}: Props) {
  const t = useT()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label>{t('groups.splitAmong')}</Label>
        <div className="flex rounded-md border overflow-hidden ml-auto text-xs">
          {modes.includes('even') && (
            <button
              type="button"
              onClick={() => setSplitMode('even')}
              className={`px-3 py-1 transition-colors ${splitMode === 'even' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {t('groups.splitEvenly')}
            </button>
          )}
          {modes.includes('percent') && (
            <button
              type="button"
              onClick={() => setSplitMode('percent')}
              className={`px-3 py-1 transition-colors border-l ${splitMode === 'percent' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {t('groups.splitByPercent')}
            </button>
          )}
          {modes.includes('custom') && (
            <button
              type="button"
              onClick={() => setSplitMode('custom')}
              className={`px-3 py-1 transition-colors border-l ${splitMode === 'custom' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {t('groups.splitCustom')}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        {splits.map(split => {
          const member = members.find(m => m.id === split.memberId)
          const isMe   = member?.userId === currentUserId
          return (
            <div key={split.memberId} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="flex-1 text-sm truncate">
                  {member?.name ?? '?'}
                  {isMe && <span className="ml-1 text-xs text-muted-foreground">({t('groups.youInGroup')})</span>}
                </span>

                {splitMode !== 'even' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <ShareShortcut label="0%" onClick={() => onSetEmpty(split.memberId)} />
                    <ShareShortcut label="100%" onClick={() => onSetFull(split.memberId)} />
                  </div>
                )}

                {splitMode === 'percent' ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <AmountInput
                      value={percents[split.memberId] ?? ''}
                      onChange={e => onPercentChange(split.memberId, parseFloat(e.target.value.replace(',', '.')) || 0)}
                      className="w-16 text-right"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                    <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
                      {split.amount} €
                    </span>
                  </div>
                ) : (
                  <AmountInput
                    value={split.amount}
                    onChange={e => onAmountChange(split.memberId, e.target.value)}
                    readOnly={splitMode === 'even'}
                    className={cn('w-28 text-right', splitMode === 'even' && 'bg-muted text-muted-foreground')}
                  />
                )}
              </div>

              {splitMode === 'percent' && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(parseFloat(percents[split.memberId] ?? '0'))}
                  onChange={e => onPercentChange(split.memberId, Number(e.target.value))}
                  className="w-full accent-primary"
                  aria-label={`${member?.name ?? ''} %`}
                />
              )}
            </div>
          )
        })}

        {splitMode === 'percent' && members.length > 0 && (() => {
          const pctSum = members.reduce((s, m) => s + parseFloat(percents[m.id!] ?? '0'), 0)
          const diff   = Math.abs(pctSum - 100)
          return (
            <div className={`text-xs text-right pt-1 border-t tabular-nums ${diff > 0.5 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {Math.round(pctSum)}% / 100%
            </div>
          )
        })()}
      </div>

      {splitError && <p className="text-sm text-destructive">{splitError}</p>}
    </div>
  )
}

function ShareShortcut({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {label}
    </button>
  )
}
