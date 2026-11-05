import { useMemo } from 'react'
import { getYear, getMonth } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import {
  useMonthSummary, useTransactionsByMonth, useMonthlyNetFlow,
  useMonthlyBenefits, useYearBenefits, isCashFlow, personalDivisorFor,
  useInvestmentCapitalAdjustments,
} from '@/shared/hooks/useTransactions'
import { useAuth } from '@/features/auth/AuthContext'
import { useSharedExpensesByMonth } from '@/shared/hooks/useSharedExpenses'
import { computeCategorySpending } from '@/shared/utils/categorySpending'
import { getCategoryById, tCategory } from '@/domain/categories'
import { useTransactionsFilterStore } from '@/shared/store/transactionsFilterStore'
import { useHoldings } from '@/shared/hooks/useHoldings'
import { useAssets } from '@/shared/hooks/useAssets'
import { useEffectiveBalances } from '@/shared/hooks/useEffectiveBalances'
import { useT } from '@/shared/i18n'
import { computeEffectiveInvestedBase, computeMarketValue } from '@/features/investments/utils/investmentMetrics'
import type { Transaction } from '@/domain/types'

const now   = new Date()
export const DASHBOARD_YEAR  = getYear(now)
export const DASHBOARD_MONTH = getMonth(now) + 1

const INVESTING_CATS = new Set(['investing', 'invest-move', 'capital'])

export type TopExpenseItem = {
  key: string; description: string; category: string; date: string
  amount: number; sublabel?: string
}

export type CategoryDataItem = {
  id: string; name: string; value: number; color: string
}

export function useDashboardModel(year: number = DASHBOARD_YEAR, month: number = DASHBOARD_MONTH) {
  const t        = useT()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setFilterCategory, setFilterAccountId } = useTransactionsFilterStore()

  const summary                         = useMonthSummary(year, month)
  const { data: transactions = [], isLoading: txLoading  } = useTransactionsByMonth(year, month)
  const { data: accounts     = [], isLoading: accLoading } = useSortedAccounts()
  const { data: barData         = [] } = useMonthlyNetFlow(year, month)
  const { data: benefitsData    = [] } = useMonthlyBenefits(year, month)
  const { data: yearBenefits        } = useYearBenefits(year)
  const { data: sharedExpenses  = [] } = useSharedExpensesByMonth(year, month)
  const { data: allHoldings     = [] } = useHoldings()
  const { data: allAssets       = [] } = useAssets()

  const investmentAccounts   = useMemo(() => accounts.filter(a => a.type === 'investment'), [accounts])
  const investmentAccountIds = useMemo(() => investmentAccounts.map(a => a.id!).filter(Boolean), [investmentAccounts])
  const { data: capitalAdjustments = {} } = useInvestmentCapitalAdjustments(investmentAccountIds)

  const allAssetMap = useMemo(
    () => Object.fromEntries(allAssets.map(a => [a.id!, a])),
    [allAssets],
  )

  const { balances: effectiveBalances } = useEffectiveBalances(accounts)

  const cashbackMonth = useMemo(() =>
    transactions
      .filter(tx => tx.type === 'expense' && tx.amount < 0 && tx.category !== 'roundup' && tx.category !== 'cashback')
      .reduce((s, tx) => {
        const acc = accounts.find(a => a.id === tx.accountId)
        return acc?.cashbackPct ? s + Math.floor(Math.abs(tx.amount) * acc.cashbackPct / 100) : s
      }, 0),
  [transactions, accounts])

  const roundupMonth = useMemo(() =>
    transactions.filter(tx => tx.category === 'roundup').reduce((s, tx) => s + Math.abs(tx.amount), 0),
  [transactions])

  const interestMonth = useMemo(() =>
    transactions.filter(tx => tx.category === 'interest').reduce((s, tx) => s + Math.abs(tx.amount), 0),
  [transactions])

  const hasBenefits = useMemo(() =>
    accounts.some(a => a.cashbackPct || a.roundupMultiplier) || interestMonth > 0 || (yearBenefits?.interest ?? 0) > 0,
  [accounts, interestMonth, yearBenefits])

  const savingsRate = useMemo(() =>
    summary.personalIncome > 0
      ? Math.round((summary.personalBalance / summary.personalIncome) * 100)
      : null,
  [summary])

  const categoryData = useMemo<CategoryDataItem[]>(() => {
    const spending = computeCategorySpending({
      transactions, sharedExpenses, groupExpenses: summary.groupExpenses, accounts, userId: user?.id,
    })
    return Object.entries(spending)
      .map(([id, value]) => { const cat = getCategoryById(id); return { id, name: tCategory(id, t), value, color: cat.color } })
      .sort((a, b) => b.value - a.value)
  }, [transactions, sharedExpenses, summary, accounts, user, t])

  const categoryTotal = useMemo(() => categoryData.reduce((s, d) => s + d.value, 0), [categoryData])

  const investmentSummary = useMemo(() => {
    let totalInvested = 0
    let totalMarketValue = 0
    for (const account of investmentAccounts) {
      if (account.id == null) continue
      const holdings = allHoldings.filter(h => h.accountId === account.id)
      const capTx = [{ accountId: account.id, amount: capitalAdjustments[account.id] ?? 0, category: 'capital' } as unknown as Transaction]
      totalInvested    += computeEffectiveInvestedBase(account, capTx)
      totalMarketValue += holdings.length > 0 ? computeMarketValue(holdings, allAssetMap) : effectiveBalances[account.id] ?? 0
    }
    return { totalInvested, totalMarketValue, totalPnl: totalMarketValue - totalInvested }
  }, [investmentAccounts, allHoldings, allAssetMap, capitalAdjustments, effectiveBalances])

  const topExpenses = useMemo<TopExpenseItem[]>(() => [
    ...transactions
      .filter(tx => isCashFlow(tx) && tx.amount < 0 && personalDivisorFor(tx, user?.id, accounts) !== Infinity)
      .map(tx => ({
        key: `tx-${tx.id}`,
        description: tx.description,
        category: tx.category,
        date: tx.date,
        amount: Math.round(tx.amount / personalDivisorFor(tx, user?.id, accounts)),
      })),
    ...summary.groupExpenses
      .filter(g => g.myShare > 0 && !INVESTING_CATS.has(g.category))
      .map(g => ({
        key: `grp-${g.entryId}`,
        description: g.description,
        category: g.category,
        date: g.date,
        amount: -g.myShare,
        sublabel: g.groupName,
      })),
  ].sort((a, b) => a.amount - b.amount).slice(0, 5), [transactions, summary, accounts, user])

  function handleCategoryClick(catId: string) {
    setFilterAccountId(null)
    setFilterCategory(catId)
    navigate('/transactions')
  }

  return {
    isLoading: accLoading || txLoading,
    accounts,
    effectiveBalances,
    summary,
    savingsRate,
    barData,
    benefitsData,
    yearBenefits,
    cashbackMonth,
    roundupMonth,
    interestMonth,
    hasBenefits,
    categoryData,
    categoryTotal,
    investmentSummary,
    topExpenses,
    handleCategoryClick,
  }
}
