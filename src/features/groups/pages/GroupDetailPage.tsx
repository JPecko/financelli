import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Pencil, Trash2, UserPlus, UserMinus,
  TrendingUp, TrendingDown, Minus, ArrowRight, Receipt, BadgeCheck, CheckCheck, ChevronUp,
  Wallet, Banknote, PiggyBank, BarChart2, HandCoins, CreditCard,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/components/ui/dialog'
import { Label } from '@/shared/components/ui/label'
import PageLoader from '@/shared/components/PageLoader'
import {
  useGroupDetail, useGroupMembers, useGroupEntries, useGroupSplits, useGroupBalances,
  removeGroup, addGroupMember, updateGroupMember, removeGroupMember, removeGroupEntry, addGroupEntry,
} from '@/shared/hooks/useGroups'
import { useSortedAccounts } from '@/shared/hooks/useAccounts'
import { addTransaction } from '@/shared/hooks/useTransactions'
import BankLogo from '@/shared/components/BankLogo'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { supabase } from '@/data/supabase'
import { formatMoney } from '@/domain/money'
import { getCategoryById } from '@/domain/categories'
import { formatDate } from '@/shared/utils/format'
import { useAuth } from '@/features/auth/AuthContext'
import { useT } from '@/shared/i18n'
import type { GroupEntry, GroupEntrySplit, GroupMember } from '@/domain/types'
import GroupFormModal from '../components/GroupFormModal'
import GroupEntryModal from '../components/GroupEntryModal'

// ---- Account option with bank logo -----------------------------

const ACCOUNT_TYPE_ICONS: Record<string, React.ElementType> = {
  checking:   Banknote,
  savings:    PiggyBank,
  investment: BarChart2,
  cash:       HandCoins,
  credit:     CreditCard,
}

function AccountOption({ account }: { account: import('@/domain/types').Account }) {
  const bank = account.bankCode ? BANK_OPTIONS.find(b => b.code === account.bankCode) : undefined
  const Icon = ACCOUNT_TYPE_ICONS[account.type] ?? Wallet
  return (
    <span className="flex items-center gap-2.5">
      {bank
        ? <BankLogo domain={bank.logoDomain} name={bank.name} accountType={account.type} imgClassName="h-5 w-5 rounded-sm object-contain shrink-0" iconClassName="h-5 w-5 shrink-0 text-muted-foreground" />
        : <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      }
      <span>{account.name}</span>
    </span>
  )
}

// ---- Add Member Dialog -----------------------------------------

interface AddMemberDialogProps {
  open:    boolean
  onClose: () => void
  groupId: number
  member?: GroupMember
}

function MemberDialog({ open, onClose, groupId, member }: AddMemberDialogProps) {
  const t = useT()
  const [name,        setName]        = useState(member?.name  ?? '')
  const [email,       setEmail]       = useState(member?.email ?? '')
  const [resolvedUid, setResolvedUid] = useState<string | undefined>(member?.userId)
  const [looking,     setLooking]     = useState(false)
  const [busy,        setBusy]        = useState(false)
  useEffect(() => {
    if (!open) return
    setName(member?.name ?? '')
    setEmail(member?.email ?? '')
    setResolvedUid(member?.userId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleEmailBlur() {
    const trimmed = email.trim()
    if (!trimmed || member) return
    setLooking(true)
    try {
      const { data } = await supabase.rpc('lookup_user_by_email', { p_email: trimmed })
      if (data && data.length > 0) {
        setResolvedUid(data[0].user_id)
        if (!name.trim()) setName(data[0].display_name)
      } else {
        setResolvedUid(undefined)
      }
    } finally {
      setLooking(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) return
    setBusy(true)
    try {
      if (member?.id != null) {
        await updateGroupMember(member.id, groupId, { name: name.trim(), email: email.trim() || undefined })
      } else {
        await addGroupMember({
          groupId,
          name:   name.trim(),
          email:  email.trim() || undefined,
          userId: resolvedUid,
        })
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{member ? t('common.edit') : t('groups.addMember')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t('groups.memberEmail')}</Label>
            <div className="relative">
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setResolvedUid(undefined) }}
                onBlur={handleEmailBlur}
                disabled={!!member}
              />
              {looking && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">…</span>
              )}
            </div>
            {resolvedUid && !looking && (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5" />
                Utilizador Financelli encontrado
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>{t('groups.memberName')}</Label>
            <Input
              placeholder={t('groups.memberNamePlaceholder')}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={busy || !name.trim()}>{t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Main Page -------------------------------------------------

export default function GroupDetailPage() {
  const t        = useT()
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const groupId  = parseInt(id ?? '0')

  const { data: group,   isLoading: gLoading } = useGroupDetail(groupId)
  const { data: members = [], isLoading: mLoading } = useGroupMembers(groupId)
  const { data: entries = [], isLoading: eLoading } = useGroupEntries(groupId)
  const { data: splits  = [] } = useGroupSplits(groupId)
  const { balances, debts } = useGroupBalances(groupId)
  const { data: accounts = [] } = useSortedAccounts()

  const [editGroupOpen,    setEditGroupOpen]    = useState(false)
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [editMember,       setEditMember]       = useState<GroupMember | undefined>()
  const [entryModalOpen,   setEntryModalOpen]   = useState(false)
  const [editEntry,        setEditEntry]        = useState<GroupEntry | undefined>()
  const [editSplits,       setEditSplits]       = useState<GroupEntrySplit[]>([])
  const [deleteGroupOpen,  setDeleteGroupOpen]  = useState(false)
  const [settleUpOpen,     setSettleUpOpen]     = useState(false)
  const [settlingUp,       setSettlingUp]       = useState(false)
  const [settleUpAccounts, setSettleUpAccounts] = useState<Record<number, string>>({})
  const [showScrollTop,    setShowScrollTop]    = useState(false)

  // Sentinel ref for scroll-to-top visibility
  const topSentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = topSentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollTop(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const isLoading = gLoading || mLoading || eLoading
  const myMember  = members.find(m => m.userId === user?.id)
  const myBalance = myMember ? balances.find(b => b.memberId === myMember.id) : undefined

  const splitsByEntry: Record<number, GroupEntrySplit[]> = {}
  for (const s of splits) {
    if (!splitsByEntry[s.entryId]) splitsByEntry[s.entryId] = []
    splitsByEntry[s.entryId].push(s)
  }

  function scrollToTop() {
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSettleUp() {
    if (!user || debts.length === 0) return
    setSettlingUp(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      for (const [i, debt] of debts.entries()) {
        let txId: number | undefined
        const accountId = settleUpAccounts[i]

        if (accountId) {
          const accIdNum = parseInt(accountId)
          if (myMember && debt.fromMemberId === myMember.id) {
            // I'm paying — reimbursable expense (already counted in original group entry)
            txId = await addTransaction({
              accountId:      accIdNum,
              amount:         -debt.amount,
              type:           'expense',
              isReimbursable: true,
              description:    t('groups.settleUpEntry'),
              date:           today,
              category:       'transfer',
            })
          } else if (myMember && debt.toMemberId === myMember.id) {
            // I'm receiving — income
            txId = await addTransaction({
              accountId:   accIdNum,
              amount:      debt.amount,
              type:        'income',
              description: t('groups.settleUpEntry'),
              date:        today,
              category:    'transfer',
            })
          }
        }

        await addGroupEntry(
          {
            groupId,
            description:    t('groups.settleUpEntry'),
            date:           today,
            category:       'transfer',
            totalAmount:    debt.amount,
            paidByMemberId: debt.fromMemberId,
            transactionId:  txId,
            createdBy:      user.id,
          },
          [{ entryId: 0, memberId: debt.toMemberId, amount: debt.amount }],
        )
      }
    } finally {
      setSettlingUp(false)
      setSettleUpOpen(false)
      setSettleUpAccounts({})
    }
  }

  async function handleDeleteGroup() {
    if (!group?.id) return
    await removeGroup(group.id)
    navigate('/groups')
  }

  function openEditEntry(entry: GroupEntry) {
    setEditEntry(entry)
    setEditSplits(splitsByEntry[entry.id!] ?? [])
    setEntryModalOpen(true)
  }

  function openAddEntry() {
    setEditEntry(undefined)
    setEditSplits([])
    setEntryModalOpen(true)
  }

  function closeEntryModal() {
    setEntryModalOpen(false)
    setEditEntry(undefined)
    setEditSplits([])
  }

  if (isLoading) return <PageLoader message={t('groups.loading')} />

  if (!group) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Group not found.</p>
        <Button variant="ghost" onClick={() => navigate('/groups', { state: { skipAutoRedirect: true } })} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('groups.back')}
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Scroll sentinel (top of page) */}
      <div ref={topSentinelRef} className="h-0" aria-hidden="true" />

      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/groups', { state: { skipAutoRedirect: true } })} className="-ml-2 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{group.name}</h1>
          <p className="text-sm text-muted-foreground">{group.currency} · {members.length} {t('groups.members').toLowerCase()}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              {t('common.edit')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditGroupOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> {t('groups.editGroup')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteGroupOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> {t('groups.deleteGroup')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Row 1: Combined net balance + who owes whom */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('groups.debts')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* My net balance */}
          {myBalance && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t('groups.netBalance')}</p>
                <p className={`text-2xl font-bold tabular-nums ${myBalance.net > 0 ? 'text-emerald-600' : myBalance.net < 0 ? 'text-rose-600' : 'text-foreground'}`}>
                  {myBalance.net >= 0 ? '+' : ''}{formatMoney(myBalance.net)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {myBalance.net > 0 ? t('groups.youAreOwed') : myBalance.net < 0 ? t('groups.youOwe') : t('groups.settled')}
                </p>
              </div>
            </div>
          )}

          {/* Debt rows */}
          {debts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-1">{t('groups.noDebts')}</p>
          ) : (
            <>
              <div className="space-y-1.5">
                {debts.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm rounded-lg bg-muted/30 px-3 py-2">
                    <span className={`font-medium truncate ${myMember && d.fromMemberId === myMember.id ? 'text-rose-600' : ''}`}>
                      {d.fromMemberName}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className={`font-medium truncate ${myMember && d.toMemberId === myMember.id ? 'text-emerald-600' : ''}`}>
                      {d.toMemberName}
                    </span>
                    <span className="ml-auto font-semibold tabular-nums text-rose-600 shrink-0">
                      {formatMoney(d.amount)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Prominent settle-up button */}
              <Button
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
                onClick={() => { setSettleUpAccounts({}); setSettleUpOpen(true) }}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                {t('groups.settleUp')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Row 2: Member balances + Members management — side by side */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* All member balances */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('groups.balances')}</CardTitle>
          </CardHeader>
          <CardContent>
            {balances.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            ) : (
              <div className="divide-y divide-border">
                {balances.map(b => (
                  <div key={b.memberId} className="py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {b.memberName}
                        {members.find(m => m.id === b.memberId)?.userId === user?.id && (
                          <span className="ml-1.5 text-xs text-muted-foreground">({t('groups.youInGroup')})</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Paid {formatMoney(b.paid)} · Owed {formatMoney(b.owed)}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {b.net > 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> :
                       b.net < 0 ? <TrendingDown className="h-3.5 w-3.5 text-rose-500" /> :
                       <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className={`text-sm font-semibold tabular-nums ${b.net > 0 ? 'text-emerald-600' : b.net < 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
                        {b.net >= 0 ? '+' : ''}{formatMoney(b.net)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members management */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('groups.members')}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setEditMember(undefined); setMemberDialogOpen(true) }}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              {t('groups.addMember')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {members.map(m => (
                <div key={m.id} className="py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.name}
                      {m.userId === user?.id && (
                        <span className="ml-1.5 text-xs text-muted-foreground">({t('groups.youInGroup')})</span>
                      )}
                    </p>
                    {m.email && <p className="text-xs text-muted-foreground truncate">{m.email}</p>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditMember(m); setMemberDialogOpen(true) }}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> {t('common.edit')}
                      </DropdownMenuItem>
                      {m.userId !== user?.id && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => m.id != null && removeGroupMember(m.id, groupId)}
                        >
                          <UserMinus className="h-3.5 w-3.5 mr-2" /> {t('groups.removeMember')}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Expenses list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t('groups.entries')}</h2>
          <Button size="sm" onClick={openAddEntry}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t('groups.addEntry')}
          </Button>
        </div>

        {entries.length === 0 ? (
          <Card>
            <CardContent className="pt-6 pb-6 text-center">
              <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t('groups.noEntries')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('groups.noEntriesDesc')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => {
              const cat         = getCategoryById(entry.category)
              const paidBy      = members.find(m => m.id === entry.paidByMemberId)
              const entrySplits = splitsByEntry[entry.id!] ?? []
              const myEntryShare = myMember ? entrySplits.find(s => s.memberId === myMember.id) : undefined
              const iPaid = myMember != null && entry.paidByMemberId === myMember.id

              return (
                <Card key={entry.id} className={`overflow-hidden ${iPaid ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: cat.color + '20' }}
                      >
                        <cat.icon className="h-4 w-4" style={{ color: cat.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{entry.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(entry.date)} · {t('groups.paidBy')} {paidBy?.name ?? '?'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold">{formatMoney(entry.totalAmount)}</p>
                            {myEntryShare != null && (
                              <p className="text-xs text-muted-foreground">
                                {t('groups.yourShare')}: {formatMoney(myEntryShare.amount)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditEntry(entry)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> {t('groups.editEntry')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => entry.id != null && removeGroupEntry(entry.id, groupId)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> {t('groups.deleteEntry')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <GroupFormModal
        open={editGroupOpen}
        onClose={() => setEditGroupOpen(false)}
        group={group}
      />

      <MemberDialog
        open={memberDialogOpen}
        onClose={() => { setMemberDialogOpen(false); setEditMember(undefined) }}
        groupId={groupId}
        member={editMember}
      />

      <GroupEntryModal
        open={entryModalOpen}
        onClose={closeEntryModal}
        groupId={groupId}
        members={members}
        entry={editEntry}
        existingSplits={editSplits}
      />

      {/* Settle Up dialog */}
      <Dialog open={settleUpOpen} onOpenChange={v => !settlingUp && setSettleUpOpen(v)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('groups.settleUp')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('groups.settleUpConfirm')}</p>

          <div className="space-y-3 mt-1">
            {debts.map((d, i) => {
              const iAmPayer    = myMember != null && d.fromMemberId === myMember.id
              const iAmReceiver = myMember != null && d.toMemberId   === myMember.id
              return (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm rounded-lg bg-muted/40 px-3 py-2.5">
                    <span className={`font-medium truncate ${iAmPayer ? 'text-rose-600' : ''}`}>{d.fromMemberName}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className={`font-medium truncate ${iAmReceiver ? 'text-emerald-600' : ''}`}>{d.toMemberName}</span>
                    <span className="ml-auto font-semibold tabular-nums text-rose-600 shrink-0">{formatMoney(d.amount)}</span>
                  </div>

                  {(iAmPayer || iAmReceiver) && accounts.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {iAmPayer ? t('groups.settleUpPayFrom') : t('groups.settleUpReceiveTo')}
                      </Label>
                      <Select
                        value={settleUpAccounts[i] ?? ''}
                        onValueChange={v => setSettleUpAccounts(prev => ({ ...prev, [i]: v }))}
                      >
                        <SelectTrigger className="w-full h-10">
                          <SelectValue placeholder="Select account..." />
                        </SelectTrigger>
                        <SelectContent className="w-full">
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={String(acc.id)}>
                              <AccountOption account={acc} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleUpOpen(false)} disabled={settlingUp}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSettleUp}
              disabled={settlingUp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              {t('groups.settleUp')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete group confirmation */}
      <Dialog open={deleteGroupOpen} onOpenChange={setDeleteGroupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('groups.deleteGroup')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('groups.deleteGroupConfirm')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGroupOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteGroup}>{t('common.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating scroll-to-top (mobile only, when scrolled down) */}
      {showScrollTop && (
        <button
          className="fixed bottom-20 right-4 z-50 lg:hidden h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all"
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
