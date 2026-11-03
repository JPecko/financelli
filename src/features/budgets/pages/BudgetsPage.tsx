import { Plus, Target } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import EmptyState from '@/shared/components/EmptyState'
import PageLoader from '@/shared/components/PageLoader'
import PageHelpInfo from '@/shared/components/PageHelpInfo'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import { tCategory } from '@/domain/categories'
import { useT } from '@/shared/i18n'
import BudgetSummaryCard from '../components/BudgetSummaryCard'
import BudgetRow from '../components/BudgetRow'
import UnbudgetedList from '../components/UnbudgetedList'
import BudgetFormModal from '../components/BudgetFormModal'
import { useBudgetsPageModel } from '../hooks/useBudgetsPageModel'

export default function BudgetsPage() {
  const t = useT()
  const m = useBudgetsPageModel()
  const canAdd = m.availableCategories.length > 0

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold">{t('budgets.title')}</h1>
            <PageHelpInfo title={t('budgets.help.title')} body={t('budgets.help.body')} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('budgets.subtitle')}</p>
        </div>
        {canAdd && m.budgets.length > 0 && (
          <Button onClick={() => m.openNew()} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" /> {t('budgets.add')}
          </Button>
        )}
      </div>

      {m.isLoading ? (
        <PageLoader message={t('budgets.loading')} />
      ) : m.budgets.length === 0 ? (
        <EmptyState
          icon={Target}
          title={t('budgets.emptyTitle')}
          description={t('budgets.emptyDesc')}
          action={<Button onClick={() => m.openNew()}><Plus className="mr-2 h-4 w-4" /> {t('budgets.addFirst')}</Button>}
        />
      ) : (
        <>
          <BudgetSummaryCard
            summary={m.summary}
            monthLabel={m.monthLabel}
            isCurrent={m.isCurrent}
            canGoBack={m.canGoBack}
            canGoForward={m.canGoForward}
            goBack={m.goBack}
            goForward={m.goForward}
          />
          {/* An odd last row (incl. a single budget) spans both columns instead of leaving an empty cell */}
          <div className="grid divide-y divide-border overflow-hidden rounded-lg border lg:grid-cols-2 lg:divide-y-0 lg:gap-px lg:bg-border lg:[&>*:last-child:nth-child(odd)]:col-span-2">
            {m.rows.map(row => (
              <div key={row.budget.category} className="bg-background">
                <BudgetRow row={row} markerPct={m.summary.elapsedPct} showProjection={m.isCurrent} onClick={() => m.openEdit(row.budget)} />
              </div>
            ))}
          </div>
        </>
      )}

      {!m.isLoading && <UnbudgetedList items={m.unbudgeted} onAdd={m.openNew} />}

      {m.draft && (
        <BudgetFormModal
          key={m.draft.budget?.category ?? m.draft.category ?? 'new'}
          budget={m.draft.budget}
          initialCategory={m.draft.category}
          availableCategories={m.availableCategories}
          averages={m.averages}
          onSave={m.handleSave}
          onDelete={m.requestDelete}
          onClose={m.closeForm}
        />
      )}

      <ConfirmDialog
        open={m.pendingDelete != null}
        title={t('budgets.deleteTitle')}
        description={m.pendingDelete ? t('budgets.deleteDesc', { category: tCategory(m.pendingDelete.category, t) }) : undefined}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={() => void m.handleConfirmDelete()}
        onCancel={m.cancelDelete}
      />
    </div>
  )
}
