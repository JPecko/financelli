import { db } from '@/data/db'
import type { RecurringRule } from '@/domain/types'
import { addWeeks, addMonths, addYears, formatISO, parseISO } from 'date-fns'

function nextDueDate(current: string, frequency: RecurringRule['frequency']): string {
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
  getAll: () => db.recurringRules.orderBy('nextDue').toArray(),

  getActive: () => db.recurringRules.where('active').equals(1).sortBy('nextDue'),

  add: (rule: Omit<RecurringRule, 'id'>) =>
    db.recurringRules.add({ ...rule, createdAt: new Date().toISOString() }),

  update: (id: number, changes: Partial<RecurringRule>) =>
    db.recurringRules.update(id, changes),

  remove: (id: number) => db.recurringRules.delete(id),

  /** Advance nextDue to the next occurrence */
  advance: (id: number, frequency: RecurringRule['frequency'], currentNextDue: string) =>
    db.recurringRules.update(id, { nextDue: nextDueDate(currentNextDue, frequency) }),
}
