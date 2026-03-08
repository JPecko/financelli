import { useState, useEffect, useRef } from 'react'
import {
  Plus, Pencil, Trash2, Wallet, BarChart2, Users, GripVertical,
  ArrowUpDown, Check, ChevronUp, ChevronDown, Save, X,
  Banknote, PiggyBank, HandCoins, CreditCard,
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
import { useAccounts, sortAccounts, removeAccount } from '@/shared/hooks/useAccounts'
import { useAccountPrefsStore, type SortKey } from '@/shared/store/accountPrefsStore'
import { BANK_OPTIONS, bankLogoUrl } from '@/shared/config/banks'
import { useAuth } from '@/features/auth/AuthContext'
import { formatMoney } from '@/domain/money'
import EmptyState from '@/shared/components/EmptyState'
import PageLoader from '@/shared/components/PageLoader'
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

const TYPE_ICONS: Record<string, React.ElementType> = {
  checking:   Banknote,
  savings:    PiggyBank,
  investment: BarChart2,
  cash:       HandCoins,
  credit:     CreditCard,
}

// Module-level blob cache: domain → blob URL or 'failed'
// Persists for the app lifetime — zero network requests after first load
const logoCache = new Map<string, string | 'failed'>()

function BankLogo({ domain, name, accountType, imgClassName, iconClassName }: {
  domain: string; name: string; accountType: string
  imgClassName?: string; iconClassName?: string
}) {
  const [src, setSrc] = useState<string | 'failed' | null>(() => logoCache.get(domain) ?? null)
  const Icon = TYPE_ICONS[accountType] ?? Wallet

  useEffect(() => {
    if (logoCache.has(domain)) return
    fetch(bankLogoUrl(domain))
      .then(res => { if (!res.ok) throw new Error('not ok'); return res.blob() })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob)
        logoCache.set(domain, blobUrl)
        setSrc(blobUrl)
      })
      .catch(() => {
        logoCache.set(domain, 'failed')
        setSrc('failed')
      })
  }, [domain])

  if (src === 'failed') return <Icon className={iconClassName ?? 'h-4 w-4 shrink-0 text-muted-foreground'} />
  if (!src) return <span className={imgClassName ? imgClassName.replace(/\S+/g, '') : 'h-4 w-4 shrink-0'} />
  return <img src={src} alt={name} className={imgClassName ?? 'h-4 w-4 rounded-sm object-contain shrink-0'} />
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Creation order' },
  { value: 'name',    label: 'Name A→Z' },
  { value: 'type',    label: 'Type' },
  { value: 'color',   label: 'Color' },
  { value: 'balance', label: 'Balance ↓' },
  { value: 'manual',  label: 'Manual' },
]

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
  const { data: accounts = [], isLoading } = useAccounts()
  const { user } = useAuth()
  const {
    sort, manualOrder, colorOrder, loaded,
    setSort, setManualOrder, setColorOrder,
  } = useAccountPrefsStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Account | undefined>()
  const [revaluing, setRevaluing] = useState<Account | undefined>()
  const [sharing, setSharing]     = useState<Account | undefined>()

  // True only while actively editing manual order (handles visible, not yet saved)
  const [isManualEditing, setIsManualEditing] = useState(false)

  // Draft order: changes as you drag, only committed on Save
  const [draftOrder, setDraftOrder] = useState<number[]>([])

  // Sync draftOrder once when prefs first load from Supabase
  useEffect(() => {
    if (loaded && !isManualEditing) setDraftOrder([...manualOrder])
  }, [loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refs to read current store values inside effects without adding them as deps
  const manualOrderRef = useRef(manualOrder)
  manualOrderRef.current = manualOrder
  const colorOrderRef = useRef(colorOrder)
  colorOrderRef.current = colorOrder

  // Sync manualOrder/draftOrder when accounts are added or removed
  useEffect(() => {
    if (accounts.length === 0) return
    const ids = accounts.map(a => a.id!)
    const current = manualOrderRef.current
    const merged = [...current.filter(id => ids.includes(id)), ...ids.filter(id => !current.includes(id))]
    if (merged.length !== current.length || merged.some((id, i) => id !== current[i])) {
      setManualOrder(merged)
    }
    setDraftOrder(prev => [...prev.filter(id => ids.includes(id)), ...ids.filter(id => !prev.includes(id))])
  }, [accounts.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync colorOrder with colors present in accounts
  useEffect(() => {
    if (accounts.length === 0) return
    const colors = [...new Set(accounts.map(a => a.color))]
    const current = colorOrderRef.current
    const merged = [...current.filter(c => colors.includes(c)), ...colors.filter(c => !current.includes(c))]
    if (merged.length !== current.length || merged.some((c, i) => c !== current[i])) {
      setColorOrder(merged)
    }
  }, [accounts]) // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleSortChange = (value: SortKey) => {
    setSort(value)
    if (value === 'manual') {
      setDraftOrder(manualOrder.length > 0 ? [...manualOrder] : accounts.map(a => a.id!))
    }
    setIsManualEditing(value === 'manual')
  }

  const handleSaveManual = () => {
    setManualOrder(draftOrder)
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
    const next = [...colorOrder]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setColorOrder(next)
  }

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
  const sorted = sortAccounts(accounts, sort, sort === 'manual' ? draftOrder : manualOrder, colorOrder)
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
      {isLoading ? (
        <PageLoader message="Loading accounts..." />
      ) : accounts.length === 0 ? (
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
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {sorted.map(account => {
                const isInvestment = account.type === 'investment'
                const bank = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
                return (
                  <SortableCard key={account.id} account={account} isManual={isManualEditing}>
                    <Card className="overflow-hidden card-hoverable">
                      <CardContent className="p-0">
                        <div className="h-1.5 w-full" style={{ backgroundColor: account.color }} />
                        <div className={`py-3 sm:py-5 px-3 sm:px-0  ${isManualEditing ? 'pl-9' : ''}`}>
                          {/* Top row: logo + name + menu */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                {bank ? (
                                  <BankLogo
                                    domain={bank.logoDomain}
                                    name={bank.name}
                                    accountType={account.type}
                                    imgClassName="h-6 w-6 object-contain"
                                    iconClassName="h-5 w-5 text-muted-foreground"
                                  />
                                ) : (
                                  (() => { const Icon = TYPE_ICONS[account.type] ?? Wallet; return <Icon className="h-5 w-5 text-muted-foreground" /> })()
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-base sm:text-lg font-semibold leading-tight truncate">
                                  {account.name}
                                </p>
                                {bank && (
                                  <p className="text-xs text-muted-foreground truncate">{bank.name}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center shrink-0">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
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

                          {/* Bottom row: badges + balance */}
                          <div className="mt-3 flex items-end justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
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

                            <div className="text-right shrink-0">
                              <p className={`text-lg font-bold tabular-nums ${account.balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                                {formatMoney(account.balance, account.currency)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">{account.currency}</p>
                            </div>
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
