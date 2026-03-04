import { useState } from 'react'
import { Plus, Pencil, Trash2, Wallet, BarChart2, Users } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useAccounts, removeAccount } from '@/shared/hooks/useAccounts'
import { useAuth } from '@/features/auth/AuthContext'
import { formatMoney } from '@/domain/money'
import EmptyState from '@/shared/components/EmptyState'
import AccountFormModal from '../components/AccountFormModal'
import RevalueModal from '../components/RevalueModal'
import ShareAccountModal from '../components/ShareAccountModal'
import type { Account } from '@/domain/types'

const TYPE_LABELS: Record<string, string> = {
  checking:   'Checking',
  savings:    'Savings',
  investment: 'Investment',
  cash:       'Cash',
  credit:     'Credit Card',
}

export default function AccountsPage() {
  const accounts = useAccounts()
  const { user } = useAuth()
  const [modalOpen, setModalOpen]     = useState(false)
  const [editing, setEditing]         = useState<Account | undefined>()
  const [revaluing, setRevaluing]     = useState<Account | undefined>()
  const [sharing, setSharing]         = useState<Account | undefined>()

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)

  const handleEdit = (account: Account) => {
    setEditing(account)
    setModalOpen(true)
  }

  const handleCloseForm = () => {
    setModalOpen(false)
    setEditing(undefined)
  }

  const handleDelete = async (id: number | undefined) => {
    if (id == null) return
    if (confirm('Delete this account? All associated transactions will remain.')) {
      await removeAccount(id)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Total balance: <span className="font-semibold text-foreground">{formatMoney(totalBalance)}</span>
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* List */}
      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Add your bank accounts, savings, or cash wallets to start tracking your finances."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add your first account
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map(account => {
            const isInvestment = account.type === 'investment'
            return (
              <Card key={account.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Color strip */}
                  <div className="h-1.5 w-full" style={{ backgroundColor: account.color }} />
                  <div className="flex items-start justify-between p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${account.color}20` }}
                      >
                        {isInvestment
                          ? <BarChart2 className="h-5 w-5" style={{ color: account.color }} />
                          : <Wallet    className="h-5 w-5" style={{ color: account.color }} />
                        }
                      </div>
                      <div>
                        <p className="font-semibold leading-tight">{account.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {TYPE_LABELS[account.type] ?? account.type}
                          </Badge>
                          {(account.participants ?? 1) > 1 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-xs gap-1 cursor-default">
                                  <Users className="h-3 w-3" />
                                  {account.participants}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <div className="space-y-0.5">
                                  <p>
                                    {account.ownerId === user?.id
                                      ? (user?.user_metadata?.full_name ?? user?.email)
                                      : (account.ownerFullName ?? account.ownerEmail ?? 'Owner')
                                    }
                                    {' '}<span className="opacity-60">(owner)</span>
                                  </p>
                                  {account.sharedWith?.map(s => (
                                    <p key={s.userId}>{s.fullName ?? s.email}</p>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${
                            account.balance >= 0 ? 'text-foreground' : 'text-destructive'
                          }`}
                        >
                          {formatMoney(account.balance, account.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">{account.currency}</p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 ml-1">
                            <span className="sr-only">Actions</span>
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="5"  r="1.5" />
                              <circle cx="12" cy="12" r="1.5" />
                              <circle cx="12" cy="19" r="1.5" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isInvestment && (
                            <>
                              <DropdownMenuItem onClick={() => setRevaluing(account)}>
                                <BarChart2 className="h-4 w-4 mr-2" /> Update Market Value
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => setSharing(account)}>
                            <Users className="h-4 w-4 mr-2" /> Share
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(account)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(account.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AccountFormModal open={modalOpen} onClose={handleCloseForm} account={editing} />

      {sharing && (
        <ShareAccountModal
          open={!!sharing}
          onClose={() => setSharing(undefined)}
          account={sharing}
        />
      )}

      {revaluing && (
        <RevalueModal
          open={!!revaluing}
          onClose={() => setRevaluing(undefined)}
          account={revaluing}
        />
      )}
    </div>
  )
}
