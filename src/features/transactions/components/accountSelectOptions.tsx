import type { ElementType } from 'react'
import { Wallet, Banknote, PiggyBank, BarChart2, HandCoins, CreditCard } from 'lucide-react'
import BankLogo from '@/shared/components/BankLogo'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { accountGroup, firstOfGroupIds, type AccountGroup } from '@/domain/accountGrouping'
import { EXTERNAL } from './useTransactionForm'
import type { Account } from '@/domain/types'
import type { PlainSelectOption } from '@/shared/components/PlainSelect'
import type { useT } from '@/shared/i18n'

const TYPE_ICONS: Record<string, ElementType> = {
  checking: Banknote,
  savings: PiggyBank,
  investment: BarChart2,
  cash: HandCoins,
  credit: CreditCard,
}

function AccountVisual({ account }: { account: Account }) {
  const bank = account.bankCode ? BANK_OPTIONS.find(option => option.code === account.bankCode) : undefined
  const Icon = TYPE_ICONS[account.type] ?? Wallet

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {bank ? (
        <BankLogo
          domain={bank.logoDomain}
          name={bank.name}
          accountType={account.type}
          imgClassName="h-4 w-4 rounded-sm object-contain shrink-0"
          iconClassName="h-4 w-4 shrink-0 text-muted-foreground"
        />
      ) : (
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate">{account.name}</span>
    </span>
  )
}

export function buildAccountSelectOption(account: Account, groupLabel?: string): PlainSelectOption {
  return {
    value: String(account.id),
    label: account.name,
    content: <AccountVisual account={account} />,
    selectedContent: <AccountVisual account={account} />,
    groupLabel,
  }
}

const GROUP_LABEL_KEYS: Record<AccountGroup, Parameters<ReturnType<typeof useT>>[0]> = {
  current:    'accounts.sections.current',
  savings:    'accounts.sections.savings',
  investment: 'accounts.sections.investment',
}

/**
 * Builds account options grouped current/savings/investment (matches the Accounts page order),
 * with a section heading + divider before the first option of each group. `accounts` must
 * already come from `useSortedAccounts` so the order within each group is correct.
 */
export function buildGroupedAccountSelectOptions(accounts: Account[], t: ReturnType<typeof useT>): PlainSelectOption[] {
  const firstIds = firstOfGroupIds(accounts)
  return accounts.map(account => {
    const groupLabel = firstIds.has(account.id!) ? t(GROUP_LABEL_KEYS[accountGroup(account.type)]) : undefined
    return buildAccountSelectOption(account, groupLabel)
  })
}

export function buildExternalAccountOption(): PlainSelectOption {
  return {
    value: EXTERNAL,
    label: 'External',
    content: <span className="italic text-muted-foreground">External</span>,
    selectedContent: <span className="italic text-muted-foreground">External</span>,
  }
}
