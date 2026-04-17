import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import type { CategoryDataItem } from '../hooks/useDashboardModel'

interface Props {
  categoryData:      CategoryDataItem[]
  categoryTotal:     number
  onCategoryClick:   (catId: string) => void
}

export default function SpendingByCategoryCard({ categoryData, categoryTotal, onCategoryClick }: Props) {
  const t = useT()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t('dashboard.spendingByCategory')}</CardTitle>
      </CardHeader>
      <CardContent>
        {categoryData.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground text-center">{t('dashboard.noExpenses')}</p>
        ) : (
          <div className="space-y-1">
            {categoryData.slice(0, 7).map(d => {
              const pct = categoryTotal > 0 ? Math.round((d.value / categoryTotal) * 100) : 0
              return (
                <button
                  key={d.id}
                  onClick={() => onCategoryClick(d.id)}
                  className="group w-full rounded-lg px-2 py-1.5 -mx-2 text-left transition-colors hover:bg-muted/60"
                >
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0 transition-transform group-hover:scale-125"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{formatMoney(d.value)}</span>
                      <span className="text-muted-foreground w-7 text-right">{pct}%</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
