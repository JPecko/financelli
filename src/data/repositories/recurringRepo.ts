import { supabase } from '@/data/supabase'
import type { RecurringRule } from '@/domain/types'
import { advanceOccurrence } from '@/domain/recurringDate'

type RuleRow = {
  id: number
  account_id: number
  to_account_id: number | null
  name: string
  amount: number
  type: string
  category: string
  description: string
  frequency: string
  start_date: string
  next_due: string
  anchor_date: string | null
  date_rule: string | null
  adjust_to_business_day: boolean
  end_date: string | null
  active: boolean
  is_personal: boolean
  split_n: number | null
  is_reimbursable: boolean
  group_id: number | null
  split_mode: string | null
  split_percents: Record<number, number> | null
  payer_member_id: number | null
  create_tx: boolean
  created_at: string
}

function toRule(row: RuleRow): RecurringRule {
  return {
    id:              row.id,
    accountId:       row.account_id,
    toAccountId:     row.to_account_id ?? undefined,
    name:            row.name,
    amount:          row.amount,
    type:            row.type as RecurringRule['type'],
    category:        row.category,
    description:     row.description,
    frequency:       row.frequency as RecurringRule['frequency'],
    startDate:       row.start_date,
    nextDue:         row.next_due,
    anchorDate:      row.anchor_date ?? row.next_due,
    dateRule:        (row.date_rule as RecurringRule['dateRule']) ?? 'exact',
    adjustToBusinessDay: row.adjust_to_business_day ?? false,
    endDate:         row.end_date ?? undefined,
    active:          row.active,
    isPersonal:      row.is_personal ?? false,
    splitN:          row.split_n ?? null,
    isReimbursable:  row.is_reimbursable ?? false,
    groupId:         row.group_id ?? null,
    splitMode:       row.split_mode as RecurringRule['splitMode'] ?? null,
    splitPercents:   row.split_percents ?? null,
    payerMemberId:   row.payer_member_id ?? null,
    createTx:        row.create_tx ?? true,
    createdAt:       row.created_at,
  }
}

function toRow(rule: Partial<RecurringRule>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (rule.accountId       !== undefined) row.account_id      = rule.accountId
  if (rule.toAccountId     !== undefined) row.to_account_id   = rule.toAccountId ?? null
  if (rule.name            !== undefined) row.name            = rule.name
  if (rule.amount          !== undefined) row.amount          = rule.amount
  if (rule.type            !== undefined) row.type            = rule.type
  if (rule.category        !== undefined) row.category        = rule.category
  if (rule.description     !== undefined) row.description     = rule.description
  if (rule.frequency       !== undefined) row.frequency       = rule.frequency
  if (rule.startDate       !== undefined) row.start_date      = rule.startDate
  if (rule.nextDue         !== undefined) row.next_due        = rule.nextDue
  if (rule.anchorDate      !== undefined) row.anchor_date     = rule.anchorDate
  if (rule.dateRule        !== undefined) row.date_rule       = rule.dateRule ?? 'exact'
  if (rule.adjustToBusinessDay !== undefined) row.adjust_to_business_day = rule.adjustToBusinessDay
  if (rule.endDate         !== undefined) row.end_date        = rule.endDate
  if (rule.active          !== undefined) row.active          = rule.active
  if (rule.isPersonal      !== undefined) row.is_personal     = rule.isPersonal
  if (rule.splitN          !== undefined) row.split_n         = rule.splitN ?? null
  if (rule.isReimbursable  !== undefined) row.is_reimbursable = rule.isReimbursable
  if (rule.groupId         !== undefined) row.group_id        = rule.groupId ?? null
  if (rule.splitMode       !== undefined) row.split_mode      = rule.splitMode ?? null
  if (rule.splitPercents   !== undefined) row.split_percents  = rule.splitPercents ?? null
  if (rule.payerMemberId   !== undefined) row.payer_member_id = rule.payerMemberId ?? null
  if (rule.createTx        !== undefined) row.create_tx       = rule.createTx
  return row
}

export const recurringRepo = {
  getAll: async (): Promise<RecurringRule[]> => {
    const { data, error } = await supabase
      .from('recurring_rules')
      .select('*')
      .order('next_due')
    if (error) throw error
    return (data as RuleRow[]).map(toRule)
  },

  getActive: async (): Promise<RecurringRule[]> => {
    const { data, error } = await supabase
      .from('recurring_rules')
      .select('*')
      .eq('active', true)
      .order('next_due')
    if (error) throw error
    return (data as RuleRow[]).map(toRule)
  },

  add: async (rule: Omit<RecurringRule, 'id' | 'createdAt'>): Promise<number> => {
    const { data, error } = await supabase
      .from('recurring_rules')
      .insert(toRow(rule))
      .select('id')
      .single()
    if (error) throw error
    return (data as { id: number }).id
  },

  update: async (id: number, changes: Partial<RecurringRule>): Promise<void> => {
    const { error } = await supabase
      .from('recurring_rules')
      .update(toRow(changes))
      .eq('id', id)
    if (error) throw error
  },

  remove: async (id: number): Promise<void> => {
    const { error } = await supabase.from('recurring_rules').delete().eq('id', id)
    if (error) throw error
  },

  /** Steps the rule's raw anchor by one period and persists the resulting anchor/nextDue pair. */
  advance: async (
    id: number,
    rule: Pick<RecurringRule, 'frequency' | 'dateRule' | 'adjustToBusinessDay'>,
    currentAnchor: string,
  ): Promise<{ anchorDate: string; nextDue: string }> => {
    const occurrence = advanceOccurrence(currentAnchor, rule.frequency, rule.dateRule ?? 'exact', rule.adjustToBusinessDay ?? false)
    const { error } = await supabase
      .from('recurring_rules')
      .update({ anchor_date: occurrence.anchorDate, next_due: occurrence.nextDue })
      .eq('id', id)
    if (error) throw error
    return occurrence
  },
}
