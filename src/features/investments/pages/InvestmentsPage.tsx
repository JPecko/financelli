import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { TrendingUp } from 'lucide-react'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { useInvestmentCapitalAdjustments } from '@/shared/hooks/useTransactions'
import { useHoldings, removeHolding } from '@/shared/hooks/useHoldings'
import { useAssets, removeAsset, updateAsset } from '@/shared/hooks/useAssets'
import { upsertAssetPrice } from '@/shared/hooks/useAssetPrices'
import { toCents, fromCents } from '@/domain/money'
import { useT } from '@/shared/i18n'
import GeneralAssetsSection from '../components/GeneralAssetsSection'
import HoldingFormModal from '../components/HoldingFormModal'
import AssetFormModal from '../components/AssetFormModal'
import PortfolioSummary from '../components/PortfolioSummary'
import InvestmentAccountCard from '../components/InvestmentAccountCard'
import InvestmentForecastSection from '../components/InvestmentForecastSection'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import AccountFormModal from '@/features/accounts/components/AccountFormModal'
import type { Asset, Holding, Account } from '@/domain/types'

export default function InvestmentsPage() {
  const t = useT()
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts()
  const { data: holdings = [], isLoading: loadingHoldings } = useHoldings()
  const { data: assets = [],   isLoading: loadingAssets }   = useAssets()

  const [holdingModalOpen, setHoldingModalOpen] = useState(false)
  const [editHolding,      setEditHolding]      = useState<Holding | undefined>()
  const [modalAccount,     setModalAccount]     = useState<number>(0)
  const [expanded,         setExpanded]         = useState<Record<number, boolean>>({})
  const [assetModalOpen,   setAssetModalOpen]   = useState(false)
  const [editAsset,        setEditAsset]        = useState<Asset | undefined>()
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editAccount,      setEditAccount]      = useState<Account | undefined>()
  const [editingPrice,         setEditingPrice]         = useState<{ assetId: number; value: string; date: string } | null>(null)
  const [confirmDeleteHolding, setConfirmDeleteHolding] = useState<Holding | null>(null)
  const [confirmDeleteAsset,   setConfirmDeleteAsset]   = useState<Asset | null>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)

  const investmentAccounts    = accounts.filter(a => a.type === 'investment')
  const assetMap              = Object.fromEntries(assets.map(a => [a.id!, a]))
  const investmentAccountIds  = investmentAccounts.flatMap(a => a.id != null ? [a.id] : [])
  const { data: capitalAdjustments = {} } = useInvestmentCapitalAdjustments(investmentAccountIds)

  const openAddHolding  = (accountId: number) => { setEditHolding(undefined); setModalAccount(accountId); setHoldingModalOpen(true) }
  const openEditHolding = (h: Holding)        => { setEditHolding(h); setModalAccount(h.accountId); setHoldingModalOpen(true) }
  const handleDeleteHolding = (h: Holding) => setConfirmDeleteHolding(h)
  const handleConfirmDeleteHolding = async () => {
    if (!confirmDeleteHolding) return
    await removeHolding(confirmDeleteHolding.id!)
    setConfirmDeleteHolding(null)
  }

  const openAddAsset  = () => { setEditAsset(undefined); setAssetModalOpen(true) }
  const openEditAsset = (a: Asset) => { setEditAsset(a); setAssetModalOpen(true) }
  const handleDeleteAsset = (a: Asset) => setConfirmDeleteAsset(a)
  const handleConfirmDeleteAsset = async () => {
    if (!confirmDeleteAsset) return
    await removeAsset(confirmDeleteAsset.id!)
    setConfirmDeleteAsset(null)
  }

  const startEditPrice = (a: Asset) => {
    setEditingPrice({
      assetId: a.id!,
      value: String(fromCents(a.currentPrice)),
      date: format(new Date(), 'yyyy-MM-dd'),
    })
    setTimeout(() => priceInputRef.current?.select(), 0)
  }
  const commitEditPrice = async (a: Asset) => {
    if (!editingPrice || editingPrice.assetId !== a.id) return
    const parsed = parseFloat(editingPrice.value.replace(',', '.'))
    if (!isNaN(parsed) && parsed >= 0) {
      const priceCents = toCents(parsed)
      await updateAsset(a.id!, { currentPrice: priceCents })
      if (editingPrice.date) await upsertAssetPrice(a.id!, priceCents, editingPrice.date)
    }
    setEditingPrice(null)
  }

  if (loadingAccounts || loadingHoldings || loadingAssets) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        {t('common.loading')}
      </div>
    )
  }

  const totalMarketValue  = holdings.reduce((s, h) => s + h.quantity * (assetMap[h.assetId]?.currentPrice ?? 0), 0)
  const totalCost         = holdings.reduce((s, h) => s + h.quantity * h.avgCost, 0)
  const totalFees         = investmentAccounts.reduce((s, a) => s + (a.entryFee ?? 0) * holdings.filter(h => h.accountId === a.id).length, 0)
  const totalAdjustedCost = totalCost + totalFees
  const totalPnL          = totalMarketValue - totalAdjustedCost
  const totalPnLPct       = totalAdjustedCost > 0 ? (totalPnL / totalAdjustedCost) * 100 : 0
  const totalInvestedBase = investmentAccounts.reduce((s, a) => s + (a.investedBase ?? 0), 0)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t('investments.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('investments.subtitle')}</p>
      </div>

      <GeneralAssetsSection
        assets={assets}
        editingPrice={editingPrice}
        priceInputRef={priceInputRef}
        onAddAsset={openAddAsset}
        onEditAsset={openEditAsset}
        onDeleteAsset={a => { void handleDeleteAsset(a) }}
        onStartEditPrice={startEditPrice}
        onPriceChange={v => setEditingPrice(prev => prev ? { ...prev, value: v } : null)}
        onDateChange={d => setEditingPrice(prev => prev ? { ...prev, date: d } : null)}
        onCommitEditPrice={a => { void commitEditPrice(a) }}
        onCancelEditPrice={() => setEditingPrice(null)}
      />

      {investmentAccounts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium">{t('investments.noInvestmentAccounts')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('investments.noInvestmentAccountsDesc')}</p>
        </div>
      ) : (
        investmentAccounts.map(account => {
          const accountHoldings   = holdings.filter(h => h.accountId === account.id)
          const accountMarketValue = accountHoldings.reduce(
            (s, h) => s + h.quantity * (assetMap[h.assetId]?.currentPrice ?? 0), 0,
          )
          return (
            <div key={account.id} className="space-y-4">
              <InvestmentAccountCard
                account={account}
                accountHoldings={accountHoldings}
                assetMap={assetMap}
                capitalAmount={account.id != null ? (capitalAdjustments[account.id] ?? 0) : 0}
                isOpen={expanded[account.id!] === true}
                canAddHolding={assets.length > 0}
                onToggle={() => setExpanded(prev => ({ ...prev, [account.id!]: !prev[account.id!] }))}
                onAddHolding={() => openAddHolding(account.id!)}
                onEditHolding={openEditHolding}
                onDeleteHolding={h => { void handleDeleteHolding(h) }}
                onEditAccount={() => { setEditAccount(account); setAccountModalOpen(true) }}
              />
              <InvestmentForecastSection
                currentValueCents={accountMarketValue}
                accountName={account.name}
                chartId={account.id}
              />
            </div>
          )
        })
      )}

      {investmentAccounts.length > 0 && holdings.length > 0 && (
        <PortfolioSummary
          title="Portfolio Total"
          totalInvestedBase={totalInvestedBase}
          totalAdjustedCost={totalAdjustedCost}
          totalFees={totalFees}
          totalMarketValue={totalMarketValue}
          totalPnL={totalPnL}
          totalPnLPct={totalPnLPct}
        />
      )}

      <HoldingFormModal open={holdingModalOpen} onClose={() => setHoldingModalOpen(false)}
        accountId={modalAccount} holding={editHolding} assets={assets} />
      <AssetFormModal open={assetModalOpen} onClose={() => setAssetModalOpen(false)} asset={editAsset} />
      <AccountFormModal open={accountModalOpen} onClose={() => { setAccountModalOpen(false); setEditAccount(undefined) }}
        account={editAccount} />

      <ConfirmDialog
        open={confirmDeleteHolding != null}
        title={t('common.delete')}
        description={t('investments.deleteConfirm')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleConfirmDeleteHolding}
        onCancel={() => setConfirmDeleteHolding(null)}
      />
      <ConfirmDialog
        open={confirmDeleteAsset != null}
        title={t('common.delete')}
        description={t('investments.deleteAssetConfirm')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleConfirmDeleteAsset}
        onCancel={() => setConfirmDeleteAsset(null)}
      />
    </div>
  )
}
