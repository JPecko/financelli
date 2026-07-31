import { useState } from 'react'
import { getYear, getMonth } from 'date-fns'
import { FileDown, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import PlainSelect from '@/shared/components/PlainSelect'
import { useMonthlyReportExport } from '../hooks/useMonthlyReportExport'
import { useT } from '@/shared/i18n'

interface Props {
  open: boolean
  onClose: () => void
}

const now = new Date()
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' }),
}))
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const year = getYear(now) - i
  return { value: String(year), label: String(year) }
})

export default function ExportReportModal({ open, onClose }: Props) {
  const t = useT()
  const [year, setYear]   = useState(String(getYear(now)))
  const [month, setMonth] = useState(String(getMonth(now) + 1))
  const { generate, isGenerating } = useMonthlyReportExport(Number(year), Number(month))

  const handleExport = async () => {
    await generate()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('dashboard.exportReport')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <PlainSelect value={month} onChange={setMonth} options={MONTH_OPTIONS} />
          <PlainSelect value={year} onChange={setYear} options={YEAR_OPTIONS} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="button" onClick={handleExport} disabled={isGenerating} className="gap-2">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {t('dashboard.exportReport')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
