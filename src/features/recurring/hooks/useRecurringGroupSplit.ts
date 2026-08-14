import { useEffect, useState } from 'react'
import { groupsRepo } from '@/data/repositories/groupsRepo'
import { useSplitState } from '@/features/groups/hooks/useSplitState'
import { toCents } from '@/domain/money'
import type { GroupMember, RecurringRule } from '@/domain/types'

const parseMoney = (v: string) => parseFloat(String(v).replace(',', '.')) || 0

/** Loads a group's members and drives the split state for a recurring rule's Group tab.
 *  Seeds from the rule's saved percents in edit mode, otherwise defaults to an even split. */
export function useRecurringGroupSplit(groupId: string, amountStr: string, existingRule: RecurringRule | undefined, currentUserId?: string) {
  const [members, setMembers] = useState<GroupMember[]>([])
  const totalCents = toCents(parseMoney(amountStr))
  const split = useSplitState(members, totalCents)

  useEffect(() => {
    if (!groupId) { setMembers([]); return }
    let cancelled = false
    groupsRepo.getMembers(parseInt(groupId))
      .then(ms => { if (!cancelled) setMembers(ms) })
      .catch(() => { if (!cancelled) setMembers([]) })
    return () => { cancelled = true }
  }, [groupId])

  useEffect(() => {
    if (members.length === 0) return
    if (existingRule?.groupId === parseInt(groupId) && existingRule.splitMode === 'percent' && existingRule.splitPercents) {
      split.applyPercents(existingRule.splitPercents)
    } else {
      split.resetEven(members.map(m => m.id!), totalCents)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members])

  const myMember = members.find(m => m.userId === currentUserId)
  return { members, myMember, ...split }
}
