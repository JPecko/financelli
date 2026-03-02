import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM yyyy')
}

export function formatMonthYear(dateStr: string): string {
  return format(parseISO(dateStr), 'MMMM yyyy')
}

export function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy')
}

export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
}

export function currentMonthKey(): string {
  return format(new Date(), 'yyyy-MM')
}

export function isoToday(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
