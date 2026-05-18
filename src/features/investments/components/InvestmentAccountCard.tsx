import { ChevronDown, ChevronUp, Pencil, Plus, Settings2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import BankLogo from '@/shared/components/BankLogo'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { computeInvestmentBalance, computeMarketValue } from '../utils/investmentMetrics'
import type { Account, Asset, Holding, Transaction } from '@/domain/types'

// ── Local class constants ─────────────────────────────────────────────────────

const cx = {
  header:    'w-full flex items-center gap-4 px-5 py-4 hover:bg-accent/30 transition-colors text-left cursor-pointer',
  statCard:  'rounded-lg bg-background px-3 py-2',
  statLabel: 'text-[11px] text-muted-foreground',
  iconBtn:   'h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors shrink-0',
  deleteBtn: 'h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  account:            Account
  accountHoldings:    Holding[]
  assetMap:           Record<number, Asset>
  capitalAmount:      number
  isOpen:             boolean
  canAddHolding:      boolean
  canManageHoldings:  boolean
  hideToggle?:        boolean
  onToggle:           () => void
  onAddHolding:       () => void
  onEditHolding:      (h: Holding) => void
  onDeleteHolding:    (h: Holding) => void
  onEditAccount:      () => void
  onImport?:          () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const pnlCls = (v: number) => v >= 0 ? 'text-emerald-600' : 'text-red-500'
const fmtQty = (q: number) => q % 1 === 0 ? q.toFixed(0) : parseFloat(q.toFixed(6)).toString()
const sign   = (v: number) => v >= 0 ? '+' : ''

// ── AccountHeader ─────────────────────────────────────────────────────────────

interface HeaderStats {
  portfolioBalance: number
  investedBase:     number
  totalMarketValue: number
  totalPnL:         number
  pnlPct:           number
  hasHoldings:      boolean
}

function AccountHeader({ account, bank, isOpen, hideToggle, stats, onToggle, onEditAccount }: {
  account:       Account
  bank:          ReturnType<typeof BANK_OPTIONS.find>
  isOpen:        boolean
  hideToggle?:   boolean
  stats:         HeaderStats
  onToggle:      () => void
  onEditAccount: () => void
}) {
  const t = useT()
  return (
    <div
      role={hideToggle ? undefined : 'button'}
      tabIndex={hideToggle ? undefined : 0}
      className={cx.header + (hideToggle ? ' cursor-default hover:bg-transparent' : '')}
      onClick={hideToggle ? undefined : onToggle}
      onKeyDown={hideToggle ? undefined : (e => { if (e.key === 'Enter' || e.key === ' ') onToggle() })}
    >
      {bank ? (
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <BankLogo domain={bank.logoDomain} name={bank.name} accountType={account.type}
            imgClassName="h-5 w-5 object-contain" iconClassName="h-4 w-4 text-muted-foreground" />
        </div>
      ) : (
        <div className="h-3 w-3 rounded-full shrink-0 ml-3" style={{ backgroundColor: account.color }} />
      )}

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base truncate">{account.name}</p>
        <p className="text-xs text-muted-foreground">{bank ? bank.name : account.currency}</p>
      </div>

      <div className="hidden lg:flex items-center gap-6 text-sm shrink-0">
        <StatCol label={t('dashboard.portfolioValue')} value={formatMoney(stats.portfolioBalance, account.currency)} bold />
        {account.investedBase != null && (
          <StatCol label={t('investments.investedBase')} value={formatMoney(stats.investedBase, account.currency)} />
        )}
        <StatCol label={t('investments.marketValue')} value={formatMoney(stats.totalMarketValue, account.currency)} />
        {stats.hasHoldings && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t('investments.pnl')}</p>
            <p className={`font-semibold tabular-nums ${pnlCls(stats.totalPnL)}`}>
              {sign(stats.totalPnL)}{formatMoney(stats.totalPnL, account.currency)}
              <span className="text-xs ml-1">({sign(stats.pnlPct)}{stats.pnlPct.toFixed(1)}%)</span>
            </p>
          </div>
        )}
      </div>

      <button type="button" className={cx.iconBtn} title={t('common.edit')}
        onClick={e => { e.stopPropagation(); onEditAccount() }}>
        <Settings2 className="h-3.5 w-3.5" />
      </button>
      {!hideToggle && (isOpen
        ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />)}
    </div>
  )
}

function StatCol({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="text-right">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`tabular-nums ${bold ? 'font-semibold' : 'font-medium'}`}>{value}</p>
    </div>
  )
}

// ── MobileStats ───────────────────────────────────────────────────────────────

function MobileStats({ account, stats }: { account: Account; stats: HeaderStats }) {
  const t = useT()
  return (
    <div className="border-t bg-muted/10 px-5 py-3 lg:hidden">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className={cx.statCard}>
          <p className={cx.statLabel}>{t('dashboard.portfolioValue')}</p>
          <p className="font-semibold tabular-nums">{formatMoney(stats.portfolioBalance, account.currency)}</p>
        </div>
        <div className={cx.statCard}>
          <p className={cx.statLabel}>{t('investments.marketValue')}</p>
          <p className="font-medium tabular-nums">{formatMoney(stats.totalMarketValue, account.currency)}</p>
        </div>
        <div className={cx.statCard}>
          <p className={cx.statLabel}>{t('investments.investedBase')}</p>
          <p className="font-medium tabular-nums">{formatMoney(stats.investedBase, account.currency)}</p>
        </div>
        <div className={cx.statCard}>
          <p className={cx.statLabel}>{t('investments.pnl')}</p>
          <p className={`font-semibold tabular-nums ${pnlCls(stats.totalPnL)}`}>
            {sign(stats.totalPnL)}{formatMoney(stats.totalPnL, account.currency)}
          </p>
          {stats.hasHoldings && (
            <p className={`text-[11px] ${pnlCls(stats.totalPnL)}`}>
              {sign(stats.pnlPct)}{stats.pnlPct.toFixed(1)}%
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── HoldingsList ──────────────────────────────────────────────────────────────

function HoldingsList({ account, accountHoldings, assetMap, totalMarketValue, totalPnL, canManage, onEdit, onDelete }: {
  account:          Account
  accountHoldings:  Holding[]
  assetMap:         Record<number, Asset>
  totalMarketValue: number
  totalPnL:         number
  canManage:        boolean
  onEdit:           (h: Holding) => void
  onDelete:         (h: Holding) => void
}) {
  const t = useT()

  if (accountHoldings.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-sm text-muted-foreground">{t('investments.noHoldings')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('investments.noHoldingsDesc')}</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden divide-y">
        {accountHoldings.map(h => {
          const asset     = assetMap[h.assetId]
          const marketVal = h.quantity * (asset?.currentPrice ?? 0)
          const costBasis = h.quantity * h.avgCost
          const pnl       = marketVal - costBasis
          const pnlPctH   = costBasis > 0 ? (pnl / costBasis) * 100 : 0
          return (
            <div key={h.id} className="px-4 py-3 hover:bg-accent/20 transition-colors flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{asset?.name ?? '—'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {asset?.ticker && <span className="uppercase mr-1.5">{asset.ticker}</span>}
                  {fmtQty(h.quantity)} × {formatMoney(h.avgCost, account.currency)}
                </p>
                {h.date && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{h.date}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold tabular-nums text-sm">{formatMoney(marketVal, account.currency)}</p>
                <p className={`text-xs tabular-nums ${pnlCls(pnl)}`}>
                  {sign(pnl)}{formatMoney(pnl, account.currency)} ({sign(pnlPctH)}{pnlPctH.toFixed(1)}%)
                </p>
              </div>
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" className={cx.iconBtn} onClick={() => onEdit(h)}><Pencil className="h-3.5 w-3.5" /></button>
                  <button type="button" className={cx.deleteBtn} onClick={() => onDelete(h)}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
          )
        })}
        {accountHoldings.length > 1 && (
          <div className="px-4 py-2.5 bg-muted/20 flex items-center justify-between text-sm font-semibold border-t">
            <span className="text-muted-foreground">Total</span>
            <div className="text-right">
              <span className="tabular-nums">{formatMoney(totalMarketValue, account.currency)}</span>
              <span className={`ml-2 tabular-nums text-xs ${pnlCls(totalPnL)}`}>
                {sign(totalPnL)}{formatMoney(totalPnL, account.currency)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Desktop */}
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
              const asset     = assetMap[h.assetId]
              const marketVal = h.quantity * (asset?.currentPrice ?? 0)
              const costBasis = h.quantity * h.avgCost
              const pnl       = marketVal - costBasis
              const pnlPctH   = costBasis > 0 ? (pnl / costBasis) * 100 : 0
              return (
                <tr key={h.id} className="border-b last:border-0 hover:bg-accent/20 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium">{asset?.name ?? '—'}</p>
                    {asset?.ticker && <p className="text-xs text-muted-foreground uppercase">{asset.ticker}</p>}
                    {h.date && <p className="text-xs text-muted-foreground/70">{h.date}</p>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtQty(h.quantity)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatMoney(h.avgCost, account.currency)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{formatMoney(marketVal, account.currency)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={`font-medium ${pnlCls(pnl)}`}>{sign(pnl)}{formatMoney(pnl, account.currency)}</span>
                    <br />
                    <span className={`text-xs ${pnlCls(pnl)}`}>{sign(pnlPctH)}{pnlPctH.toFixed(1)}%</span>
                  </td>
                  <td className="px-4 py-3">
                    {canManage && (
                      <div className="flex items-center gap-1 justify-end">
                        <button type="button" className={cx.iconBtn} onClick={() => onEdit(h)}><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" className={cx.deleteBtn} onClick={() => onDelete(h)}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
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
                  <span className={pnlCls(totalPnL)}>{sign(totalPnL)}{formatMoney(totalPnL, account.currency)}</span>
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  )
}

// ── InvestmentAccountCard ─────────────────────────────────────────────────────

export default function InvestmentAccountCard({
  account, accountHoldings, assetMap, capitalAmount,
  isOpen, canAddHolding, canManageHoldings, hideToggle,
  onToggle, onAddHolding, onEditHolding, onDeleteHolding, onEditAccount, onImport,
}: Props) {
  const t = useT()

  const capitalTxs       = capitalAmount !== 0
    ? [{ accountId: account.id, amount: capitalAmount, category: 'capital' } as unknown as Transaction]
    : []
  const totalMarketValue = computeMarketValue(accountHoldings, assetMap)
  const totalCostBasis   = accountHoldings.reduce((sum, h) => sum + h.quantity * h.avgCost, 0)
  const adjCostBasis     = totalCostBasis + (account.entryFee ?? 0) * accountHoldings.length
  const totalPnL         = totalMarketValue - adjCostBasis
  const pnlPct           = adjCostBasis > 0 ? (totalPnL / adjCostBasis) * 100 : 0
  const portfolioBalance = computeInvestmentBalance(account, accountHoldings, assetMap, capitalTxs)
  const bank             = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined

  const stats: HeaderStats = {
    portfolioBalance,
    totalMarketValue,
    investedBase:  (account.investedBase ?? 0) + capitalAmount,
    totalPnL,
    pnlPct,
    hasHoldings: accountHoldings.length > 0,
  }

  return (
    <div className="space-y-2">
      {canManageHoldings && (
        <div className="flex items-center justify-end gap-2">
          {onImport && (
            <Button size="sm" variant="outline" onClick={onImport}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Import CSV
            </Button>
          )}
          <Button size="sm" disabled={!canAddHolding} onClick={onAddHolding}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {t('investments.addHolding')}
          </Button>
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <AccountHeader account={account} bank={bank} isOpen={isOpen} hideToggle={hideToggle} stats={stats}
          onToggle={onToggle} onEditAccount={onEditAccount} />
        <MobileStats account={account} stats={stats} />

        {isOpen && (
          <div className="border-t">
            <HoldingsList
              account={account}
              accountHoldings={accountHoldings}
              assetMap={assetMap}
              totalMarketValue={totalMarketValue}
              totalPnL={totalPnL}
              canManage={canManageHoldings}
              onEdit={onEditHolding}
              onDelete={onDeleteHolding}
            />
          </div>
        )}
      </div>
    </div>
  )
}
