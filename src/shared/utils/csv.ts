import type { Transaction } from '@/domain/types'
import { fromCents } from '@/domain/money'
import { format } from 'date-fns'

/** Export transactions as a CSV string */
export function transactionsToCSV(transactions: Transaction[]): string {
  const header = 'Date,Description,Category,Type,Amount,AccountId'
  const rows = transactions.map(tx => {
    const amount = fromCents(tx.amount).toFixed(2)
    return [
      tx.date,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.category,
      tx.type,
      amount,
      tx.accountId,
    ].join(',')
  })
  return [header, ...rows].join('\n')
}

/** Trigger a file download in the browser */
export function downloadFile(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportFilename(prefix: string, ext: string): string {
  return `${prefix}-${format(new Date(), 'yyyy-MM-dd')}.${ext}`
}
