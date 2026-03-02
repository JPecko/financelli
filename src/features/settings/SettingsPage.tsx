import { useRef, useState } from 'react'
import {
  Download, Upload, Trash2, FileText, Database,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { db } from '@/data/db'
import { transactionsToCSV, downloadFile, exportFilename } from '@/shared/utils/csv'

export default function SettingsPage() {
  const importRef  = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)

  const showStatus = (msg: string) => {
    setStatus(msg)
    setTimeout(() => setStatus(null), 3000)
  }

  /* ---- Export JSON ---- */
  const handleExportJSON = async () => {
    const [accounts, transactions, recurringRules] = await Promise.all([
      db.accounts.toArray(),
      db.transactions.toArray(),
      db.recurringRules.toArray(),
    ])
    const payload = { exportedAt: new Date().toISOString(), accounts, transactions, recurringRules }
    downloadFile(
      JSON.stringify(payload, null, 2),
      exportFilename('finance-backup', 'json'),
      'application/json',
    )
    showStatus('JSON backup exported successfully.')
  }

  /* ---- Import JSON ---- */
  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.accounts || !data.transactions) {
        throw new Error('Invalid backup file format.')
      }
      await db.transaction('rw', db.accounts, db.transactions, db.recurringRules, async () => {
        await db.accounts.clear()
        await db.transactions.clear()
        await db.recurringRules.clear()
        await db.accounts.bulkAdd(data.accounts)
        await db.transactions.bulkAdd(data.transactions)
        if (data.recurringRules) await db.recurringRules.bulkAdd(data.recurringRules)
      })
      showStatus('Data imported successfully.')
    } catch (err) {
      showStatus(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      e.target.value = ''
    }
  }

  /* ---- Export CSV ---- */
  const handleExportCSV = async () => {
    const transactions = await db.transactions.orderBy('date').toArray()
    const csv = transactionsToCSV(transactions)
    downloadFile(csv, exportFilename('transactions', 'csv'), 'text/csv')
    showStatus('CSV exported successfully.')
  }

  /* ---- Clear all data ---- */
  const handleClearData = async () => {
    if (!confirm('This will delete ALL your data permanently. Are you sure?')) return
    if (!confirm('This action cannot be undone. Confirm again to proceed.')) return
    await db.transaction('rw', db.accounts, db.transactions, db.recurringRules, db.settings, async () => {
      await db.accounts.clear()
      await db.transactions.clear()
      await db.recurringRules.clear()
    })
    showStatus('All data cleared.')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your data, backups, and preferences
        </p>
      </div>

      {status && (
        <div className="rounded-md bg-muted px-4 py-3 text-sm">
          {status}
        </div>
      )}

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Backup & Restore
          </CardTitle>
          <CardDescription>
            Export a full backup of your data or restore from a previous backup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Export JSON Backup</p>
              <p className="text-xs text-muted-foreground">All accounts, transactions and rules</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Import JSON Backup</p>
              <p className="text-xs text-muted-foreground">This will replace all existing data</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportJSON}
            />
          </div>
        </CardContent>
      </Card>

      {/* CSV Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            CSV Export
          </CardTitle>
          <CardDescription>
            Export your transactions as CSV to open in Excel or Google Sheets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Export Transactions (CSV)</p>
              <p className="text-xs text-muted-foreground">Compatible with Excel, Google Sheets</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            These actions are permanent and cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Clear All Data</p>
              <p className="text-xs text-muted-foreground">Delete all accounts, transactions and rules</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleClearData}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
