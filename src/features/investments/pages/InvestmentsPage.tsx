import { useState, useRef } from 'react'
import { TrendingUp, TrendingDown, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Settings2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import BankLogo from '@/shared/components/BankLogo'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { useHoldings, removeHolding } from '@/shared/hooks/useHoldings'
import { useAssets, removeAsset, updateAsset } from '@/shared/hooks/useAssets'
import { formatMoney, toCents, fromCents } from '@/domain/money'
import { useT } from '@/shared/i18n'
import HoldingFormModal from '../components/HoldingFormModal'
import AssetFormModal from '../components/AssetFormModal'
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

  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [editAsset,      setEditAsset]      = useState<Asset | undefined>()

  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editAccount,      setEditAccount]      = useState<Account | undefined>()

  const [editingPrice, setEditingPrice] = useState<{ assetId: number; value: string } | null>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)

  const investmentAccounts = accounts.filter(a => a.type === 'investment')
  const assetMap = Object.fromEntries(assets.map(a => [a.id!, a]))

  const openAddHolding = (accountId: number) => {
    setEditHolding(undefined)
    setModalAccount(accountId)
    setHoldingModalOpen(true)
  }
  const openEditHolding = (holding: Holding) => {
    setEditHolding(holding)
    setModalAccount(holding.accountId)
    setHoldingModalOpen(true)
  }
  const handleDeleteHolding = async (holding: Holding) => {
    if (!confirm(t('investments.deleteConfirm'))) return
    await removeHolding(holding.id!)
  }
  const toggleExpand = (accountId: number) => {
    setExpanded(prev => ({ ...prev, [accountId]: !prev[accountId] }))
  }

  const openAddAsset  = () => { setEditAsset(undefined); setAssetModalOpen(true) }
  const openEditAsset = (asset: Asset) => { setEditAsset(asset); setAssetModalOpen(true) }
  const handleDeleteAsset = async (asset: Asset) => {
    if (!confirm(t('investments.deleteAssetConfirm'))) return
    await removeAsset(asset.id!)
  }

  const startEditPrice = (asset: Asset) => {
    setEditingPrice({ assetId: asset.id!, value: String(fromCents(asset.currentPrice)) })
    setTimeout(() => priceInputRef.current?.select(), 0)
  }
  const commitEditPrice = async (asset: Asset) => {
    if (!editingPrice || editingPrice.assetId !== asset.id) return
    const parsed = parseFloat(editingPrice.value.replace(',', '.'))
    if (!isNaN(parsed) && parsed >= 0) {
      await updateAsset(asset.id!, { currentPrice: toCents(parsed) })
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('investments.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('investments.subtitle')}</p>
      </div>

      {/* ── Assets section ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('investments.assets')}</h2>
          <Button variant="outline" size="sm" onClick={openAddAsset}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {t('investments.addAsset')}
          </Button>
        </div>

        {assets.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">{t('investments.noAssets')}</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">{t('investments.assetName')}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{t('investments.ticker')}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t('investments.currentPrice')}</th>
                  <th className="px-4 py-2.5 w-16" />
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => (
                  <tr key={asset.id} className="border-b last:border-0 hover:bg-accent/20 transition-colors">
                    <td className="px-5 py-3 font-medium">{asset.name}</td>
                    <td className="px-4 py-3 text-muted-foreground uppercase text-xs">{asset.ticker ?? '—'}</td>
                    <td
                      className="px-4 py-3 text-right tabular-nums cursor-pointer group"
                      onClick={() => startEditPrice(asset)}
                      title="Click to update price"
                    >
                      {editingPrice?.assetId === asset.id ? (
                        <input
                          ref={priceInputRef}
                          type="number"
                          step="0.0001"
                          min="0"
                          className="w-28 text-right tabular-nums bg-background border border-primary rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          value={editingPrice.value}
                          onChange={e => setEditingPrice(prev => prev ? { ...prev, value: e.target.value } : null)}
                          onBlur={() => { void commitEditPrice(asset) }}
                          onKeyDown={e => {
                            if (e.key === 'Enter')  { e.currentTarget.blur() }
                            if (e.key === 'Escape') { setEditingPrice(null) }
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className="group-hover:underline group-hover:decoration-dotted">
                          {formatMoney(asset.currentPrice)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                          onClick={() => openEditAsset(asset)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          onClick={() => { void handleDeleteAsset(asset) }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Per-account holdings ────────────────────────────────────────── */}
      {investmentAccounts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium">{t('investments.noInvestmentAccounts')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('investments.noInvestmentAccountsDesc')}</p>
        </div>
      ) : (
        investmentAccounts.map(account => {
          const accountHoldings  = holdings.filter(h => h.accountId === account.id)
          const totalMarketValue = accountHoldings.reduce((s, h) => s + h.quantity * (assetMap[h.assetId]?.currentPrice ?? 0), 0)
          const totalCostBasis   = accountHoldings.reduce((s, h) => s + h.quantity * h.avgCost, 0)
          const totalFees        = (account.entryFee ?? 0) * accountHoldings.length
          const adjCostBasis     = totalCostBasis + totalFees
          const totalPnL         = totalMarketValue - adjCostBasis
          const pnlPct           = adjCostBasis > 0 ? (totalPnL / adjCostBasis) * 100 : 0
          const isOpen           = expanded[account.id!] !== false

          const bank = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined

          return (
            <div key={account.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              {/* Account header */}
              <div
                role="button"
                tabIndex={0}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-accent/30 transition-colors text-left cursor-pointer"
                onClick={() => toggleExpand(account.id!)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(account.id!) }}
              >
                {bank ? (
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <BankLogo
                      domain={bank.logoDomain}
                      name={bank.name}
                      accountType={account.type}
                      imgClassName="h-5 w-5 object-contain"
                      iconClassName="h-4 w-4 text-muted-foreground"
                    />
                  </div>
                ) : (
                  <div className="h-3 w-3 rounded-full shrink-0 ml-3" style={{ backgroundColor: account.color }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base truncate">{account.name}</p>
                  <p className="text-xs text-muted-foreground">{bank ? bank.name : account.currency}</p>
                </div>

                <div className="hidden sm:flex items-center gap-6 text-sm shrink-0">
                  {account.investedBase != null && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{t('investments.investedBase')}</p>
                      <p className="font-medium tabular-nums">{formatMoney(account.investedBase, account.currency)}</p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t('investments.marketValue')}</p>
                    <p className="font-medium tabular-nums">{formatMoney(totalMarketValue, account.currency)}</p>
                  </div>
                  {accountHoldings.length > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{t('investments.pnl')}</p>
                      <p className={`font-semibold tabular-nums ${totalPnL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {totalPnL >= 0 ? '+' : ''}{formatMoney(totalPnL, account.currency)}
                        <span className="text-xs ml-1">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
                  title="Editar conta"
                  onClick={e => { e.stopPropagation(); setEditAccount(account); setAccountModalOpen(true) }}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
                {isOpen
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>

              {/* Holdings table */}
              {isOpen && (
                <div className="border-t">
                  {accountHoldings.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <p className="text-sm text-muted-foreground">{t('investments.noHoldings')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('investments.noHoldingsDesc')}</p>
                    </div>
                  ) : (
                    <>
                      {/* Compact view — below 1024px */}
                      <div className="lg:hidden divide-y">
                        {accountHoldings.map(h => {
                          const asset      = assetMap[h.assetId]
                          const marketVal  = h.quantity * (asset?.currentPrice ?? 0)
                          const costBasis  = h.quantity * h.avgCost
                          const pnl        = marketVal - costBasis
                          const pnlPctH    = costBasis > 0 ? (pnl / costBasis) * 100 : 0
                          const isPositive = pnl >= 0
                          return (
                            <div key={h.id} className="px-4 py-3 hover:bg-accent/20 transition-colors flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{asset?.name ?? '—'}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {asset?.ticker && <span className="uppercase mr-1.5">{asset.ticker}</span>}
                                  {h.quantity % 1 === 0 ? h.quantity.toFixed(0) : h.quantity.toFixed(4)} × {formatMoney(h.avgCost, account.currency)}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-semibold tabular-nums text-sm">{formatMoney(marketVal, account.currency)}</p>
                                <p className={`text-xs tabular-nums ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {isPositive ? '+' : ''}{formatMoney(pnl, account.currency)} ({isPositive ? '+' : ''}{pnlPctH.toFixed(1)}%)
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                  onClick={() => openEditHolding(h)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                  onClick={() => { void handleDeleteHolding(h) }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                        {accountHoldings.length > 1 && (
                          <div className="px-4 py-2.5 bg-muted/20 flex items-center justify-between text-sm font-semibold border-t">
                            <span className="text-muted-foreground">Total</span>
                            <div className="text-right">
                              <span className="tabular-nums">{formatMoney(totalMarketValue, account.currency)}</span>
                              <span className={`ml-2 tabular-nums text-xs ${totalPnL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {totalPnL >= 0 ? '+' : ''}{formatMoney(totalPnL, account.currency)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Full table — 1024px and above */}
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                              <th className="px-5 py-2.5 text-left font-medium">{t('investments.asset')}</th>
                              <th className="px-4 py-2.5 text-right font-medium">{t('investments.quantity')}</th>
                              <th className="px-4 py-2.5 text-right font-medium">{t('investments.avgCost')}</th>
                              <th className="px-4 py-2.5 text-right font-medium">{t('investments.marketValue')}</th>
                              <th className="px-4 py-2.5 text-right font-medium">{t('investments.pnl')}</th>
                              <th className="px-4 py-2.5 w-16" />
                            </tr>
                          </thead>
                          <tbody>
                            {accountHoldings.map(h => {
                              const asset      = assetMap[h.assetId]
                              const marketVal  = h.quantity * (asset?.currentPrice ?? 0)
                              const costBasis  = h.quantity * h.avgCost
                              const pnl        = marketVal - costBasis
                              const pnlPctH    = costBasis > 0 ? (pnl / costBasis) * 100 : 0
                              const isPositive = pnl >= 0

                              return (
                                <tr key={h.id} className="border-b last:border-0 hover:bg-accent/20 transition-colors">
                                  <td className="px-5 py-3">
                                    <p className="font-medium">{asset?.name ?? '—'}</p>
                                    {asset?.ticker && <p className="text-xs text-muted-foreground uppercase">{asset.ticker}</p>}
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums">
                                    {h.quantity % 1 === 0 ? h.quantity.toFixed(0) : h.quantity.toFixed(4)}
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                                    {formatMoney(h.avgCost, account.currency)}
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                                    {formatMoney(marketVal, account.currency)}
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums">
                                    <span className={`font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {isPositive ? '+' : ''}{formatMoney(pnl, account.currency)}
                                    </span>
                                    <br />
                                    <span className={`text-xs ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {isPositive ? '+' : ''}{pnlPctH.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-1 justify-end">
                                      <button
                                        type="button"
                                        className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                        onClick={() => openEditHolding(h)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                        onClick={() => { void handleDeleteHolding(h) }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          {accountHoldings.length > 1 && (
                            <tfoot>
                              <tr className="border-t bg-muted/20 text-sm font-semibold">
                                <td className="px-5 py-2.5 text-muted-foreground" colSpan={3}>Total</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(totalMarketValue, account.currency)}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">
                                  <span className={totalPnL >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                                    {totalPnL >= 0 ? '+' : ''}{formatMoney(totalPnL, account.currency)}
                                  </span>
                                </td>
                                <td />
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </>
                  )}

                  <div className="px-5 py-3 border-t bg-muted/10 flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddHolding(account.id!)}
                      disabled={assets.length === 0}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      {t('investments.addHolding')}
                    </Button>
                    {assets.length === 0 && (
                      <span className="text-xs text-muted-foreground">{t('investments.addAssetsFirst')}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}

      {/* ── Portfolio summary ───────────────────────────────────────────── */}
      {investmentAccounts.length > 0 && holdings.length > 0 && (() => {
        const totalPortfolio = holdings.reduce((s, h) => s + h.quantity * (assetMap[h.assetId]?.currentPrice ?? 0), 0)
        const totalCost      = holdings.reduce((s, h) => s + h.quantity * h.avgCost, 0)
        const totalFees      = investmentAccounts.reduce((s, a) => s + (a.entryFee ?? 0) * holdings.filter(h => h.accountId === a.id).length, 0)
        const totalAdjCost   = totalCost + totalFees
        const totalPnL       = totalPortfolio - totalAdjCost
        const totalPnLPct    = totalAdjCost > 0 ? (totalPnL / totalAdjCost) * 100 : 0
        const totalInvBase   = investmentAccounts.reduce((s, a) => s + (a.investedBase ?? 0), 0)
        return (
          <div className="rounded-xl border bg-card shadow-sm p-5">
            <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Portfolio Total</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {totalInvBase > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">{t('investments.investedBase')}</p>
                  <p className="text-lg font-bold tabular-nums">{formatMoney(totalInvBase)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">{t('investments.costBasis')}</p>
                <p className="text-lg font-bold tabular-nums">{formatMoney(totalAdjCost)}</p>
                {totalFees > 0 && <p className="text-xs text-muted-foreground">incl. {formatMoney(totalFees)} fees</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('investments.marketValue')}</p>
                <p className="text-lg font-bold tabular-nums">{formatMoney(totalPortfolio)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('investments.pnl')}</p>
                <p className={`text-lg font-bold tabular-nums flex items-center gap-1 ${totalPnL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {totalPnL >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {totalPnL >= 0 ? '+' : ''}{formatMoney(totalPnL)}
                  <span className="text-sm">({totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(1)}%)</span>
                </p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modals */}
      <HoldingFormModal
        open={holdingModalOpen}
        onClose={() => setHoldingModalOpen(false)}
        accountId={modalAccount}
        holding={editHolding}
        assets={assets}
      />
      <AssetFormModal
        open={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        asset={editAsset}
      />
      <AccountFormModal
        open={accountModalOpen}
        onClose={() => { setAccountModalOpen(false); setEditAccount(undefined) }}
        account={editAccount}
      />
    </div>
  )
}
