import { Wallet, Banknote, PiggyBank, BarChart2, HandCoins, CreditCard } from 'lucide-react'
import BankLogo from '@/shared/components/BankLogo'
import { BANK_OPTIONS } from '@/shared/config/banks'
import type { Account } from '@/domain/types'

const TYPE_ICONS: Record<string, React.ElementType> = {
  checking:   Banknote,
  savings:    PiggyBank,
  investment: BarChart2,
  cash:       HandCoins,
  credit:     CreditCard,
}

interface Props {
  accountId:    number
  accountsById: Record<number, Account>
}

export default function AccountPill({ accountId, accountsById }: Props) {
  const account = accountsById[accountId]
  const bank    = account?.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
  const Icon    = account ? (TYPE_ICONS[account.type] ?? Wallet) : null
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      {bank
        ? <BankLogo domain={bank.logoDomain} name={bank.name} accountType={account!.type} imgClassName="h-3.5 w-3.5 rounded-sm object-contain shrink-0" iconClassName="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
        : Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
      }
      <span className="truncate">{account?.name ?? '—'}</span>
    </span>
  )
}
