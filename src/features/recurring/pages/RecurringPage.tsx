import { useMemo, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useRecurringRules, removeRule, updateRule, applyRule } from '@/shared/hooks/useRecurringRules'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { getDateFnsLocale } from '@/shared/utils/dateLocale'
import { useLanguageStore } from '@/shared/store/languageStore'
import EmptyState from '@/shared/components/EmptyState'
import PageLoader from '@/shared/components/PageLoader'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import RecurringFormModal from '../components/RecurringFormModal'
import RecurringFilterPopover from '../components/RecurringFilterPopover'
import RecurringAccountTotals from '../components/RecurringAccountTotals'
import RecurringTotalPill from '../components/RecurringTotalPill'
import RecurringRuleRow from '../components/RecurringRuleRow'
import { computeTotal, computeAccountTotals, groupRulesByMonth } from '../utils/recurringTotals'
import type { RecurringRule } from '@/domain/types'
import { useT } from '@/shared/i18n'

export default function RecurringPage() {
  const t = useT()
  const dateLocale = getDateFnsLocale(useLanguageStore(s => s.lang))
  const { data: rules    = [], isLoading } = useRecurringRules()
  const { data: accounts = [] } = useSortedAccounts()
  const [modalOpen, setModalOpen]             = useState(false)
  const [editing, setEditing]                 = useState<RecurringRule | undefined>()
  const [applying, setApplying]               = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [filterAccountId, setFilterAccountId] = useState<number | null>(null)

  const accountName = (id: number) => accounts.find(a => a.id === id)?.name ?? '?'

  const filteredRules = useMemo(
    () => filterAccountId == null
      ? rules
      : rules.filter(r => r.accountId === filterAccountId || r.toAccountId === filterAccountId),
    [rules, filterAccountId],
  )

  const monthGroups = useMemo(() => groupRulesByMonth(filteredRules, dateLocale), [filteredRules, dateLocale])

  // Transfers touch two accounts, so filteredRules can include rules belonging to the other
  // side of a transfer — restrict the breakdown to the selected account when filtering.
  const accountTotals = useMemo(() => {
    const totals = computeAccountTotals(filteredRules, accounts)
    return filterAccountId == null ? totals : totals.filter(t => t.account.id === filterAccountId)
  }, [filteredRules, accounts, filterAccountId])

  const handleEdit = (rule: RecurringRule) => {
    setEditing(rule)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditing(undefined)
  }

  const handleDelete = (id: number | undefined) => {
    if (id == null) return
    setConfirmDeleteId(id)
  }

  const handleConfirmDelete = async () => {
    if (confirmDeleteId == null) return
    await removeRule(confirmDeleteId)
    setConfirmDeleteId(null)
  }

  const handleApply = async (rule: RecurringRule) => {
    if (rule.id == null) return
    setApplying(rule.id)
    try { await applyRule(rule) } finally { setApplying(null) }
  }

  const handleToggle = async (rule: RecurringRule) => {
    if (rule.id == null) return
    await updateRule(rule.id, { active: !rule.active })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t('recurring.title')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('recurring.subtitle')}
            </p>
          </div>
          {/* Desktop: total + filters + add button all inline, right-aligned */}
          <div className="hidden sm:flex items-center gap-2">
            {rules.length > 0 && <RecurringTotalPill label={t('recurring.total')} amount={computeTotal(filteredRules)} />}
            <RecurringFilterPopover
              accounts={accounts}
              filterAccountId={filterAccountId}
              setFilterAccountId={setFilterAccountId}
            />
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('recurring.addRule')}
            </Button>
          </div>
          {/* Mobile: add button on its own row, next to the title */}
          <Button onClick={() => setModalOpen(true)} className="sm:hidden">
            <Plus className="h-4 w-4 mr-2" />
            {t('recurring.addRule')}
          </Button>
        </div>

        {/* Mobile: total left, filters right, on their own row */}
        <div className="flex items-center justify-between gap-2 mt-3 sm:hidden">
          {rules.length > 0 && <RecurringTotalPill label={t('recurring.total')} amount={computeTotal(filteredRules)} />}
          <RecurringFilterPopover
            accounts={accounts}
            filterAccountId={filterAccountId}
            setFilterAccountId={setFilterAccountId}
          />
        </div>
      </div>

      {isLoading ? (
        <PageLoader message={t('recurring.loading')} />
      ) : rules.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title={t('recurring.noRules')}
          description={t('recurring.noRulesDesc')}
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('recurring.addFirst')}
            </Button>
          }
        />
      ) : (
        <>
          <RecurringAccountTotals totals={accountTotals} />

          {filteredRules.length === 0 ? (
            <EmptyState
              icon={RefreshCw}
              title={t('recurring.noRules')}
              description={t('recurring.noRulesDesc')}
            />
          ) : (
            <div className="space-y-6">
              {monthGroups.map(group => (
                <div key={group.key}>
                  <div className="mb-2 px-1 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </p>
                    <RecurringTotalPill label={t('recurring.monthTotal')} amount={group.total} />
                  </div>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="divide-y divide-border">
                      {group.rules.map(rule => (
                        <RecurringRuleRow
                          key={rule.id}
                          rule={rule}
                          accountName={accountName}
                          applying={applying === rule.id}
                          onApply={() => handleApply(rule)}
                          onEdit={() => handleEdit(rule)}
                          onToggle={() => handleToggle(rule)}
                          onDelete={() => handleDelete(rule.id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <RecurringFormModal open={modalOpen} onClose={handleClose} rule={editing} />

      <ConfirmDialog
        open={confirmDeleteId != null}
        title={t('common.delete')}
        description={t('recurring.deleteConfirm')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
