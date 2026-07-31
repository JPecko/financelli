import type { Account, Asset, Holding, Transaction } from '@/domain/types'

export function effectOnInvestmentAccount(tx: Pick<Transaction, 'accountId' | 'toAccountId' | 'amount'>, accountId: number) {
  if (tx.accountId === accountId) return tx.amount
  if (tx.toAccountId === accountId) return -tx.amount
  return 0
}

export function computeCapitalAdjustment(accountId: number, transactions: Transaction[]) {
  return transactions
    .filter(tx => tx.category === 'capital')
    .reduce((sum, tx) => sum + effectOnInvestmentAccount(tx, accountId), 0)
}

export function computeEffectiveInvestedBase(account: Account, transactions: Transaction[]) {
  return (account.investedBase ?? 0) + computeCapitalAdjustment(account.id!, transactions)
}

export function computeAdjustedCostBasis(account: Account, holdings: Holding[]) {
  const costBasis = holdings.reduce((sum, holding) => sum + holding.quantity * holding.avgCost, 0)
  const totalFees = (account.entryFee ?? 0) * holdings.length
  return costBasis + totalFees
}

export function computeMarketValue(holdings: Holding[], assetMap: Record<number, Asset>) {
  return holdings.reduce((sum, holding) => (
    sum + holding.quantity * (assetMap[holding.assetId]?.currentPrice ?? 0)
  ), 0)
}

/** Investment account "balance" — always the live market value of what's held; falls back to the stored balance when there are no holdings to price. */
export function computeAccountBalance(account: Account, holdings: Holding[], assetMap: Record<number, Asset>) {
  if (holdings.length === 0) return account.balance
  return computeMarketValue(holdings, assetMap)
}
