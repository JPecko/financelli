import { supabase } from '@/data/supabase'
import type { RecurringRule } from '@/domain/types'
import { addWeeks, addMonths, addYears, formatISO, parseISO } from 'date-fns'

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
  end_date: string | null
  active: boolean
  created_at: string
}

function toRule(row: RuleRow): RecurringRule {
  return {
    id:           row.id,
    accountId:    row.account_id,
    toAccountId:  row.to_account_id ?? undefined,
    name:         row.name,
    amount:      row.amount,
    type:        row.type as RecurringRule['type'],
    category:    row.category,
    description: row.description,
    frequency:   row.frequency as RecurringRule['frequency'],
    startDate:   row.start_date,
    nextDue:     row.next_due,
    endDate:     row.end_date ?? undefined,
    active:      row.active,
    createdAt:   row.created_at,
  }
}

function toRow(rule: Partial<RecurringRule>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (rule.accountId   !== undefined) row.account_id    = rule.accountId
  if (rule.toAccountId !== undefined) row.to_account_id = rule.toAccountId ?? null
  if (rule.name        !== undefined) row.name        = rule.name
  if (rule.amount      !== undefined) row.amount      = rule.amount
  if (rule.type        !== undefined) row.type        = rule.type
  if (rule.category    !== undefined) row.category    = rule.category
  if (rule.description !== undefined) row.description = rule.description
  if (rule.frequency   !== undefined) row.frequency   = rule.frequency
  if (rule.startDate   !== undefined) row.start_date  = rule.startDate
  if (rule.nextDue     !== undefined) row.next_due    = rule.nextDue
  if (rule.endDate     !== undefined) row.end_date    = rule.endDate
  if (rule.active      !== undefined) row.active      = rule.active
  return row
}

export function advanceDueDate(current: string, frequency: RecurringRule['frequency']): string {
  const date = parseISO(current)
  let next: Date
  switch (frequency) {
    case 'weekly':  next = addWeeks(date, 1);  break
    case 'monthly': next = addMonths(date, 1); break
    case 'yearly':  next = addYears(date, 1);  break
  }
  return formatISO(next, { representation: 'date' })
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

  /** Advance nextDue to the next occurrence */
  advance: async (id: number, frequency: RecurringRule['frequency'], currentNextDue: string): Promise<void> => {
    const { error } = await supabase
      .from('recurring_rules')
      .update({ next_due: advanceDueDate(currentNextDue, frequency) })
      .eq('id', id)
    if (error) throw error
  },
}
