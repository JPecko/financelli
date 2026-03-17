import { ArrowRight, Wallet, Banknote, PiggyBank, BarChart2, HandCoins, CreditCard } from 'lucide-react'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import BankLogo from '@/shared/components/BankLogo'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { EXTERNAL } from './useTransactionForm'
import type { Account } from '@/domain/types'

const TYPE_ICONS: Record<string, React.ElementType> = {
  checking:   Banknote,
  savings:    PiggyBank,
  investment: BarChart2,
  cash:       HandCoins,
  credit:     CreditCard,
}

function AccountOption({ account }: { account: Account }) {
  const bank = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
  const Icon = TYPE_ICONS[account.type] ?? Wallet
  return (
    <span className="flex items-center gap-2">
      {bank
        ? <BankLogo domain={bank.logoDomain} name={bank.name} accountType={account.type} imgClassName="h-4 w-4 rounded-sm object-contain shrink-0" iconClassName="h-4 w-4 shrink-0 text-muted-foreground" />
        : <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      }
      {account.name}
    </span>
  )
}

interface Props {
  isTransfer:     boolean
  fromId:         string
  toId:           string
  onFromChange:   (id: string) => void
  onToChange:     (id: string) => void
  accountOptions: (exclude?: string) => Account[]
}

function AccountSelect({
  label, value, onChange, accounts, withExternal,
}: {
  label:        string
  value:        string
  onChange:     (id: string) => void
  accounts:     Account[]
  withExternal: boolean
}) {
  const selectedAccount = accounts.find(a => String(a.id) === value)

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          {selectedAccount ? (
            <AccountOption account={selectedAccount} />
          ) : value === EXTERNAL ? (
            <span className="italic text-muted-foreground">External</span>
          ) : (
            <SelectValue placeholder="Select" />
          )}
        </SelectTrigger>
        <SelectContent>
          {withExternal && (
            <SelectItem value={EXTERNAL}>
              <span className="italic text-muted-foreground">External</span>
            </SelectItem>
          )}
          {accounts.map(a => (
            <SelectItem key={a.id} value={String(a.id)}>
              <AccountOption account={a} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default function AccountSelector({
  isTransfer, fromId, toId, onFromChange, onToChange, accountOptions,
}: Props) {
  if (!isTransfer) {
    return (
      <AccountSelect
        label="Account"
        value={fromId}
        onChange={onFromChange}
        accounts={accountOptions()}
        withExternal={false}
      />
    )
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-2">
        <AccountSelect
          label="From"
          value={fromId}
          onChange={onFromChange}
          accounts={accountOptions(toId)}
          withExternal
        />
        <div className="hidden sm:flex h-9 items-center justify-center">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <AccountSelect
          label="To"
          value={toId}
          onChange={onToChange}
          accounts={accountOptions(fromId)}
          withExternal
        />
      </div>

      {fromId === EXTERNAL && toId === EXTERNAL && (
        <p className="text-xs text-destructive">Select at least one portfolio account</p>
      )}
    </div>
  )
}
