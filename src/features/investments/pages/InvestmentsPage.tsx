import { useState } from 'react'
import { TrendingUp, TrendingDown, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { useHoldings, removeHolding } from '@/shared/hooks/useHoldings'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import HoldingFormModal from '../components/HoldingFormModal'
import type { Holding } from '@/domain/types'

export default function InvestmentsPage() {
  const t = useT()
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts()
  const { data: holdings = [], isLoading: loadingHoldings } = useHoldings()

  const [modalOpen,     setModalOpen]     = useState(false)
  const [editHolding,   setEditHolding]   = useState<Holding | undefined>()
  const [modalAccount,  setModalAccount]  = useState<number>(0)
  const [expanded,      setExpanded]      = useState<Record<number, boolean>>({})

  const investmentAccounts = accounts.filter(a => a.type === 'investment')

  const openAdd = (accountId: number) => {
    setEditHolding(undefined)
    setModalAccount(accountId)
    setModalOpen(true)
  }
  const openEdit = (holding: Holding) => {
    setEditHolding(holding)
    setModalAccount(holding.accountId)
    setModalOpen(true)
  }
  const handleDelete = async (holding: Holding) => {
    if (!confirm(t('investments.deleteConfirm'))) return
    await removeHolding(holding.id!)
  }
  const toggleExpand = (accountId: number) => {
    setExpanded(prev => ({ ...prev, [accountId]: !prev[accountId] }))
  }

  if (loadingAccounts || loadingHoldings) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        {t('common.loading')}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('investments.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('investments.subtitle')}</p>
      </div>

      {investmentAccounts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium">{t('investments.noInvestmentAccounts')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('investments.noInvestmentAccountsDesc')}</p>
        </div>
      ) : (
        investmentAccounts.map(account => {
          const accountHoldings = holdings.filter(h => h.accountId === account.id)
          const totalMarketValue = accountHoldings.reduce((s, h) => s + h.quantity * h.currentPrice, 0)
          const totalCostBasis   = accountHoldings.reduce((s, h) => s + h.quantity * h.avgCost, 0)
          const totalPnL         = totalMarketValue - totalCostBasis
          const pnlPct           = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0
          const isOpen           = expanded[account.id!] !== false  // default expanded

          return (
            <div key={account.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              {/* Account header */}
              <button
                type="button"
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-accent/30 transition-colors text-left"
                onClick={() => toggleExpand(account.id!)}
              >
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: account.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base truncate">{account.name}</p>
                  <p className="text-xs text-muted-foreground">{account.currency}</p>
                </div>

                {/* Summary stats */}
                <div className="hidden sm:flex items-center gap-6 text-sm shrink-0">
                  {account.investedBase != null && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{t('investments.investedBase')}</p>
                      <p className="font-medium tabular-nums">{formatMoney(account.investedBase, account.currency)}</p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t('accounts.types.investment')}</p>
                    <p className="font-medium tabular-nums">{formatMoney(account.balance, account.currency)}</p>
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

                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>

              {/* Holdings table */}
              {isOpen && (
                <div className="border-t">
                  {accountHoldings.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <p className="text-sm text-muted-foreground">{t('investments.noHoldings')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('investments.noHoldingsDesc')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                            <th className="px-5 py-2.5 text-left font-medium">{t('investments.holding')}</th>
                            <th className="px-4 py-2.5 text-right font-medium">{t('investments.quantity')}</th>
                            <th className="px-4 py-2.5 text-right font-medium">{t('investments.avgCost')}</th>
                            <th className="px-4 py-2.5 text-right font-medium">{t('investments.currentPrice')}</th>
                            <th className="px-4 py-2.5 text-right font-medium">{t('investments.marketValue')}</th>
                            <th className="px-4 py-2.5 text-right font-medium">{t('investments.pnl')}</th>
                            <th className="px-4 py-2.5 w-16" />
                          </tr>
                        </thead>
                        <tbody>
                          {accountHoldings.map(h => {
                            const marketVal  = h.quantity * h.currentPrice
                            const costBasis  = h.quantity * h.avgCost
                            const pnl        = marketVal - costBasis
                            const pnlPctH    = costBasis > 0 ? (pnl / costBasis) * 100 : 0
                            const isPositive = pnl >= 0

                            return (
                              <tr key={h.id} className="border-b last:border-0 hover:bg-accent/20 transition-colors">
                                <td className="px-5 py-3">
                                  <p className="font-medium">{h.name}</p>
                                  {h.ticker && <p className="text-xs text-muted-foreground uppercase">{h.ticker}</p>}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                  {h.quantity % 1 === 0 ? h.quantity.toFixed(0) : h.quantity.toFixed(4)}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                                  {formatMoney(h.avgCost, account.currency)}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                  {formatMoney(h.currentPrice, account.currency)}
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
                                      onClick={() => openEdit(h)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                      onClick={() => { void handleDelete(h) }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        {/* Totals row */}
                        {accountHoldings.length > 1 && (
                          <tfoot>
                            <tr className="border-t bg-muted/20 text-sm font-semibold">
                              <td className="px-5 py-2.5 text-muted-foreground" colSpan={4}>Total</td>
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
                  )}

                  {/* Add holding button */}
                  <div className="px-5 py-3 border-t bg-muted/10">
                    <Button variant="outline" size="sm" onClick={() => openAdd(account.id!)}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      {t('investments.addHolding')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Portfolio summary */}
      {investmentAccounts.length > 0 && holdings.length > 0 && (() => {
        const totalPortfolio  = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0)
        const totalCost       = holdings.reduce((s, h) => s + h.quantity * h.avgCost, 0)
        const totalPnL        = totalPortfolio - totalCost
        const totalPnLPct     = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0
        const totalInvBase    = investmentAccounts.reduce((s, a) => s + (a.investedBase ?? 0), 0)
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
                <p className="text-lg font-bold tabular-nums">{formatMoney(totalCost)}</p>
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

      {/* Modal */}
      <HoldingFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        accountId={modalAccount}
        holding={editHolding}
      />
    </div>
  )
}
