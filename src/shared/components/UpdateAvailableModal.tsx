import { RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useVersionCheck } from '@/shared/hooks/useVersionCheck'
import { hardRefreshApp } from '@/shared/utils/hardRefreshApp'
import { useT } from '@/shared/i18n'

export default function UpdateAvailableModal() {
  const t = useT()
  const { updateAvailable } = useVersionCheck()

  if (!updateAvailable) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-sm rounded-2xl bg-background border shadow-2xl p-6 space-y-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <RefreshCw className="h-4 w-4 text-primary" />
          </span>
          <div className="space-y-1">
            <p className="font-semibold leading-tight">{t('update.title')}</p>
            <p className="text-sm text-muted-foreground">{t('update.message')}</p>
          </div>
        </div>
        <Button className="w-full" onClick={() => void hardRefreshApp()}>
          {t('update.updateBtn')}
        </Button>
      </div>
    </div>
  )
}
