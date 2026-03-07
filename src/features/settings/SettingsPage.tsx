import { useRef, useState } from 'react'
import {
  Download, Upload, Trash2, FileText, Database, LogOut, User, KeyRound,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Separator } from '@/shared/components/ui/separator'
import { supabase } from '@/data/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { accountsRepo } from '@/data/repositories/accountsRepo'
import { transactionsRepo } from '@/data/repositories/transactionsRepo'
import { recurringRepo } from '@/data/repositories/recurringRepo'
import { queryClient } from '@/app/queryClient'
import { transactionsToCSV, downloadFile, exportFilename } from '@/shared/utils/csv'

export default function SettingsPage() {
  const { user } = useAuth()
  const importRef  = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name ?? '')
  const [savingName, setSavingName]   = useState(false)
  const [newPw, setNewPw]             = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [pwError, setPwError]         = useState<string | null>(null)
  const [changingPw, setChangingPw]   = useState(false)

  const showStatus = (msg: string) => {
    setStatus(msg)
    setTimeout(() => setStatus(null), 3000)
  }

  /* ---- Update display name ---- */
  const handleSaveName = async () => {
    setSavingName(true)
    const { error } = await supabase.auth.updateUser({ data: { full_name: displayName.trim() } })
    setSavingName(false)
    if (error) showStatus(`Error: ${error.message}`)
    else showStatus('Name updated successfully.')
  }

  /* ---- Change password ---- */
  const handleChangePassword = async () => {
    setPwError(null)
    if (newPw.length < 6) { setPwError('At least 6 characters required'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
    setChangingPw(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setChangingPw(false)
    if (error) setPwError(error.message)
    else { showStatus('Password changed successfully.'); setNewPw(''); setConfirmPw('') }
  }

  /* ---- Export JSON ---- */
  const handleExportJSON = async () => {
    const [accounts, transactions, recurringRules] = await Promise.all([
      accountsRepo.getAll(),
      transactionsRepo.getAll(),
      recurringRepo.getAll(),
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

      // Clear existing data (RLS ensures only current user's rows are deleted)
      await supabase.from('recurring_rules').delete().neq('id', 0)
      await supabase.from('transactions').delete().neq('id', 0)
      await supabase.from('accounts').delete().neq('id', 0)

      // Insert accounts, build old-id → new-id map to preserve relationships
      const idMap: Record<number, number> = {}
      for (const acc of data.accounts) {
        const { data: inserted } = await supabase
          .from('accounts')
          .insert({
            name: acc.name, type: acc.type, balance: acc.balance,
            currency: acc.currency, color: acc.color,
          })
          .select('id')
          .single()
        if (inserted && acc.id != null) idMap[acc.id] = (inserted as { id: number }).id
      }

      // Insert transactions with remapped account IDs
      for (const tx of data.transactions) {
        await supabase.from('transactions').insert({
          account_id:        idMap[tx.accountId]   ?? tx.accountId,
          to_account_id:     tx.toAccountId != null ? (idMap[tx.toAccountId] ?? tx.toAccountId) : null,
          amount:            tx.amount,
          type:              tx.type,
          category:          tx.category,
          description:       tx.description,
          date:              tx.date,
          recurring_rule_id: tx.recurringRuleId ?? null,
        })
      }

      // Insert recurring rules with remapped account IDs
      if (data.recurringRules) {
        for (const rule of data.recurringRules) {
          await supabase.from('recurring_rules').insert({
            account_id:  idMap[rule.accountId] ?? rule.accountId,
            name:        rule.name,
            amount:      rule.amount,
            type:        rule.type,
            category:    rule.category,
            description: rule.description,
            frequency:   rule.frequency,
            start_date:  rule.startDate,
            next_due:    rule.nextDue,
            end_date:    rule.endDate ?? null,
            active:      rule.active,
          })
        }
      }

      queryClient.invalidateQueries()
      showStatus('Data imported successfully.')
    } catch (err) {
      showStatus(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      e.target.value = ''
    }
  }

  /* ---- Export CSV ---- */
  const handleExportCSV = async () => {
    const transactions = await transactionsRepo.getAll()
    const csv = transactionsToCSV(transactions)
    downloadFile(csv, exportFilename('transactions', 'csv'), 'text/csv')
    showStatus('CSV exported successfully.')
  }

  /* ---- Clear all data ---- */
  const handleClearData = async () => {
    if (!confirm('This will delete ALL your data permanently. Are you sure?')) return
    if (!confirm('This action cannot be undone. Confirm again to proceed.')) return
    await supabase.from('recurring_rules').delete().neq('id', 0)
    await supabase.from('transactions').delete().neq('id', 0)
    await supabase.from('accounts').delete().neq('id', 0)
    queryClient.invalidateQueries()
    showStatus('All data cleared.')
  }

  /* ---- Logout ---- */
  const handleLogout = () => supabase.auth.signOut()

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

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
          <CardDescription>
            Your display name is shown in the sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Display Name</Label>
            <div className="flex gap-2">
              <Input
                id="display-name"
                placeholder="Your name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              />
              <Button
                variant="outline"
                size="sm"
                loading={savingName}
                onClick={handleSaveName}
              >
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>

          <Separator />

          {/* Change password */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Change Password</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={newPw}
                onChange={e => { setNewPw(e.target.value); setPwError(null) }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirmPw}
                onChange={e => { setConfirmPw(e.target.value); setPwError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
              />
            </div>
            {pwError && <p className="text-xs text-destructive">{pwError}</p>}
            <Button
              variant="outline"
              size="sm"
              loading={changingPw}
              disabled={!newPw || !confirmPw}
              onClick={handleChangePassword}
            >
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

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

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LogOut className="h-4 w-4" />
            Account
          </CardTitle>
          <CardDescription>
            Sign out of your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Sign Out</p>
              <p className="text-xs text-muted-foreground">You will be redirected to the login page</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
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
