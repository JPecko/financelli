import { format, parseISO } from 'date-fns'
import { AlertTriangle, PiggyBank, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { tCategory } from '@/domain/categories'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { useLanguageStore } from '@/shared/store/languageStore'
import { getDateFnsLocale } from '@/shared/utils/dateLocale'
import BalanceValue from '@/shared/components/BalanceValue'
import { cn } from '@/lib/utils'
import type { MonthlyInsight } from '@/domain/monthlyInsights'

type Tone = 'good' | 'bad' | 'warn'

const TONE: Record<Tone, string> = {
  good: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  bad:  'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  warn: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

interface Props {
  insight:         MonthlyInsight
  onCategoryClick: (categoryId: string) => void
}

export default function InsightItem({ insight, onCategoryClick }: Props) {
  const view = useInsightView(insight)
  const content = (
    <>
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', TONE[view.tone])}>
        <view.icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{view.title}</span>
        <BalanceValue><span className="block text-xs text-muted-foreground">{view.detail}</span></BalanceValue>
      </span>
    </>
  )

  if (insight.kind !== 'category') return <li className="flex items-start gap-3">{content}</li>
  return (
    <li>
      <button type="button" onClick={() => onCategoryClick(insight.category)} className="flex w-full items-start gap-3 rounded-md text-left hover:opacity-80">
        {content}
      </button>
    </li>
  )
}

function useInsightView(insight: MonthlyInsight): { icon: LucideIcon; tone: Tone; title: string; detail: string } {
  const t = useT()
  const dateLocale = getDateFnsLocale(useLanguageStore(s => s.lang))

  switch (insight.kind) {
    case 'category': {
      const up = insight.deltaPct > 0
      return {
        icon:   up ? TrendingUp : TrendingDown,
        tone:   up ? 'bad' : 'good',
        title:  t(up ? 'dashboard.insights.categoryUp' : 'dashboard.insights.categoryDown', {
          category: tCategory(insight.category, t), pct: String(Math.abs(insight.deltaPct)),
        }),
        detail: t('dashboard.insights.categoryDetail', { current: formatMoney(insight.current), usual: formatMoney(insight.usual) }),
      }
    }
    case 'unusual':
      return {
        icon:   AlertTriangle,
        tone:   'warn',
        title:  t('dashboard.insights.unusual', { name: insight.expense.description || tCategory(insight.expense.category, t) }),
        detail: t('dashboard.insights.unusualDetail', {
          amount: formatMoney(-insight.expense.amount), factor: String(insight.factor),
          category: tCategory(insight.expense.category, t), usual: formatMoney(insight.usual),
        }),
      }
    case 'savingsRate':
      return {
        icon:   PiggyBank,
        tone:   insight.rate > insight.usual ? 'good' : 'bad',
        title:  t('dashboard.insights.savings', {
          rate: String(insight.rate), month: format(parseISO(`${insight.month}-01`), 'MMMM', { locale: dateLocale }),
        }),
        detail: t('dashboard.insights.savingsDetail', { usual: String(insight.usual) }),
      }
  }
}
