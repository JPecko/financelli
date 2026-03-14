import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Pencil, Trash2, UserPlus, UserMinus,
  TrendingUp, TrendingDown, Minus, ArrowRight, Receipt,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/components/ui/dialog'
import { Label } from '@/shared/components/ui/label'
import PageLoader from '@/shared/components/PageLoader'
import { useGroupDetail, useGroupMembers, useGroupEntries, useGroupSplits, useGroupBalances, removeGroup, addGroupMember, updateGroupMember, removeGroupMember, removeGroupEntry } from '@/shared/hooks/useGroups'
import { formatMoney } from '@/domain/money'
import { getCategoryById } from '@/domain/categories'
import { formatDate } from '@/shared/utils/format'
import { useAuth } from '@/features/auth/AuthContext'
import { useT } from '@/shared/i18n'
import type { Group, GroupEntry, GroupEntrySplit, GroupMember } from '@/domain/types'
import GroupFormModal from '../components/GroupFormModal'
import GroupEntryModal from '../components/GroupEntryModal'

// ---- Add Member Dialog -----------------------------------------

interface AddMemberDialogProps {
  open:    boolean
  onClose: () => void
  groupId: number
  member?: GroupMember   // for edit mode
}

function MemberDialog({ open, onClose, groupId, member }: AddMemberDialogProps) {
  const t      = useT()
  const [name,  setName]  = useState(member?.name  ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [busy,  setBusy]  = useState(false)

  // Reset on open
  useState(() => {
    if (open) {
      setName(member?.name ?? '')
      setEmail(member?.email ?? '')
    }
  })

  async function handleSave() {
    if (!name.trim()) return
    setBusy(true)
    try {
      if (member?.id != null) {
        await updateGroupMember(member.id, groupId, { name: name.trim(), email: email.trim() || undefined })
      } else {
        await addGroupMember({ groupId, name: name.trim(), email: email.trim() || undefined })
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{member ? t('common.edit') : t('groups.addMember')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t('groups.memberName')}</Label>
            <Input
              placeholder={t('groups.memberNamePlaceholder')}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('groups.memberEmail')}</Label>
            <Input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
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

  const [editGroupOpen,  setEditGroupOpen]  = useState(false)
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [editMember,     setEditMember]     = useState<GroupMember | undefined>()
  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [editEntry,      setEditEntry]      = useState<GroupEntry | undefined>()
  const [editSplits,     setEditSplits]     = useState<GroupEntrySplit[]>([])
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false)

  const isLoading = gLoading || mLoading || eLoading

  // Find the member row for the current user
  const myMember = members.find(m => m.userId === user?.id)

  // My net balance from balances
  const myBalance = myMember ? balances.find(b => b.memberId === myMember.id) : undefined

  // Splits keyed by entryId
  const splitsByEntry: Record<number, GroupEntrySplit[]> = {}
  for (const s of splits) {
    if (!splitsByEntry[s.entryId]) splitsByEntry[s.entryId] = []
    splitsByEntry[s.entryId].push(s)
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
        <Button variant="ghost" onClick={() => navigate('/groups')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('groups.back')}
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/groups')} className="-ml-2 shrink-0">
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

      {/* Row 1: My balance + Simplified debts */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* My balance */}
        {myBalance && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('groups.netBalance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${myBalance.net > 0 ? 'text-emerald-600' : myBalance.net < 0 ? 'text-rose-600' : 'text-foreground'}`}>
                {myBalance.net >= 0 ? '+' : ''}{formatMoney(myBalance.net)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {myBalance.net > 0 ? t('groups.youAreOwed') : myBalance.net < 0 ? t('groups.youOwe') : t('groups.settled')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Simplified debts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('groups.debts')}</CardTitle>
          </CardHeader>
          <CardContent>
            {debts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('groups.noDebts')}</p>
            ) : (
              <div className="space-y-2">
                {debts.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-medium truncate max-w-[80px]">{d.fromMemberName}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-medium truncate max-w-[80px]">{d.toMemberName}</span>
                    <span className="ml-auto font-semibold tabular-nums text-rose-600 shrink-0">
                      {formatMoney(d.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: All member balances */}
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

      {/* Row 3: Members management */}
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

      {/* Row 4: Expenses list */}
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
              const cat      = getCategoryById(entry.category)
              const paidBy   = members.find(m => m.id === entry.paidByMemberId)
              const entrySplits = splitsByEntry[entry.id!] ?? []
              const myEntryShare = myMember ? entrySplits.find(s => s.memberId === myMember.id) : undefined

              return (
                <Card key={entry.id} className="overflow-hidden">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: cat.color + '20' }}
                      >
                        <span className="text-sm">{cat.icon}</span>
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

      {/* Delete group confirmation */}
      <Dialog open={deleteGroupOpen} onOpenChange={setDeleteGroupOpen}>
        <DialogContent className="sm:max-w-sm">
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
    </div>
  )
}
