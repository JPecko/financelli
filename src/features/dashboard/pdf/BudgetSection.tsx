import { View, Text } from '@react-pdf/renderer'
import { formatMoney } from '@/domain/money'
import { reportPdfStyles as s } from './reportPdf.styles'
import type { BudgetStatus } from '@/domain/budgets'
import type { MonthlyReportBudget, MonthlyReportBudgets, MonthlyReportLabels } from './monthlyReport.types'

const STATUS_COLOR: Record<BudgetStatus, string> = { ok: '#059669', warning: '#d97706', over: '#dc2626' }

export default function BudgetSection({ budgets, labels }: { budgets: MonthlyReportBudgets; labels: MonthlyReportLabels }) {
  return (
    <View style={s.section} wrap={false}>
      <Text style={s.sectionTitle}>{labels.budgetVsActual}</Text>
      {budgets.rows.map(row => <BudgetRow key={row.name} budget={row} />)}
      <View style={[s.row, { borderBottomWidth: 0, marginTop: 4 }]}>
        <Text style={[s.rowLabel, { fontWeight: 700 }]}>{labels.total}</Text>
        <BudgetFigures budget={budgets.total} />
      </View>
      <Text style={s.note}>{labels.budgetNote}</Text>
    </View>
  )
}

function BudgetRow({ budget }: { budget: MonthlyReportBudget }) {
  return (
    <View style={s.row}>
      <View style={s.rowLeft}>
        <View style={[s.dot, { backgroundColor: budget.color }]} />
        <Text style={s.rowLabel}>{budget.name}</Text>
      </View>
      <BudgetFigures budget={budget} />
    </View>
  )
}

function BudgetFigures({ budget }: { budget: Omit<MonthlyReportBudget, 'name' | 'color'> }) {
  const color = STATUS_COLOR[budget.status]
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={s.rowValue}>{formatMoney(budget.spent)}</Text>
        <Text style={s.rowSublabel}>/ {formatMoney(budget.limit)}</Text>
        <Text style={[s.rowSublabel, { width: 30, textAlign: 'right', color }]}>{budget.pct}%</Text>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${Math.min(budget.pct, 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}
