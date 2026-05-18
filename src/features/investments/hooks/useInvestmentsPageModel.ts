import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { useHoldings, removeHolding } from '@/shared/hooks/useHoldings'
import { useAssets, removeAsset } from '@/shared/hooks/useAssets'
import { useInvestmentCapitalAdjustments } from '@/shared/hooks/useTransactions'
import { usePriceSync } from '@/shared/hooks/usePriceSync'
import { syncAssets } from '@/data/services/syncService'
import { useAssetPriceEditor } from './useAssetPriceEditor'
import { useAuth } from '@/features/auth/AuthContext'
import { computeMarketValue } from '../utils/investmentMetrics'
import type { Asset, Holding, Account } from '@/domain/types'

export type AccountStats = {
  marketValue: number
  pnl:         number
  pnlPct:      number
}

export function useInvestmentsPageModel() {
  const { user }                                                   = useAuth()
  const { data: accounts = [],  isLoading: loadingAccounts }      = useAccounts()
  const { data: holdings = [],  isLoading: loadingHoldings }      = useHoldings()
  const { data: assets = [],    isLoading: loadingAssets }        = useAssets()
  const location = useLocation()

  usePriceSync()
  const priceEditor = useAssetPriceEditor()

  // ── Selection ──────────────────────────────────────────────────────────────
  const navAccountId = (location.state as { selectedAccountId?: number } | null)?.selectedAccountId ?? null
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(navAccountId)

  // ── Modal state ────────────────────────────────────────────────────────────
  const [syncing,              setSyncing]              = useState(false)
  const [holdingModalOpen,     setHoldingModalOpen]     = useState(false)
  const [editHolding,          setEditHolding]          = useState<Holding | undefined>()
  const [modalAccount,         setModalAccount]         = useState<number>(0)
  const [assetModalOpen,       setAssetModalOpen]       = useState(false)
  const [editAsset,            setEditAsset]            = useState<Asset | undefined>()
  const [accountModalOpen,     setAccountModalOpen]     = useState(false)
  const [editAccount,          setEditAccount]          = useState<Account | undefined>()
  const [importModalOpen,      setImportModalOpen]      = useState(false)
  const [importAccount,        setImportAccount]        = useState<Account | undefined>()
  const [confirmDeleteHolding, setConfirmDeleteHolding] = useState<Holding | null>(null)
  const [confirmDeleteAsset,   setConfirmDeleteAsset]   = useState<Asset | null>(null)

  // ── Derived ────────────────────────────────────────────────────────────────
  const investmentAccounts   = accounts.filter(a => a.type === 'investment')
  const assetMap             = Object.fromEntries(assets.map(a => [a.id!, a]))
  const investmentAccountIds = investmentAccounts.flatMap(a => a.id != null ? [a.id] : [])

  const { data: capitalAdjustments = {} } = useInvestmentCapitalAdjustments(investmentAccountIds)

  // Auto-select first account when none is selected (e.g. direct navigation, no state)
  useEffect(() => {
    if (selectedAccountId == null && investmentAccounts.length > 0) {
      setSelectedAccountId(investmentAccounts[0].id!)
    }
  }, [investmentAccounts, selectedAccountId])

  // Sync if navigation state changes (e.g. user navigates from accounts page again)
  useEffect(() => {
    if (navAccountId != null) setSelectedAccountId(navAccountId)
  }, [navAccountId])

  const selectedAccount  = investmentAccounts.find(a => a.id === selectedAccountId) ?? null
  const selectedHoldings = holdings
    .filter(h => h.accountId === selectedAccountId)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  const isOwner = selectedAccount?.ownerId === user?.id

  // Per-account stats for selector tiles
  const accountStatsMap: Record<number, AccountStats> = {}
  for (const account of investmentAccounts) {
    if (account.id == null) continue
    const acctHoldings = holdings.filter(h => h.accountId === account.id)
    const marketValue  = computeMarketValue(acctHoldings, assetMap)
    const costBasis    = acctHoldings.reduce((s, h) => s + h.quantity * h.avgCost, 0)
    const adjCost      = costBasis + (account.entryFee ?? 0) * acctHoldings.length
    const pnl          = marketValue - adjCost
    const pnlPct       = adjCost > 0 ? (pnl / adjCost) * 100 : 0
    accountStatsMap[account.id] = { marketValue, pnl, pnlPct }
  }

  // Selected account totals
  const capitalAmount   = selectedAccount?.id != null ? (capitalAdjustments[selectedAccount.id] ?? 0) : 0
  const selMarketValue  = selectedHoldings.reduce((s, h) => s + h.quantity * (assetMap[h.assetId]?.currentPrice ?? 0), 0)
  const selCost         = selectedHoldings.reduce((s, h) => s + h.quantity * h.avgCost, 0)
  const selFees         = (selectedAccount?.entryFee ?? 0) * selectedHoldings.length
  const selAdjCost      = selCost + selFees
  const selPnL          = selMarketValue - selAdjCost
  const selPnLPct       = selAdjCost > 0 ? (selPnL / selAdjCost) * 100 : 0
  const selInvestedBase = (selectedAccount?.investedBase ?? 0) + capitalAmount

  // Global totals
  const totalMarketValue  = holdings.reduce((s, h) => s + h.quantity * (assetMap[h.assetId]?.currentPrice ?? 0), 0)
  const totalCost         = holdings.reduce((s, h) => s + h.quantity * h.avgCost, 0)
  const totalFees         = investmentAccounts.reduce((s, a) => s + (a.entryFee ?? 0) * holdings.filter(h => h.accountId === a.id).length, 0)
  const totalAdjustedCost = totalCost + totalFees
  const totalPnL          = totalMarketValue - totalAdjustedCost
  const totalPnLPct       = totalAdjustedCost > 0 ? (totalPnL / totalAdjustedCost) * 100 : 0
  const totalInvestedBase = investmentAccounts.reduce((s, a) => s + (a.investedBase ?? 0), 0)

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSyncPrices = async () => {
    setSyncing(true)
    try { await syncAssets(assets) } finally { setSyncing(false) }
  }

  const openAddHolding  = (accountId: number) => { setEditHolding(undefined); setModalAccount(accountId); setHoldingModalOpen(true) }
  const openEditHolding = (h: Holding)        => { setEditHolding(h); setModalAccount(h.accountId); setHoldingModalOpen(true) }
  const openAddAsset    = ()                  => { setEditAsset(undefined); setAssetModalOpen(true) }
  const openEditAsset   = (a: Asset)          => { setEditAsset(a); setAssetModalOpen(true) }

  const handleDeleteHolding        = (h: Holding) => setConfirmDeleteHolding(h)
  const handleConfirmDeleteHolding = async () => {
    if (!confirmDeleteHolding) return
    await removeHolding(confirmDeleteHolding.id!)
    setConfirmDeleteHolding(null)
  }
  const handleDeleteAsset = (a: Asset) => setConfirmDeleteAsset(a)
  const handleConfirmDeleteAsset  = async () => {
    if (!confirmDeleteAsset) return
    await removeAsset(confirmDeleteAsset.id!)
    setConfirmDeleteAsset(null)
  }

  return {
    // loading
    isLoading: loadingAccounts || loadingHoldings || loadingAssets,
    // data
    holdings, assets,
    investmentAccounts, assetMap, capitalAdjustments,
    // selection
    selectedAccountId, selectedAccount, selectedHoldings, isOwner,
    capitalAmount,
    handleSelectAccount: setSelectedAccountId,
    accountStatsMap,
    // selected account totals
    selMarketValue, selAdjCost, selFees, selPnL, selPnLPct, selInvestedBase,
    // global totals
    totalMarketValue, totalAdjustedCost, totalFees, totalPnL, totalPnLPct, totalInvestedBase,
    // price editor
    priceEditor, syncing,
    // modal state
    holdingModalOpen, setHoldingModalOpen, editHolding, modalAccount,
    assetModalOpen,   setAssetModalOpen,   editAsset,
    accountModalOpen, setAccountModalOpen, editAccount, setEditAccount,
    importModalOpen,  setImportModalOpen,  importAccount, setImportAccount,
    confirmDeleteHolding, setConfirmDeleteHolding,
    confirmDeleteAsset,   setConfirmDeleteAsset,
    // handlers
    handleSyncPrices,
    openAddHolding, openEditHolding,
    openAddAsset,   openEditAsset,
    handleDeleteHolding, handleConfirmDeleteHolding,
    handleDeleteAsset,   handleConfirmDeleteAsset,
  }
}
