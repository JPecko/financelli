import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useBudgetOverview } from './useBudgetOverview'
import { useCategoryAverages } from './useCategoryAverages'
import { removeBudget, saveBudget } from '@/shared/hooks/useBudgets'
import { BUDGET_CATEGORIES } from '@/domain/budgets'
import { shiftMonth } from '@/domain/netWorth'
import { useLanguageStore } from '@/shared/store/languageStore'
import { getDateFnsLocale } from '@/shared/utils/dateLocale'
import type { Budget } from '@/domain/types'

const MAX_MONTHS_BACK = 12

// What the form modal edits: an existing budget, or a new one (optionally for a preset category)
export type BudgetDraft = { budget?: Budget; category?: string }

export function useBudgetsPageModel() {
  const locale = getDateFnsLocale(useLanguageStore(s => s.lang))
  const [offset, setOffset] = useState(0)
  const [draft, setDraft] = useState<BudgetDraft | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Budget | null>(null)

  const now = new Date()
  const ym  = shiftMonth({ year: now.getFullYear(), month: now.getMonth() + 1 }, offset)
  const overview = useBudgetOverview(ym)
  const averages = useCategoryAverages()

  const budgetedIds = useMemo(() => new Set(overview.budgets.map(b => b.category)), [overview.budgets])
  const availableCategories = useMemo(() => BUDGET_CATEGORIES.filter(c => !budgetedIds.has(c.id)), [budgetedIds])

  // Categories with spending this month but no budget yet — quick "set budget" shortcuts
  const unbudgeted = useMemo(
    () => availableCategories
      .map(c => ({ category: c.id, spent: Math.round(overview.spending[c.id] ?? 0) }))
      .filter(item => item.spent > 0)
      .sort((a, b) => b.spent - a.spent),
    [availableCategories, overview.spending],
  )

  const handleSave = async (category: string, amountCents: number) => {
    await saveBudget(category, amountCents)
    setDraft(null)
  }

  const handleConfirmDelete = async () => {
    if (pendingDelete?.id == null) return
    await removeBudget(pendingDelete.id)
    setPendingDelete(null)
    setDraft(null)
  }

  return {
    ...overview,
    monthLabel:   format(new Date(ym.year, ym.month - 1), 'MMMM yyyy', { locale }),
    canGoBack:    offset > -MAX_MONTHS_BACK,
    canGoForward: offset < 0,
    goBack:       () => setOffset(o => Math.max(o - 1, -MAX_MONTHS_BACK)),
    goForward:    () => setOffset(o => Math.min(o + 1, 0)),
    averages, availableCategories, unbudgeted,
    draft,
    openNew:      (category?: string) => setDraft({ category }),
    openEdit:     (budget: Budget) => setDraft({ budget }),
    closeForm:    () => setDraft(null),
    handleSave,
    pendingDelete,
    requestDelete: setPendingDelete,
    cancelDelete:  () => setPendingDelete(null),
    handleConfirmDelete,
  }
}
