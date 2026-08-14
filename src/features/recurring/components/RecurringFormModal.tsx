import { useLayoutEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import TransactionTypeTabs from '@/features/transactions/components/TransactionTypeTabs'
import RecurringStandardTab from './RecurringStandardTab'
import RecurringGroupTab from './RecurringGroupTab'
import type { RecurringRule, TransactionType } from '@/domain/types'
import { useT } from '@/shared/i18n'

type ViewType = TransactionType | 'groups'

interface Props {
  open:    boolean
  onClose: () => void
  rule?:   RecurringRule
}

export default function RecurringFormModal({ open, onClose, rule }: Props) {
  const t      = useT()
  const isEdit = !!rule
  const [viewType, setViewType] = useState<ViewType>('expense')

  useLayoutEffect(() => {
    if (!open) return
    setViewType(rule ? (rule.groupId != null ? 'groups' : rule.type) : 'expense')
  }, [open, rule])

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('recurring.editRule') : t('recurring.addRule')}</DialogTitle>
        </DialogHeader>

        <TransactionTypeTabs value={viewType} onChange={setViewType} />

        {viewType === 'groups' ? (
          <RecurringGroupTab key={`groups-${rule?.id ?? 'new'}`} open={open} onClose={onClose} rule={rule} />
        ) : (
          <RecurringStandardTab key={`${viewType}-${rule?.id ?? 'new'}`} open={open} onClose={onClose} rule={rule} defaultType={viewType} />
        )}
      </DialogContent>
    </Dialog>
  )
}
