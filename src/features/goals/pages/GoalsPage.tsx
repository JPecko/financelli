import { Flag, Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import EmptyState from '@/shared/components/EmptyState'
import PageLoader from '@/shared/components/PageLoader'
import PageHelpInfo from '@/shared/components/PageHelpInfo'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import { useT } from '@/shared/i18n'
import GoalRow from '../components/GoalRow'
import GoalsSummary from '../components/GoalsSummary'
import GoalFormModal from '../components/GoalFormModal'
import { useGoalsPageModel } from '../hooks/useGoalsPageModel'

export default function GoalsPage() {
  const t = useT()
  const m = useGoalsPageModel()

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold">{t('goals.title')}</h1>
            <PageHelpInfo title={t('goals.help.title')} body={t('goals.help.body')} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('goals.subtitle')}</p>
        </div>
        {m.goals.length > 0 && (
          <Button onClick={m.openNew} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" /> {t('goals.add')}
          </Button>
        )}
      </div>

      {m.isLoading ? (
        <PageLoader message={t('goals.loading')} />
      ) : m.goals.length === 0 ? (
        <EmptyState
          icon={Flag}
          title={t('goals.emptyTitle')}
          description={t('goals.emptyDesc')}
          action={<Button onClick={m.openNew}><Plus className="mr-2 h-4 w-4" /> {t('goals.addFirst')}</Button>}
        />
      ) : (
        <>
          {m.totals.count > 1 && <GoalsSummary totals={m.totals} />}
          <div className="divide-y divide-border overflow-hidden rounded-lg border">
            {m.rows.map(row => (
              <GoalRow key={row.goal.id} row={row} accountsById={m.accountsById} onClick={() => m.openEdit(row.goal)} />
            ))}
          </div>
        </>
      )}

      {m.draft && (
        <GoalFormModal
          key={m.draft.goal?.id ?? 'new'}
          goal={m.draft.goal}
          accounts={m.linkableAccounts}
          accountsById={m.accountsById}
          balances={m.balances}
          onSave={m.handleSave}
          onDelete={m.requestDelete}
          onClose={m.closeForm}
        />
      )}

      <ConfirmDialog
        open={m.pendingDelete != null}
        title={t('goals.deleteTitle')}
        description={m.pendingDelete ? t('goals.deleteDesc', { name: m.pendingDelete.name }) : undefined}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={() => void m.handleConfirmDelete()}
        onCancel={m.cancelDelete}
      />
    </div>
  )
}
