import { useQuery } from '@tanstack/react-query'
import { formatISO } from 'date-fns'
import { recurringRepo, advanceDueDate } from '@/data/repositories/recurringRepo'
import { transactionsRepo } from '@/data/repositories/transactionsRepo'
import { groupsRepo } from '@/data/repositories/groupsRepo'
import { addGroupEntry } from '@/shared/hooks/useGroups'
import { supabase } from '@/data/supabase'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'
import { distributeEvenly, rescale } from '@/domain/splitMath'
import type { RecurringRule, GroupMember } from '@/domain/types'

// ─── Query ───────────────────────────────────────────────────────────────────

export function useRecurringRules() {
  return useQuery({
    queryKey: queryKeys.rules.all(),
    queryFn:  recurringRepo.getAll,
  })
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function addRule(data: Omit<RecurringRule, 'id' | 'createdAt'>) {
  await recurringRepo.add(data)
  queryClient.invalidateQueries({ queryKey: queryKeys.rules.all() })
}

export async function updateRule(id: number, data: Partial<RecurringRule>) {
  await recurringRepo.update(id, data)
  queryClient.invalidateQueries({ queryKey: queryKeys.rules.all() })
}

export async function removeRule(id: number) {
  await recurringRepo.remove(id)
  queryClient.invalidateQueries({ queryKey: queryKeys.rules.all() })
}

// ─── Group entry generation ────────────────────────────────────────────────

// Splits the rule's amount across the group's *current* members — 'even' ignores stored
// percents (membership may have changed since the rule was created); 'percent' uses them,
// falling back to an even split for any member missing a stored share.
function splitRuleAmount(totalCents: number, members: GroupMember[], rule: RecurringRule): Record<number, number> {
  const ids = members.map(m => m.id!)
  if (rule.splitMode === 'percent' && rule.splitPercents) {
    const weights = Object.fromEntries(ids.map(id => [id, Math.max(0, rule.splitPercents![id] ?? 0)]))
    return rescale(weights, ids, 100, totalCents)
  }
  return distributeEvenly(totalCents, ids)
}

// Creates the group entry (and, if the rule owner is the payer and createTx is on, a linked
// bank transaction) for one occurrence of a group recurring rule.
async function applyGroupRule(rule: RecurringRule, applyDate: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const members  = await groupsRepo.getMembers(rule.groupId!)
  const totalCents = Math.abs(rule.amount)
  const splitCents = splitRuleAmount(totalCents, members, rule)

  const myMember   = members.find(m => m.userId === user.id)
  const iAmPayer   = rule.payerMemberId == null
  const paidByMemberId = iAmPayer ? (myMember?.id ?? members[0]?.id) : rule.payerMemberId
  if (paidByMemberId == null) return

  let transactionId: number | undefined
  if (iAmPayer && rule.createTx !== false) {
    transactionId = await transactionsRepo.add({
      accountId:      rule.accountId,
      amount:         -totalCents,
      type:           'expense',
      category:       rule.category,
      description:    rule.description || rule.name,
      date:           applyDate,
      recurringRuleId: rule.id,
      isReimbursable: true,
    })
  }

  await addGroupEntry(
    {
      groupId:      rule.groupId!,
      description:  rule.description || rule.name,
      date:         applyDate,
      category:     rule.category,
      totalAmount:  totalCents,
      paidByMemberId,
      transactionId,
      createdBy:    user.id,
    },
    Object.entries(splitCents).map(([memberId, amount]) => ({ entryId: 0, memberId: Number(memberId), amount })),
  )
}

// ─── Apply ───────────────────────────────────────────────────────────────────

/** Creates a transaction (or group entry, for group rules) from a rule for the given date
 *  (defaults to rule.nextDue) and advances the rule's nextDue to the next occurrence. */
export async function applyRule(rule: RecurringRule, date?: string): Promise<void> {
  const applyDate = date ?? rule.nextDue

  if (rule.groupId != null) {
    await applyGroupRule(rule, applyDate)
  } else {
    await transactionsRepo.add({
      accountId:       rule.accountId,
      toAccountId:     rule.toAccountId,
      amount:          rule.amount,
      type:            rule.type,
      category:        rule.category,
      description:     rule.description || rule.name,
      date:            applyDate,
      recurringRuleId: rule.id,
      isPersonal:      rule.isPersonal ?? false,
      splitN:          rule.splitN ?? null,
      isReimbursable:  rule.isReimbursable ?? false,
    })
  }

  await recurringRepo.advance(rule.id!, rule.frequency, rule.nextDue)
  queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.rules.all() })
  queryClient.invalidateQueries({ queryKey: ['groups'] })
}

/** On session start: applies all active rules whose nextDue <= today (catches up missed runs). */
export async function autoApplyDueRules(): Promise<void> {
  const today = formatISO(new Date(), { representation: 'date' })
  const rules = await recurringRepo.getActive()
  const due   = rules.filter(r => r.nextDue <= today)

  if (due.length === 0) return

  for (const rule of due) {
    let currentDue = rule.nextDue
    while (currentDue <= today) {
      if (rule.groupId != null) {
        await applyGroupRule(rule, currentDue)
      } else {
        await transactionsRepo.add({
          accountId:       rule.accountId,
          toAccountId:     rule.toAccountId,
          amount:          rule.amount,
          type:            rule.type,
          category:        rule.category,
          description:     rule.description || rule.name,
          date:            currentDue,
          recurringRuleId: rule.id,
          isPersonal:      rule.isPersonal ?? false,
          splitN:          rule.splitN ?? null,
        })
      }
      await recurringRepo.advance(rule.id!, rule.frequency, currentDue)
      currentDue = advanceDueDate(currentDue, rule.frequency)
    }
  }

  queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.rules.all() })
  queryClient.invalidateQueries({ queryKey: ['groups'] })
}
