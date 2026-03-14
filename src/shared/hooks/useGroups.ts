import { useQuery } from '@tanstack/react-query'
import { groupsRepo, computeBalances, simplifyDebts } from '@/data/repositories/groupsRepo'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'
import type { Group, GroupMember, GroupEntry, GroupEntrySplit } from '@/domain/types'

// ---- Queries ---------------------------------------------------

export function useGroups() {
  return useQuery({
    queryKey: queryKeys.groups.all(),
    queryFn:  () => groupsRepo.getAll(),
  })
}

export function useGroupDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.groups.detail(id),
    queryFn:  () => groupsRepo.getById(id),
    enabled:  id > 0,
  })
}

export function useGroupMembers(groupId: number) {
  return useQuery({
    queryKey: queryKeys.groups.members(groupId),
    queryFn:  () => groupsRepo.getMembers(groupId),
    enabled:  groupId > 0,
  })
}

export function useGroupEntries(groupId: number) {
  return useQuery({
    queryKey: queryKeys.groups.entries(groupId),
    queryFn:  () => groupsRepo.getEntries(groupId),
    enabled:  groupId > 0,
  })
}

export function useGroupSplits(groupId: number) {
  return useQuery({
    queryKey: [...queryKeys.groups.entries(groupId), 'splits'],
    queryFn:  () => groupsRepo.getSplitsForGroup(groupId),
    enabled:  groupId > 0,
  })
}

/** Derived: balances + simplified debts for a group */
export function useGroupBalances(groupId: number) {
  const { data: members = [] } = useGroupMembers(groupId)
  const { data: entries = [] } = useGroupEntries(groupId)
  const { data: splits  = [] } = useGroupSplits(groupId)

  const balances = computeBalances(members, entries, splits)
  const debts    = simplifyDebts(balances)

  return { balances, debts }
}

// ---- Group mutations -------------------------------------------

function invalidateGroup(groupId?: number) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.groups.all() })
  if (groupId != null) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) })
  }
}

function invalidateGroupData(groupId: number) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.groups.members(groupId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.groups.entries(groupId) })
}

export async function createGroup(group: Omit<Group, 'id' | 'createdAt'>): Promise<number> {
  const id = await groupsRepo.create(group)
  invalidateGroup()
  return id
}

export async function updateGroup(id: number, changes: Partial<Pick<Group, 'name' | 'currency'>>): Promise<void> {
  await groupsRepo.update(id, changes)
  invalidateGroup(id)
}

export async function removeGroup(id: number): Promise<void> {
  await groupsRepo.remove(id)
  invalidateGroup(id)
}

// ---- Member mutations ------------------------------------------

export async function addGroupMember(member: Omit<GroupMember, 'id' | 'createdAt'>): Promise<number> {
  const id = await groupsRepo.addMember(member)
  invalidateGroupData(member.groupId)
  return id
}

export async function updateGroupMember(id: number, groupId: number, changes: Partial<Pick<GroupMember, 'name' | 'email'>>): Promise<void> {
  await groupsRepo.updateMember(id, changes)
  invalidateGroupData(groupId)
}

export async function removeGroupMember(id: number, groupId: number): Promise<void> {
  await groupsRepo.removeMember(id)
  invalidateGroupData(groupId)
}

// ---- Entry mutations -------------------------------------------

export async function addGroupEntry(
  entry: Omit<GroupEntry, 'id' | 'createdAt'>,
  splits: Omit<GroupEntrySplit, 'id'>[],
): Promise<void> {
  const entryId = await groupsRepo.addEntry(entry)
  await groupsRepo.setSplitsForEntry(entryId, splits.map(s => ({ ...s, entryId })))
  invalidateGroupData(entry.groupId)
}

export async function updateGroupEntry(
  id: number,
  groupId: number,
  changes: Partial<Omit<GroupEntry, 'id' | 'groupId' | 'createdBy' | 'createdAt'>>,
  splits?: Omit<GroupEntrySplit, 'id'>[],
): Promise<void> {
  await groupsRepo.updateEntry(id, changes)
  if (splits != null) {
    await groupsRepo.setSplitsForEntry(id, splits.map(s => ({ ...s, entryId: id })))
  }
  invalidateGroupData(groupId)
}

export async function removeGroupEntry(id: number, groupId: number): Promise<void> {
  await groupsRepo.removeEntry(id)
  invalidateGroupData(groupId)
}
