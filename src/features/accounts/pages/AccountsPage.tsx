import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  Plus, Pencil, Trash2, Wallet, BarChart2, Users, GripVertical,
  ArrowUpDown, Check, ChevronUp, ChevronDown, Save, X,
  Banknote, PiggyBank, HandCoins, CreditCard, ExternalLink,
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
import { useHoldings } from '@/shared/hooks/useHoldings'
import { useAccountPrefsStore, type SortKey } from '@/shared/store/accountPrefsStore'
import { BANK_OPTIONS } from '@/shared/config/banks'
import BankLogo from '@/shared/components/BankLogo'
import { useAuth } from '@/features/auth/AuthContext'
import { formatMoney } from '@/domain/money'
import EmptyState from '@/shared/components/EmptyState'
import PageLoader from '@/shared/components/PageLoader'
import AccountFormModal from '../components/AccountFormModal'
import RevalueModal from '../components/RevalueModal'
import ShareAccountModal from '../components/ShareAccountModal'
import type { Account } from '@/domain/types'
import { useT } from '@/shared/i18n'
import { NavLink } from 'react-router-dom'

const TYPE_ICONS: Record<string, React.ElementType> = {
  checking:   Banknote,
  savings:    PiggyBank,
  investment: BarChart2,
  cash:       HandCoins,
  credit:     CreditCard,
}

const SORT_KEYS: SortKey[] = ['default', 'name', 'type', 'color', 'balance', 'manual']

interface SortableCardProps {
  account: Account
  isManual: boolean
  children: React.ReactNode
}

interface AccountCardProps {
  account: Account
  bank: { logoDomain: string; name: string } | undefined
  isManualEditing: boolean
  user: ReturnType<typeof useAuth>['user']
  t: ReturnType<typeof useT>
  onEdit:   (a: Account) => void
  onDelete: (id: number | undefined) => void
  onRevalue: (a: Account) => void
  onShare:   (a: Account) => void
}

function AccountCard({ account, bank, isManualEditing, user, t, onEdit, onDelete, onRevalue, onShare }: AccountCardProps) {
  const isInvestment = account.type === 'investment'
  return (
    <Card className="overflow-hidden card-hoverable">
      <CardContent className="p-0">
        <div className="h-1.5 w-full" style={{ backgroundColor: account.color }} />
        <div className={`py-3 sm:py-5 px-3 sm:px-5 ${isManualEditing ? 'pl-9' : ''}`}>
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
                <p className="text-base sm:text-lg font-semibold leading-tight truncate">{account.name}</p>
                {bank && <p className="text-xs text-muted-foreground truncate">{bank.name}</p>}
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
                      <DropdownMenuItem onClick={() => onRevalue(account)}>
                        <BarChart2 className="h-4 w-4 mr-2" /> {t('accounts.updateValue')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => onShare(account)}>
                    <Users className="h-4 w-4 mr-2" /> {t('accounts.share')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(account)}>
                    <Pencil className="h-4 w-4 mr-2" /> {t('common.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(account.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> {t('common.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Bottom row: badges + balance */}
          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {t(('accounts.types.' + account.type) as Parameters<typeof t>[0])}
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
                        {' '}<span className="opacity-60">({t('accounts.owner')})</span>
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
  )
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
  const t = useT()
  const { data: accounts = [], isLoading } = useAccounts()
  const { user } = useAuth()
  const {
    sort, manualOrder, colorOrder,
    setSort, setManualOrder, setColorOrder,
  } = useAccountPrefsStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Account | undefined>()
  const [revaluing, setRevaluing] = useState<Account | undefined>()
  const [sharing, setSharing]     = useState<Account | undefined>()

  const [isManualEditing, setIsManualEditing] = useState(false)
  // Raw drag order — only populated while editing; accounts added/removed are merged in effectiveDraftOrder
  const [draftOrder, setDraftOrder] = useState<number[]>([])

  // Derived: merge drag order with current accounts (handles additions/removals without setState in effects)
  const effectiveDraftOrder = useMemo(() => {
    const ids = accounts.map(a => a.id!)
    if (draftOrder.length === 0) return ids
    return [...draftOrder.filter(id => ids.includes(id)), ...ids.filter(id => !draftOrder.includes(id))]
  }, [draftOrder, accounts])

  const manualOrderRef = useRef(manualOrder)
  const colorOrderRef  = useRef(colorOrder)
  useLayoutEffect(() => { manualOrderRef.current = manualOrder }, [manualOrder])
  useLayoutEffect(() => { colorOrderRef.current  = colorOrder  }, [colorOrder])

  // Sync store manualOrder when accounts are added/removed (only external store update — no local setState)
  useEffect(() => {
    if (accounts.length === 0) return
    const ids     = accounts.map(a => a.id!)
    const current = manualOrderRef.current
    const merged  = [...current.filter(id => ids.includes(id)), ...ids.filter(id => !current.includes(id))]
    if (merged.length !== current.length || merged.some((id, i) => id !== current[i])) {
      setManualOrder(merged)
    }
  }, [accounts.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync store colorOrder when account colors change (external store update only)
  useEffect(() => {
    if (accounts.length === 0) return
    const colors  = [...new Set(accounts.map(a => a.color))]
    const current = colorOrderRef.current
    const merged  = [...current.filter(c => colors.includes(c)), ...colors.filter(c => !current.includes(c))]
    if (merged.length !== current.length || merged.some((c, i) => c !== current[i])) {
      setColorOrder(merged)
    }
  }, [accounts]) // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleSortChange = (value: SortKey) => {
    setSort(value)
    if (value === 'manual') {
      setDraftOrder(manualOrder.length > 0 ? [...manualOrder] : accounts.map(a => a.id!))
      setIsManualEditing(true)
    } else {
      setDraftOrder([])
      setIsManualEditing(false)
    }
  }

  const handleSaveManual = () => {
    setManualOrder(effectiveDraftOrder)
    setIsManualEditing(false)
  }

  const handleCancelManual = () => {
    setDraftOrder([])
    setIsManualEditing(false)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isManualEditing) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = effectiveDraftOrder.indexOf(active.id as number)
    const newIdx = effectiveDraftOrder.indexOf(over.id as number)
    if (oldIdx === -1 || newIdx === -1) return
    setDraftOrder(arrayMove([...effectiveDraftOrder], oldIdx, newIdx))
  }

  const moveColor = (i: number, dir: -1 | 1) => {
    const next = [...colorOrder]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setColorOrder(next)
  }

  const sortLabelKey = (key: SortKey): Parameters<typeof t>[0] => {
    const map: Record<SortKey, Parameters<typeof t>[0]> = {
      default: 'accounts.sortCreation',
      name:    'accounts.sortName',
      type:    'accounts.sortType',
      color:   'accounts.sortColor',
      balance: 'accounts.sortBalance',
      manual:  'accounts.sortManual',
    }
    return map[key]
  }

  const { data: holdings = [] } = useHoldings()

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
  const orderForSort = isManualEditing ? effectiveDraftOrder : manualOrder
  const sorted = sortAccounts(accounts, sort, orderForSort, colorOrder)

  const nonInvAccounts = sorted.filter(a => a.type !== 'investment')
  const invAccounts    = sorted.filter(a => a.type === 'investment')
  const sortedIds      = nonInvAccounts.map(a => a.id!)

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
    if (confirm(t('accounts.deleteConfirm'))) {
      await removeAccount(id)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('accounts.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('accounts.totalBalance')}: <span className="font-semibold text-foreground">{formatMoney(totalBalance)}</span>
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row items-end sm:items-center gap-2">

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                {t('accounts.sort')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{t('accounts.sortBy')}</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {SORT_KEYS.map(key => (
                <DropdownMenuItem key={key} onClick={() => handleSortChange(key)}>
                  <span className="w-5 shrink-0">
                    {sort === key && <Check className="h-3.5 w-3.5" />}
                  </span>
                  {t(sortLabelKey(key))}
                </DropdownMenuItem>
              ))}

              {/* Color order section */}
              {sort === 'color' && colorOrder.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                    {t('accounts.colorOrder')}
                  </DropdownMenuLabel>
                  {colorOrder.map((color, i) => (
                    <div key={color} className="flex items-center gap-2 px-2 py-1">
                      <span
                        className="h-4 w-4 rounded-full border border-border shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="flex-1 text-xs font-mono text-muted-foreground truncate">{color}</span>
                      <button
                        className="p-0.5 rounded hover:bg-muted disabled:opacity-30 cursor-pointer disabled:cursor-default"
                        disabled={i === 0}
                        onClick={(e) => { e.stopPropagation(); moveColor(i, -1) }}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        className="p-0.5 rounded hover:bg-muted disabled:opacity-30 cursor-pointer disabled:cursor-default"
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
            {t('accounts.addAccount')}
          </Button>
        </div>
      </div>

      {/* Manual editing bar */}
      {isManualEditing && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-2.5 mb-4">
          <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <GripVertical className="h-4 w-4" />
            {t('accounts.dragToReorder')}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={handleCancelManual}>
              <X className="h-3.5 w-3.5" /> {t('common.cancel')}
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={handleSaveManual}>
              <Save className="h-3.5 w-3.5" /> {t('accounts.saveOrder')}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <PageLoader message={t('accounts.loading')} />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={t('accounts.noAccounts')}
          description={t('accounts.noAccountsDesc')}
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('accounts.addFirst')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {/* ── Regular accounts ──────────────────────────────────────────── */}
          {nonInvAccounts.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedIds} strategy={rectSortingStrategy}>
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                  {nonInvAccounts.map(account => {
                    const bank = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
                    return (
                      <SortableCard key={account.id} account={account} isManual={isManualEditing}>
                        <AccountCard
                          account={account}
                          bank={bank}
                          isManualEditing={isManualEditing}
                          user={user}
                          t={t}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onRevalue={setRevaluing}
                          onShare={setSharing}
                        />
                      </SortableCard>
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* ── Investment accounts ───────────────────────────────────────── */}
          {invAccounts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('accounts.types.investment')}
                </p>
                <NavLink to="/investments">
                  <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                    <ExternalLink className="h-3 w-3" />
                    {t('investments.viewHoldings')}
                  </Button>
                </NavLink>
              </div>
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                {invAccounts.map(account => {
                  const bank = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
                  const accountHoldings = holdings.filter(h => h.accountId === account.id)
                  const marketValue = accountHoldings.length > 0
                    ? accountHoldings.reduce((s, h) => s + h.quantity * h.currentPrice, 0)
                    : null
                  const costBasis = accountHoldings.length > 0
                    ? accountHoldings.reduce((s, h) => s + h.quantity * h.avgCost, 0)
                    : null
                  const pnl = marketValue != null && costBasis != null ? marketValue - costBasis : null
                  return (
                    <Card key={account.id} className="overflow-hidden card-hoverable">
                      <CardContent className="p-0">
                        <div className="h-1.5 w-full" style={{ backgroundColor: account.color }} />
                        <div className="py-3 sm:py-5 px-3 sm:px-5">
                          {/* Top row */}
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
                                  <BarChart2 className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-base sm:text-lg font-semibold leading-tight truncate">{account.name}</p>
                                {bank && <p className="text-xs text-muted-foreground truncate">{bank.name}</p>}
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
                                  <DropdownMenuItem onClick={() => setRevaluing(account)}>
                                    <BarChart2 className="h-4 w-4 mr-2" /> {t('accounts.updateValue')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setSharing(account)}>
                                    <Users className="h-4 w-4 mr-2" /> {t('accounts.share')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(account)}>
                                    <Pencil className="h-4 w-4 mr-2" /> {t('common.edit')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDelete(account.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> {t('common.delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Bottom row */}
                          <div className="mt-3 flex items-end justify-between gap-2">
                            <div className="space-y-0.5">
                              {account.investedBase != null && (
                                <p className="text-xs text-muted-foreground">
                                  {t('investments.investedBase')}: <span className="font-medium text-foreground">{formatMoney(account.investedBase, account.currency)}</span>
                                </p>
                              )}
                              {pnl != null && (
                                <p className={`text-xs font-medium ${pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {t('investments.pnl')}: {pnl >= 0 ? '+' : ''}{formatMoney(pnl, account.currency)}
                                </p>
                              )}
                              {accountHoldings.length === 0 && (
                                <p className="text-xs text-muted-foreground">{accountHoldings.length} holdings</p>
                              )}
                              {accountHoldings.length > 0 && (
                                <p className="text-xs text-muted-foreground">{accountHoldings.length} {accountHoldings.length === 1 ? 'holding' : 'holdings'}</p>
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
                  )
                })}
              </div>
            </div>
          )}
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
