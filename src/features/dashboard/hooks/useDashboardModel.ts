import { useMemo } from 'react'
import { getYear, getMonth } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useSortedAccounts, useNetWorth } from '@/shared/hooks/useAccounts'
import {
  useMonthSummary, useTransactionsByMonth, useMonthlyNetFlow,
  useMonthlyBenefits, useYearBenefits, isCashFlow, personalDivisorFor,
  useInvestmentCapitalAdjustments,
} from '@/shared/hooks/useTransactions'
import { useAuth } from '@/features/auth/AuthContext'
import { useSharedExpensesByMonth } from '@/shared/hooks/useSharedExpenses'
import { getCategoryById, tCategory } from '@/domain/categories'
import { useTransactionsFilterStore } from '@/shared/store/transactionsFilterStore'
import { useHoldings } from '@/shared/hooks/useHoldings'
import { useAssets } from '@/shared/hooks/useAssets'
import { useT } from '@/shared/i18n'
import { computeInvestmentBalance } from '@/features/investments/utils/investmentMetrics'
import type { AccountType, Transaction } from '@/domain/types'

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

export function useDashboardModel() {
  const t        = useT()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setFilterCategory, setFilterAccountId } = useTransactionsFilterStore()

  const netWorthFromHook                = useNetWorth()
  const summary                         = useMonthSummary(DASHBOARD_YEAR, DASHBOARD_MONTH)
  const { data: transactions = [], isLoading: txLoading  } = useTransactionsByMonth(DASHBOARD_YEAR, DASHBOARD_MONTH)
  const { data: accounts     = [], isLoading: accLoading } = useSortedAccounts()
  const { data: barData         = [] } = useMonthlyNetFlow(DASHBOARD_YEAR, DASHBOARD_MONTH)
  const { data: benefitsData    = [] } = useMonthlyBenefits(DASHBOARD_YEAR, DASHBOARD_MONTH)
  const { data: yearBenefits        } = useYearBenefits(DASHBOARD_YEAR)
  const { data: sharedExpenses  = [] } = useSharedExpensesByMonth(DASHBOARD_YEAR, DASHBOARD_MONTH)
  const { data: allHoldings     = [] } = useHoldings()
  const { data: allAssets       = [] } = useAssets()

  const investmentAccounts   = useMemo(() => accounts.filter(a => a.type === 'investment'), [accounts])
  const investmentAccountIds = useMemo(() => investmentAccounts.map(a => a.id!).filter(Boolean), [investmentAccounts])
  const { data: capitalAdjustments = {} } = useInvestmentCapitalAdjustments(investmentAccountIds)

  const allAssetMap = useMemo(
    () => Object.fromEntries(allAssets.map(a => [a.id!, a])),
    [allAssets],
  )

  const effectiveBalances = useMemo<Record<number, number>>(() => {
    const result: Record<number, number> = {}
    for (const account of accounts) {
      if (account.id == null) continue
      if (account.type !== 'investment') {
        result[account.id] = account.balance
      } else {
        const holdings = allHoldings.filter(h => h.accountId === account.id)
        const capTx = [{ accountId: account.id, amount: capitalAdjustments[account.id] ?? 0, category: 'capital' } as unknown as Transaction]
        result[account.id] = computeInvestmentBalance(account, holdings, allAssetMap, capTx)
      }
    }
    return result
  }, [accounts, allHoldings, allAssetMap, capitalAdjustments])

  const netWorthByType = useMemo(() => {
    const map: Partial<Record<AccountType, number>> = {}
    for (const a of accounts) map[a.type] = (map[a.type] ?? 0) + (effectiveBalances[a.id!] ?? 0)
    return (Object.entries(map) as [AccountType, number][])
      .filter(([, v]) => v !== 0)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  }, [accounts, effectiveBalances])

  const positiveTotal = useMemo(
    () => netWorthByType.filter(([, v]) => v > 0).reduce((s, [, v]) => s + v, 0),
    [netWorthByType],
  )

  const netWorthTotal = useMemo(
    () => netWorthByType.reduce((s, [, v]) => s + v, 0) || netWorthFromHook,
    [netWorthByType, netWorthFromHook],
  )

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

  const hasBenefits = useMemo(() => accounts.some(a => a.cashbackPct || a.roundupMultiplier), [accounts])

  const savingsRate = useMemo(() =>
    summary.personalIncome > 0
      ? Math.round((summary.personalBalance / summary.personalIncome) * 100)
      : null,
  [summary])

  const categoryData = useMemo<CategoryDataItem[]>(() => {
    const txSeMap: Record<number, typeof sharedExpenses[0]> = {}
    for (const se of sharedExpenses) {
      if (se.payer === 'me' && se.transactionId != null) txSeMap[se.transactionId] = se
    }
    const map: Record<string, number> = {}
    for (const tx of transactions) {
      if (!isCashFlow(tx) || tx.amount >= 0) continue
      let amount: number
      if (tx.id != null && txSeMap[tx.id] != null) {
        amount = txSeMap[tx.id].myShare
      } else {
        const divisor = personalDivisorFor(tx, user?.id, accounts)
        if (divisor === Infinity) continue
        amount = Math.abs(tx.amount) / divisor
      }
      map[tx.category] = (map[tx.category] ?? 0) + amount
    }
    for (const se of sharedExpenses.filter(e => e.payer === 'other' && e.status !== 'ignored')) {
      map[se.category] = (map[se.category] ?? 0) + se.myShare
    }
    for (const g of summary.groupExpenses) {
      if (!INVESTING_CATS.has(g.category)) map[g.category] = (map[g.category] ?? 0) + g.myShare
    }
    for (const tx of transactions.filter(tx => tx.type === 'transfer' && tx.category === 'invest-move' && tx.amount < 0)) {
      const divisor = personalDivisorFor(tx, user?.id, accounts)
      if (divisor === Infinity) continue
      map['invest-move'] = (map['invest-move'] ?? 0) + Math.abs(tx.amount) / divisor
    }
    return Object.entries(map)
      .map(([id, value]) => { const cat = getCategoryById(id); return { id, name: tCategory(id, t), value, color: cat.color } })
      .sort((a, b) => b.value - a.value)
  }, [transactions, sharedExpenses, summary, accounts, user, t])

  const categoryTotal = useMemo(() => categoryData.reduce((s, d) => s + d.value, 0), [categoryData])

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
      .filter(g => !INVESTING_CATS.has(g.category))
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
    netWorthByType,
    positiveTotal,
    netWorthTotal,
    summary,
    savingsRate,
    barData,
    benefitsData,
    yearBenefits,
    cashbackMonth,
    roundupMonth,
    hasBenefits,
    categoryData,
    categoryTotal,
    topExpenses,
    investmentAccounts,
    allHoldings,
    allAssets,
    handleCategoryClick,
  }
}
