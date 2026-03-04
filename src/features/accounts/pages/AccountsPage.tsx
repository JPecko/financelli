import { useState, useEffect } from 'react'
import {
  Plus, Pencil, Trash2, Wallet, BarChart2, Users, GripVertical,
  ArrowUpDown, Check, ChevronUp, ChevronDown, Save, X,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/shared/components/ui/dropdown-menu'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

type SortKey = 'default' | 'name' | 'type' | 'color' | 'balance' | 'manual'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Creation order' },
  { value: 'name',    label: 'Name A→Z' },
  { value: 'type',    label: 'Type' },
  { value: 'color',   label: 'Color' },
  { value: 'balance', label: 'Balance ↓' },
  { value: 'manual',  label: 'Manual' },
]

function sortAccounts(
  accounts: Account[],
  sort: SortKey,
  manualOrder: number[],
  colorOrder: string[],
): Account[] {
  if (sort === 'manual' && manualOrder.length > 0) {
    const idx = Object.fromEntries(manualOrder.map((id, i) => [id, i]))
    return [...accounts].sort((a, b) => (idx[a.id!] ?? 999) - (idx[b.id!] ?? 999))
  }
  if (sort === 'name')    return [...accounts].sort((a, b) => a.name.localeCompare(b.name))
  if (sort === 'type')    return [...accounts].sort((a, b) => a.type.localeCompare(b.type))
  if (sort === 'color') {
    return [...accounts].sort((a, b) => {
      const ai = colorOrder.indexOf(a.color)
      const bi = colorOrder.indexOf(b.color)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
  }
  if (sort === 'balance') return [...accounts].sort((a, b) => b.balance - a.balance)
  return accounts
}

interface SortableCardProps {
  account: Account
  isManual: boolean
  children: React.ReactNode
}

function SortableCard({ account, isManual, children }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: account.id!,
    disabled: !isManual,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isManual && (
        <button
          {...attributes}
          {...listeners}
          className="absolute top-3 left-3 z-10 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5"
          tabIndex={-1}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  )
}

export default function AccountsPage() {
  const accounts = useAccounts()
  const { user } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Account | undefined>()
  const [revaluing, setRevaluing] = useState<Account | undefined>()
  const [sharing, setSharing]     = useState<Account | undefined>()

  const [sort, setSort] = useState<SortKey>(() =>
    (localStorage.getItem('accounts-sort') as SortKey) ?? 'default'
  )
  // True only while actively editing manual order (handles visible, not yet saved)
  const [isManualEditing, setIsManualEditing] = useState(false)

  // Committed manual order (only updated on Save)
  const [manualOrder, setManualOrder] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('accounts-manual-order') ?? '[]') } catch { return [] }
  })
  // Draft order: changes as you drag, only committed on Save
  const [draftOrder, setDraftOrder] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('accounts-manual-order') ?? '[]') } catch { return [] }
  })

  // Color order for 'color' sort
  const [colorOrder, setColorOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('accounts-color-order') ?? '[]') } catch { return [] }
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Sync manualOrder/draftOrder when accounts are added or removed
  useEffect(() => {
    if (accounts.length === 0) return
    const ids = accounts.map(a => a.id!)
    const merge = (prev: number[]) => [
      ...prev.filter(id => ids.includes(id)),
      ...ids.filter(id => !prev.includes(id)),
    ]
    setManualOrder(prev => {
      const next = merge(prev)
      localStorage.setItem('accounts-manual-order', JSON.stringify(next))
      return next
    })
    setDraftOrder(prev => merge(prev))
  }, [accounts.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync colorOrder with colors present in accounts
  useEffect(() => {
    if (accounts.length === 0) return
    const colors = [...new Set(accounts.map(a => a.color))]
    setColorOrder(prev => {
      const merged = [
        ...prev.filter(c => colors.includes(c)),
        ...colors.filter(c => !prev.includes(c)),
      ]
      localStorage.setItem('accounts-color-order', JSON.stringify(merged))
      return merged
    })
  }, [accounts]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSortChange = (value: SortKey) => {
    setSort(value)
    localStorage.setItem('accounts-sort', value)
    if (value === 'manual') {
      setDraftOrder(manualOrder.length > 0 ? [...manualOrder] : accounts.map(a => a.id!))
    }
    // Selecting any sort option (re)enters editing mode for manual, exits for others
    setIsManualEditing(value === 'manual')
  }

  const handleSaveManual = () => {
    setManualOrder(draftOrder)
    localStorage.setItem('accounts-manual-order', JSON.stringify(draftOrder))
    setIsManualEditing(false)
  }

  const handleCancelManual = () => {
    setDraftOrder([...manualOrder])
    setIsManualEditing(false)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isManualEditing) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    setDraftOrder(prev => {
      const oldIdx = prev.indexOf(active.id as number)
      const newIdx = prev.indexOf(over.id as number)
      return arrayMove(prev, oldIdx, newIdx)
    })
  }

  const moveColor = (i: number, dir: -1 | 1) => {
    setColorOrder(prev => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      localStorage.setItem('accounts-color-order', JSON.stringify(next))
      return next
    })
  }

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
  const sorted = sortAccounts(accounts, sort, sort === 'manual' ? draftOrder : [], colorOrder)
  const sortedIds = sorted.map(a => a.id!)

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
        <div className="flex items-center gap-2">

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {SORT_OPTIONS.map(opt => (
                <DropdownMenuItem key={opt.value} onClick={() => handleSortChange(opt.value)}>
                  <span className="w-5 shrink-0">
                    {sort === opt.value && <Check className="h-3.5 w-3.5" />}
                  </span>
                  {opt.label}
                </DropdownMenuItem>
              ))}

              {/* Color order section */}
              {sort === 'color' && colorOrder.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                    Color order
                  </DropdownMenuLabel>
                  {colorOrder.map((color, i) => (
                    <div key={color} className="flex items-center gap-2 px-2 py-1">
                      <span
                        className="h-4 w-4 rounded-full border border-border shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="flex-1 text-xs font-mono text-muted-foreground truncate">{color}</span>
                      <button
                        className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                        disabled={i === 0}
                        onClick={(e) => { e.stopPropagation(); moveColor(i, -1) }}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                        disabled={i === colorOrder.length - 1}
                        onClick={(e) => { e.stopPropagation(); moveColor(i, 1) }}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </>
              )}

            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Manual editing bar */}
      {isManualEditing && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-2.5 mb-4">
          <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <GripVertical className="h-4 w-4" />
            Drag cards to reorder
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={handleCancelManual}>
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={handleSaveManual}>
              <Save className="h-3.5 w-3.5" /> Save order
            </Button>
          </div>
        </div>
      )}

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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedIds} strategy={rectSortingStrategy}>
            <div className="grid gap-4 sm:grid-cols-2">
              {sorted.map(account => {
                const isInvestment = account.type === 'investment'
                return (
                  <SortableCard key={account.id} account={account} isManual={isManualEditing}>
                    <Card className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="h-1.5 w-full" style={{ backgroundColor: account.color }} />
                        <div className={`flex items-start justify-between p-5 ${isManualEditing ? 'pl-9' : ''}`}>
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
                              <p className={`text-lg font-bold ${account.balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
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
                  </SortableCard>
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
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
