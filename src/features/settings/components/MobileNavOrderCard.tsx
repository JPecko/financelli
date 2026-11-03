import { ArrowDown, ArrowUp, Smartphone } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { useMobileNavStore } from '@/shared/store/mobileNavStore'
import { useMobileNavItems } from '@/shared/hooks/useMobileNavItems'
import { normalizeMobileNavOrder } from '@/shared/config/mobileNav'
import { navItems } from '@/shared/config/nav'
import { useT } from '@/shared/i18n'

type Placement = 'bar' | 'more' | 'hidden'

const PLACEMENT_CLASS: Record<Placement, string> = {
  bar:    'bg-primary/10 text-primary',
  more:   'bg-muted text-muted-foreground',
  hidden: 'text-muted-foreground/60',
}

// Mobile-only setting: the bottom bar doesn't exist on desktop
export default function MobileNavOrderCard() {
  const t = useT()
  const { order, setOrder, reset } = useMobileNavStore()
  const { bar, more } = useMobileNavItems()
  const routes = normalizeMobileNavOrder(order)

  const placementOf = (to: string): Placement =>
    bar.some(i => i.to === to) ? 'bar' : more.some(i => i.to === to) ? 'more' : 'hidden'

  const move = (index: number, delta: number) => {
    const next = [...routes]
    ;[next[index], next[index + delta]] = [next[index + delta], next[index]]
    setOrder(next)
  }

  return (
    <Card className="lg:hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="h-4 w-4" />
          {t('settings.mobileNav')}
        </CardTitle>
        <CardDescription>{t('settings.mobileNavDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="divide-y divide-border rounded-lg border">
          {routes.map((to, i) => {
            const item = navItems.find(n => n.to === to)!
            const Icon = item.icon
            const placement = placementOf(to)
            return (
              <li key={to} className="flex items-center gap-3 py-1.5 pl-4 pr-1.5">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm">{t(item.labelKey)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PLACEMENT_CLASS[placement]}`}>
                  {t(`settings.mobileNavPlacement.${placement}`)}
                </span>
                <Button variant="ghost" size="icon" className="h-9 w-9" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('settings.moveUp')}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" disabled={i === routes.length - 1} onClick={() => move(i, 1)} aria-label={t('settings.moveDown')}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </li>
            )
          })}
        </ol>
        <Button variant="outline" size="sm" onClick={reset}>{t('settings.mobileNavReset')}</Button>
      </CardContent>
    </Card>
  )
}
