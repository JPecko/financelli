import { ArrowRight } from 'lucide-react'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { EXTERNAL } from './useTransactionForm'
import type { Account } from '@/domain/types'

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
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {withExternal && (
            <SelectItem value={EXTERNAL}>
              <span className="italic text-muted-foreground">External</span>
            </SelectItem>
          )}
          {accounts.map(a => (
            <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
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
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <AccountSelect
          label="From"
          value={fromId}
          onChange={onFromChange}
          accounts={accountOptions(toId)}
          withExternal
        />
        <div className="flex h-9 items-center justify-center">
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
