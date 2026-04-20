import { useRef, useState } from 'react'
import {
  Download, Upload, Trash2, FileText, Database, LogOut, User, KeyRound,
  Sun, Moon, Monitor, Wrench,
} from 'lucide-react'
import { useThemeStore } from '@/shared/store/themeStore'
import { useT } from '@/shared/i18n'
import LanguageSelect from '@/shared/components/LanguageSelect'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Separator } from '@/shared/components/ui/separator'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import { supabase } from '@/data/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { accountsRepo } from '@/data/repositories/accountsRepo'
import { transactionsRepo } from '@/data/repositories/transactionsRepo'
import { recurringRepo } from '@/data/repositories/recurringRepo'
import { queryClient } from '@/app/queryClient'
import { transactionsToCSV, downloadFile, exportFilename } from '@/shared/utils/csv'

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useThemeStore()
  const { data: accounts } = useAccounts()
  const hasRoundupAccounts = accounts?.some(a => !!a.roundupMultiplier) ?? false
  const t = useT()
  const importRef  = useRef<HTMLInputElement>(null)
  const [status, setStatus]               = useState<string | null>(null)
  const [recalcingRoundups, setRecalcingRoundups]     = useState(false)
  const [confirmRecalcOpen, setConfirmRecalcOpen]     = useState(false)
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
    else showStatus(t('settings.nameUpdated'))
  }

  /* ---- Change password ---- */
  const handleChangePassword = async () => {
    setPwError(null)
    if (newPw.length < 6) { setPwError(t('settings.passwordTooShort')); return }
    if (newPw !== confirmPw) { setPwError(t('settings.passwordMismatch')); return }
    setChangingPw(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setChangingPw(false)
    if (error) setPwError(error.message)
    else { showStatus(t('settings.passwordChanged')); setNewPw(''); setConfirmPw('') }
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
    showStatus(t('settings.exportedJson'))
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
      showStatus(t('settings.dataImported'))
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
    showStatus(t('settings.exportedCsv'))
  }

  /* ---- Clear all data ---- */
  const handleClearData = async () => {
    if (!confirm('This will delete ALL your data permanently. Are you sure?')) return
    if (!confirm('This action cannot be undone. Confirm again to proceed.')) return
    await supabase.from('recurring_rules').delete().neq('id', 0)
    await supabase.from('transactions').delete().neq('id', 0)
    await supabase.from('accounts').delete().neq('id', 0)
    queryClient.invalidateQueries()
    showStatus(t('settings.dataCleared'))
  }

  /* ---- Recalculate roundups ---- */
  const handleRecalcRoundups = async () => {
    setRecalcingRoundups(true)
    setConfirmRecalcOpen(false)
    try {
      const { removed, created } = await transactionsRepo.recalculateAllRoundups()
      queryClient.invalidateQueries()
      showStatus(t('settings.recalcRoundupsDone', { removed: String(removed), created: String(created) }))
    } catch (err) {
      showStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setRecalcingRoundups(false)
    }
  }

  /* ---- Logout ---- */
  const handleLogout = () => supabase.auth.signOut()

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('settings.subtitle')}</p>
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
            {t('settings.profile')}
          </CardTitle>
          <CardDescription>{t('settings.profileDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">{t('settings.displayName')}</Label>
            <div className="flex gap-2">
              <Input
                id="display-name"
                placeholder={t('settings.displayNamePlaceholder')}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              />
              <Button variant="outline" size="sm" loading={savingName} onClick={handleSaveName}>
                {t('common.save')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>

          <Separator />

          <form
            className="space-y-3"
            onSubmit={e => { e.preventDefault(); void handleChangePassword() }}
          >
            <input type="text" autoComplete="username" className="hidden" readOnly />
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">{t('settings.changePassword')}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">{t('settings.newPassword')}</Label>
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
              <Label htmlFor="confirm-password">{t('settings.confirmPassword')}</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirmPw}
                onChange={e => { setConfirmPw(e.target.value); setPwError(null) }}
              />
            </div>
            {pwError && <p className="text-xs text-destructive">{pwError}</p>}
            <Button
              type="submit"
              variant="outline"
              size="sm"
              loading={changingPw}
              disabled={!newPw || !confirmPw}
            >
              {t('settings.changePasswordBtn')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4" />
            {t('settings.preferences')}
          </CardTitle>
          <CardDescription>{t('settings.preferencesDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">{t('settings.theme')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.themeDesc')}</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${theme === 'light' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Sun className="h-3.5 w-3.5" /> {t('settings.themeLight')}
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${theme === 'dark' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Moon className="h-3.5 w-3.5" /> {t('settings.themeDark')}
              </button>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">{t('settings.language')}</p>
            </div>
            <LanguageSelect size="default" />
          </div>
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            {t('settings.backup')}
          </CardTitle>
          <CardDescription>{t('settings.backupDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">{t('settings.exportJson')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.exportJsonDesc')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">{t('settings.importJson')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.importJsonDesc')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              {t('common.import')}
            </Button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
          </div>
        </CardContent>
      </Card>

      {/* CSV Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {t('settings.csvExport')}
          </CardTitle>
          <CardDescription>{t('settings.csvExportDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">{t('settings.exportCsv')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.exportCsvDesc')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              {t('settings.exportCsvBtn')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4" />
            {t('settings.maintenance')}
          </CardTitle>
          <CardDescription>{t('settings.maintenanceDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">{t('settings.recalcRoundups')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.recalcRoundupsDesc')}</p>
            </div>
            <Button variant="outline" size="sm" loading={recalcingRoundups} disabled={!hasRoundupAccounts} onClick={() => setConfirmRecalcOpen(true)}>
              <Wrench className="h-4 w-4 mr-2" />
              {t('settings.recalcRoundupsBtn')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LogOut className="h-4 w-4" />
            {t('settings.account')}
          </CardTitle>
          <CardDescription>{t('settings.accountDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">{t('settings.signOut')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.signOutDesc')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('settings.signOut')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="h-4 w-4" />
            {t('settings.dangerZone')}
          </CardTitle>
          <CardDescription>{t('settings.dangerZoneDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">{t('settings.clearData')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.clearDataDesc')}</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleClearData}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t('settings.clearDataBtn')}
            </Button>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmRecalcOpen}
        title={t('settings.recalcRoundups')}
        description={t('settings.recalcRoundupsConfirm')}
        onConfirm={handleRecalcRoundups}
        onCancel={() => setConfirmRecalcOpen(false)}
      />
    </div>
  )
}
