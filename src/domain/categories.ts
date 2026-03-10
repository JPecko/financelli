import {
  Home,
  ShoppingCart,
  Car,
  Heart,
  Gamepad2,
  Zap,
  Briefcase,
  TrendingUp,
  ArrowLeftRight,
  Coffee,
  GraduationCap,
  Plane,
  MoreHorizontal,
  BarChart2,
  Coins,
  BadgePercent,
  Landmark,
  Dumbbell,
  type LucideIcon,
} from 'lucide-react'

export interface Category {
  id: string
  label: string
  icon: LucideIcon
  color: string
  type: 'expense' | 'income' | 'both'
}

export const CATEGORIES: Category[] = [
  { id: 'housing',       label: 'Housing',          icon: Home,           color: '#6366f1', type: 'expense' },
  { id: 'food',          label: 'Food & Drinks',    icon: Coffee,         color: '#f59e0b', type: 'expense' },
  { id: 'transport',     label: 'Transport',        icon: Car,            color: '#3b82f6', type: 'expense' },
  { id: 'health',        label: 'Health',           icon: Heart,          color: '#ef4444', type: 'expense' },
  { id: 'entertainment', label: 'Entertainment',    icon: Gamepad2,       color: '#f97316', type: 'expense' },
  { id: 'shopping',      label: 'Shopping',         icon: ShoppingCart,   color: '#ec4899', type: 'expense' },
  { id: 'utilities',     label: 'Utilities',        icon: Zap,            color: '#eab308', type: 'expense' },
  { id: 'education',     label: 'Education',        icon: GraduationCap,  color: '#06b6d4', type: 'expense' },
  { id: 'travel',        label: 'Travel',           icon: Plane,          color: '#14b8a6', type: 'expense' },
  { id: 'investing',     label: 'Investing',        icon: Landmark,       color: '#7c3aed', type: 'expense' },
  { id: 'sport',         label: 'Sport',            icon: Dumbbell,       color: '#16a34a', type: 'expense' },
  { id: 'roundup',       label: 'Roundup',          icon: Coins,          color: '#78716c', type: 'expense' },
  { id: 'cashback',      label: 'Cashback',         icon: BadgePercent,   color: '#10b981', type: 'expense' },
  { id: 'salary',        label: 'Salary',           icon: Briefcase,      color: '#22c55e', type: 'income' },
  { id: 'freelance',     label: 'Freelance',        icon: Briefcase,      color: '#8b5cf6', type: 'income' },
  { id: 'investment',    label: 'Investment Return', icon: TrendingUp,    color: '#84cc16', type: 'income' },
  { id: 'capital',       label: 'Capital Movement', icon: BarChart2,      color: '#0ea5e9', type: 'both' },
  { id: 'transfer',      label: 'Transfer',         icon: ArrowLeftRight, color: '#94a3b8', type: 'both' },
  { id: 'revaluation',   label: 'Market Update',    icon: BarChart2,      color: '#d946ef', type: 'both' },
  { id: 'other',         label: 'Other',            icon: MoreHorizontal, color: '#71717a', type: 'both' },
]

export const EXPENSE_CATEGORIES = CATEGORIES.filter(c => c.type === 'expense' || c.type === 'both')
export const INCOME_CATEGORIES  = CATEGORIES.filter(c => c.type === 'income'  || c.type === 'both')

export function getCategoryById(id: string): Category {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}
