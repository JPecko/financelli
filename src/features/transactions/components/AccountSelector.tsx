import { ArrowRight } from 'lucide-react'
import { Label } from '@/shared/components/ui/label'
import type { Account, TransactionType } from '@/domain/types'
import PlainSelect from '@/shared/components/PlainSelect'
import { buildGroupedAccountSelectOptions, buildExternalAccountOption } from './accountSelectOptions'
import { EXTERNAL } from './useTransactionForm'
import { useT } from '@/shared/i18n'

interface Props {
  type:           TransactionType
  accounts:       Account[]
  fromId:         string
  toId:           string
  onFromChange:   (id: string) => void
  onToChange:     (id: string) => void
  accountOptions: (exclude?: string) => Account[]
}

function ensureSelectedAccount(accounts: Account[], selectedValue: string, allAccounts: Account[]) {
  if (!selectedValue || selectedValue === EXTERNAL) return accounts
  if (accounts.some(account => String(account.id) === selectedValue)) return accounts

  const selectedAccount = allAccounts.find(account => String(account.id) === selectedValue)
  return selectedAccount ? [selectedAccount, ...accounts] : accounts
}

function AccountSelect({
  label, value, onChange, accounts, allAccounts, withExternal,
}: {
  label:        string
  value:        string
  onChange:     (id: string) => void
  accounts:     Account[]
  allAccounts:  Account[]
  withExternal: boolean
}) {
  const t = useT()
  const visibleAccounts = ensureSelectedAccount(accounts, value, allAccounts)
  const options = [
    ...(withExternal ? [buildExternalAccountOption()] : []),
    ...buildGroupedAccountSelectOptions(visibleAccounts, t),
  ]

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <PlainSelect value={value} onChange={onChange} options={options} placeholder="Select" />
    </div>
  )
}

export default function AccountSelector({
  type, accounts, fromId, toId, onFromChange, onToChange, accountOptions,
}: Props) {
  if (type !== 'transfer') {
    const isIncome = type === 'income'

    return (
      <AccountSelect
        label="Account"
        value={isIncome ? toId : fromId}
        onChange={isIncome ? onToChange : onFromChange}
        accounts={accountOptions()}
        allAccounts={accounts}
        withExternal={false}
      />
    )
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-2">
        <AccountSelect
          label="From account"
          value={fromId}
          onChange={onFromChange}
          accounts={accountOptions(toId)}
          allAccounts={accounts}
          withExternal
        />
        <div className="hidden sm:flex h-9 items-center justify-center">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <AccountSelect
          label="To account"
          value={toId}
          onChange={onToChange}
          accounts={accountOptions(fromId)}
          allAccounts={accounts}
          withExternal
        />
      </div>

      {fromId === EXTERNAL && toId === EXTERNAL && (
        <p className="text-xs text-destructive">Select at least one portfolio account</p>
      )}
    </div>
  )
}
