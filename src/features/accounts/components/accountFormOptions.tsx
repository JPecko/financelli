import type { ElementType } from 'react'
import { Wallet, Banknote, PiggyBank, BarChart2, HandCoins, CreditCard, Building2, UtensilsCrossed } from 'lucide-react'
import BankLogo from '@/shared/components/BankLogo'
import { BANK_OPTIONS } from '@/shared/config/banks'
import type { PlainSelectOption } from '@/shared/components/PlainSelect'
import type { AccountType } from '@/domain/types'

const TYPE_ICONS: Record<string, ElementType> = {
  checking:   Banknote,
  savings:    PiggyBank,
  investment: BarChart2,
  cash:       HandCoins,
  credit:     CreditCard,
  meal:       UtensilsCrossed,
}

function BankOptionContent({ logoDomain, name }: { logoDomain: string; name: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <BankLogo
        domain={logoDomain}
        name={name}
        accountType="checking"
        imgClassName="h-4 w-4 rounded-sm object-contain shrink-0"
        iconClassName="h-4 w-4 shrink-0 text-muted-foreground"
      />
      <span>{name}</span>
    </span>
  )
}

function NoBankContent({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}

function TypeOptionContent({ type, label }: { type: string; label: string }) {
  const Icon = TYPE_ICONS[type] ?? Wallet
  return (
    <span className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span>{label}</span>
    </span>
  )
}

export function buildBankSelectOptions(noBankLabel: string): PlainSelectOption[] {
  const noBankContent = <NoBankContent label={noBankLabel} />
  return [
    { value: 'none', label: noBankLabel, content: noBankContent, selectedContent: noBankContent },
    ...BANK_OPTIONS.map(bank => {
      const content = <BankOptionContent logoDomain={bank.logoDomain} name={bank.name} />
      return { value: bank.code, label: bank.name, content, selectedContent: content }
    }),
  ]
}

export function buildAccountTypeSelectOptions(
  types: { value: AccountType; label: string }[],
): PlainSelectOption[] {
  return types.map(({ value, label }) => {
    const content = <TypeOptionContent type={value} label={label} />
    return { value, label, content, selectedContent: content }
  })
}
