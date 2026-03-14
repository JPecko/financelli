import { supabase } from '@/data/supabase'
import type {
  Group,
  GroupMember,
  GroupEntry,
  GroupEntrySplit,
  MemberBalance,
  SimplifiedDebt,
} from '@/domain/types'

// ---- Row types (snake_case ↔ DB) --------------------------------

type GroupRow = {
  id: number
  name: string
  currency: string
  created_by: string
  created_at: string
}

type GroupMemberRow = {
  id: number
  group_id: number
  user_id: string | null
  name: string
  email: string | null
  created_at: string
}

type GroupEntryRow = {
  id: number
  group_id: number
  description: string
  date: string
  category: string
  total_amount: number
  paid_by_member_id: number
  notes: string | null
  created_by: string
  created_at: string
}

type GroupEntrySplitRow = {
  id: number
  entry_id: number
  member_id: number
  amount: number
}

// ---- Mappers ---------------------------------------------------

function toGroup(r: GroupRow): Group {
  return {
    id:        r.id,
    name:      r.name,
    currency:  r.currency,
    createdBy: r.created_by,
    createdAt: r.created_at,
  }
}

function toMember(r: GroupMemberRow): GroupMember {
  return {
    id:        r.id,
    groupId:   r.group_id,
    userId:    r.user_id ?? undefined,
    name:      r.name,
    email:     r.email ?? undefined,
    createdAt: r.created_at,
  }
}

function toEntry(r: GroupEntryRow): GroupEntry {
  return {
    id:               r.id,
    groupId:          r.group_id,
    description:      r.description,
    date:             r.date,
    category:         r.category,
    totalAmount:      r.total_amount,
    paidByMemberId:   r.paid_by_member_id,
    notes:            r.notes ?? undefined,
    createdBy:        r.created_by,
    createdAt:        r.created_at,
  }
}

function toSplit(r: GroupEntrySplitRow): GroupEntrySplit {
  return {
    id:       r.id,
    entryId:  r.entry_id,
    memberId: r.member_id,
    amount:   r.amount,
  }
}

// ---- Groups CRUD -----------------------------------------------

export const groupsRepo = {
  // List all groups the current user is a member of
  getAll: async (): Promise<Group[]> => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data as GroupRow[]).map(toGroup)
  },

  getById: async (id: number): Promise<Group> => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return toGroup(data as GroupRow)
  },

  create: async (group: Omit<Group, 'id' | 'createdAt'>): Promise<number> => {
    const { data, error } = await supabase
      .from('groups')
      .insert({
        name:       group.name,
        currency:   group.currency,
        created_by: group.createdBy,
      })
      .select('id')
      .single()
    if (error) throw error
    return (data as { id: number }).id
  },

  update: async (id: number, changes: Partial<Pick<Group, 'name' | 'currency'>>): Promise<void> => {
    const { error } = await supabase
      .from('groups')
      .update({
        ...(changes.name     != null && { name:     changes.name }),
        ...(changes.currency != null && { currency: changes.currency }),
      })
      .eq('id', id)
    if (error) throw error
  },

  remove: async (id: number): Promise<void> => {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ---- Members -----------------------------------------------

  getMembers: async (groupId: number): Promise<GroupMember[]> => {
    const { data, error } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data as GroupMemberRow[]).map(toMember)
  },

  addMember: async (member: Omit<GroupMember, 'id' | 'createdAt'>): Promise<number> => {
    const { data, error } = await supabase
      .from('group_members')
      .insert({
        group_id: member.groupId,
        user_id:  member.userId ?? null,
        name:     member.name,
        email:    member.email ?? null,
      })
      .select('id')
      .single()
    if (error) throw error
    return (data as { id: number }).id
  },

  updateMember: async (id: number, changes: Partial<Pick<GroupMember, 'name' | 'email'>>): Promise<void> => {
    const { error } = await supabase
      .from('group_members')
      .update({
        ...(changes.name  != null && { name:  changes.name }),
        ...(changes.email != null && { email: changes.email }),
      })
      .eq('id', id)
    if (error) throw error
  },

  removeMember: async (id: number): Promise<void> => {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ---- Entries -----------------------------------------------

  getEntries: async (groupId: number): Promise<GroupEntry[]> => {
    const { data, error } = await supabase
      .from('group_entries')
      .select('*')
      .eq('group_id', groupId)
      .order('date', { ascending: false })
    if (error) throw error
    return (data as GroupEntryRow[]).map(toEntry)
  },

  addEntry: async (entry: Omit<GroupEntry, 'id' | 'createdAt'>): Promise<number> => {
    const { data, error } = await supabase
      .from('group_entries')
      .insert({
        group_id:           entry.groupId,
        description:        entry.description,
        date:               entry.date,
        category:           entry.category,
        total_amount:       entry.totalAmount,
        paid_by_member_id:  entry.paidByMemberId,
        notes:              entry.notes ?? null,
        created_by:         entry.createdBy,
      })
      .select('id')
      .single()
    if (error) throw error
    return (data as { id: number }).id
  },

  updateEntry: async (id: number, changes: Partial<Omit<GroupEntry, 'id' | 'groupId' | 'createdBy' | 'createdAt'>>): Promise<void> => {
    const { error } = await supabase
      .from('group_entries')
      .update({
        ...(changes.description      != null && { description:       changes.description }),
        ...(changes.date             != null && { date:              changes.date }),
        ...(changes.category         != null && { category:          changes.category }),
        ...(changes.totalAmount      != null && { total_amount:      changes.totalAmount }),
        ...(changes.paidByMemberId   != null && { paid_by_member_id: changes.paidByMemberId }),
        ...(changes.notes            !== undefined && { notes:        changes.notes ?? null }),
      })
      .eq('id', id)
    if (error) throw error
  },

  removeEntry: async (id: number): Promise<void> => {
    const { error } = await supabase
      .from('group_entries')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ---- Splits ------------------------------------------------

  getSplitsForEntry: async (entryId: number): Promise<GroupEntrySplit[]> => {
    const { data, error } = await supabase
      .from('group_entry_splits')
      .select('*')
      .eq('entry_id', entryId)
    if (error) throw error
    return (data as GroupEntrySplitRow[]).map(toSplit)
  },

  getSplitsForGroup: async (groupId: number): Promise<GroupEntrySplit[]> => {
    // Join via group_entries to get all splits for the group
    const { data, error } = await supabase
      .from('group_entry_splits')
      .select('*, group_entries!inner(group_id)')
      .eq('group_entries.group_id', groupId)
    if (error) throw error
    return (data as GroupEntrySplitRow[]).map(toSplit)
  },

  setSplitsForEntry: async (entryId: number, splits: Omit<GroupEntrySplit, 'id'>[]): Promise<void> => {
    // Delete existing splits, then insert new ones
    const { error: delErr } = await supabase
      .from('group_entry_splits')
      .delete()
      .eq('entry_id', entryId)
    if (delErr) throw delErr

    if (splits.length === 0) return

    const { error: insErr } = await supabase
      .from('group_entry_splits')
      .insert(
        splits.map(s => ({
          entry_id:  s.entryId,
          member_id: s.memberId,
          amount:    s.amount,
        }))
      )
    if (insErr) throw insErr
  },
}

// ---- Balance computation (pure, client-side) -------------------

export function computeBalances(
  members: GroupMember[],
  entries: GroupEntry[],
  splits: GroupEntrySplit[],
): MemberBalance[] {
  const paid: Record<number, number> = {}
  const owed: Record<number, number> = {}

  for (const m of members) {
    paid[m.id!] = 0
    owed[m.id!] = 0
  }

  for (const e of entries) {
    paid[e.paidByMemberId] = (paid[e.paidByMemberId] ?? 0) + e.totalAmount
  }

  for (const s of splits) {
    owed[s.memberId] = (owed[s.memberId] ?? 0) + s.amount
  }

  return members.map(m => ({
    memberId:   m.id!,
    memberName: m.name,
    paid:       paid[m.id!] ?? 0,
    owed:       owed[m.id!] ?? 0,
    net:        (paid[m.id!] ?? 0) - (owed[m.id!] ?? 0),
  }))
}

// ---- Simplified debts (greedy, O(n log n)) ---------------------

export function simplifyDebts(balances: MemberBalance[]): SimplifiedDebt[] {
  const creditors = balances.filter(b => b.net > 0).map(b => ({ ...b })).sort((a, b) => b.net - a.net)
  const debtors   = balances.filter(b => b.net < 0).map(b => ({ ...b })).sort((a, b) => a.net - b.net)
  const debts: SimplifiedDebt[] = []

  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor   = debtors[di]
    const amount   = Math.min(creditor.net, -debtor.net)

    if (amount > 0) {
      debts.push({
        fromMemberId:   debtor.memberId,
        fromMemberName: debtor.memberName,
        toMemberId:     creditor.memberId,
        toMemberName:   creditor.memberName,
        amount,
      })
    }

    creditor.net -= amount
    debtor.net   += amount

    if (creditor.net === 0) ci++
    if (debtor.net   === 0) di++
  }

  return debts
}
