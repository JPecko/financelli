import { formatMoney } from '@/domain/money'

interface Props {
  label:  string
  amount: number
}

export default function RecurringTotalPill({ label, amount }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1">
      <span className="text-xs font-medium text-white">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-rose-400">
        {amount >= 0 ? '+' : ''}{formatMoney(amount)}
      </span>
    </div>
  )
}
