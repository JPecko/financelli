import { TrendingUp } from 'lucide-react'
import { useT } from '@/shared/i18n'
import { useInvestmentsPageModel } from '../hooks/useInvestmentsPageModel'
import GeneralAssetsSection from '../components/GeneralAssetsSection'
import HoldingFormModal from '../components/HoldingFormModal'
import HoldingImportModal from '../components/HoldingImportModal'
import AssetFormModal from '../components/AssetFormModal'
import PortfolioSummary from '../components/PortfolioSummary'
import InvestmentAccountCard from '../components/InvestmentAccountCard'
import InvestmentAccountSelector from '../components/InvestmentAccountSelector'
import InvestmentForecastSection from '../components/InvestmentForecastSection'
import InvestmentSimulatorSection from '../components/InvestmentSimulatorSection'
import InvestmentHistoryChart from '../components/InvestmentHistoryChart'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import AccountFormModal from '@/features/accounts/components/AccountFormModal'

export default function InvestmentsPage() {
  const t = useT()
  const m = useInvestmentsPageModel()

  if (m.isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        {t('common.loading')}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t('investments.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('investments.subtitle')}</p>
      </div>

      <GeneralAssetsSection
        assets={m.assets}
        editingPrice={m.priceEditor.editingPrice}
        priceInputRef={m.priceEditor.priceInputRef}
        onAddAsset={m.openAddAsset}
        onEditAsset={m.openEditAsset}
        onDeleteAsset={a => { void m.handleDeleteAsset(a) }}
        onStartEditPrice={m.priceEditor.startEditPrice}
        onPriceChange={m.priceEditor.onPriceChange}
        onDateChange={m.priceEditor.onDateChange}
        onCommitEditPrice={a => { void m.priceEditor.commitEditPrice(a) }}
        onCancelEditPrice={m.priceEditor.cancelEditPrice}
        onSyncPrices={m.assets.some(a => a.ticker) ? () => { void m.handleSyncPrices() } : undefined}
        isSyncing={m.syncing}
      />

      {m.investmentAccounts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium">{t('investments.noInvestmentAccounts')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('investments.noInvestmentAccountsDesc')}</p>
        </div>
      ) : (
        <>
          <InvestmentAccountSelector
            accounts={m.investmentAccounts}
            statsMap={m.accountStatsMap}
            selectedId={m.selectedAccountId}
            onSelect={m.handleSelectAccount}
          />

          {m.selectedAccount && (
            <div className="space-y-4">
              <InvestmentAccountCard
                account={m.selectedAccount}
                accountHoldings={m.selectedHoldings}
                assetMap={m.assetMap}
                capitalAmount={m.capitalAmount}
                isOpen={true}
                hideToggle={true}
                canAddHolding={m.assets.length > 0}
                canManageHoldings={m.isOwner}
                onToggle={() => {}}
                onAddHolding={() => m.openAddHolding(m.selectedAccount!.id!)}
                onEditHolding={m.openEditHolding}
                onDeleteHolding={h => { void m.handleDeleteHolding(h) }}
                onEditAccount={() => { m.setEditAccount(m.selectedAccount!); m.setAccountModalOpen(true) }}
                onImport={m.selectedAccount.broker
                  ? () => { m.setImportAccount(m.selectedAccount!); m.setImportModalOpen(true) }
                  : undefined}
              />

              <InvestmentHistoryChart
                accountId={m.selectedAccount.id!}
                accountName={m.selectedAccount.name}
                assetMap={m.assetMap}
              />

              <InvestmentForecastSection
                currentValueCents={m.selMarketValue}
                accountName={m.selectedAccount.name}
                chartId={m.selectedAccount.id}
              />

              {m.selectedHoldings.length > 0 && (
                <PortfolioSummary
                  title={m.selectedAccount.name}
                  totalInvestedBase={m.selInvestedBase}
                  totalAdjustedCost={m.selAdjCost}
                  totalFees={m.selFees}
                  totalMarketValue={m.selMarketValue}
                  totalPnL={m.selPnL}
                  totalPnLPct={m.selPnLPct}
                  accentColor={m.selectedAccount.color}
                />
              )}
            </div>
          )}

          {m.investmentAccounts.length > 1 && m.holdings.length > 0 && (
            <PortfolioSummary
              title="Portfolio Total"
              totalInvestedBase={m.totalInvestedBase}
              totalAdjustedCost={m.totalAdjustedCost}
              totalFees={m.totalFees}
              totalMarketValue={m.totalMarketValue}
              totalPnL={m.totalPnL}
              totalPnLPct={m.totalPnLPct}
            />
          )}
        </>
      )}

      <InvestmentSimulatorSection />

      <HoldingFormModal
        open={m.holdingModalOpen}
        onClose={() => m.setHoldingModalOpen(false)}
        accountId={m.modalAccount}
        holding={m.editHolding}
        assets={m.assets}
      />
      <AssetFormModal
        open={m.assetModalOpen}
        onClose={() => m.setAssetModalOpen(false)}
        asset={m.editAsset}
      />
      <AccountFormModal
        open={m.accountModalOpen}
        onClose={() => { m.setAccountModalOpen(false); m.setEditAccount(undefined) }}
        account={m.editAccount}
      />
      {m.importAccount && (
        <HoldingImportModal
          open={m.importModalOpen}
          onClose={() => { m.setImportModalOpen(false); m.setImportAccount(undefined) }}
          accountId={m.importAccount.id!}
          broker={m.importAccount.broker}
          assets={m.assets}
          holdings={m.holdings}
        />
      )}

      <ConfirmDialog
        open={m.confirmDeleteHolding != null}
        title={t('common.delete')}
        description={t('investments.deleteConfirm')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={m.handleConfirmDeleteHolding}
        onCancel={() => m.setConfirmDeleteHolding(null)}
      />
      <ConfirmDialog
        open={m.confirmDeleteAsset != null}
        title={t('common.delete')}
        description={t('investments.deleteAssetConfirm')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={m.handleConfirmDeleteAsset}
        onCancel={() => m.setConfirmDeleteAsset(null)}
      />
    </div>
  )
}
