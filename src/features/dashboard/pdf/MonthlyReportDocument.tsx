import { Document, Page, View, Text } from '@react-pdf/renderer'
import { formatMoney } from '@/domain/money'
import { reportPdfStyles as s } from './reportPdf.styles'
import type {
  MonthlyReportData, MonthlyReportCategory, MonthlyReportExpense,
  MonthlyReportAccount, MonthlyReportNetWorthGroup, MonthlyReportLabels,
} from './monthlyReport.types'

interface Props {
  data: MonthlyReportData
}

export default function MonthlyReportDocument({ data }: Props) {
  const l = data.labels
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <ReportHeader labels={l} />

        <View style={s.statsRow}>
          <StatCard label={l.income} value={formatMoney(data.income)} tone="positive" />
          <StatCard label={l.expenses} value={formatMoney(data.expenses)} tone="negative" />
          <StatCard label={l.balance} value={formatMoney(data.balance)} tone={data.balance >= 0 ? 'positive' : 'negative'} />
          {data.savingsRate != null && <StatCard label={l.savingsRate} value={`${data.savingsRate}%`} />}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{l.spendingByCategory}</Text>
          {data.categories.length === 0
            ? <Text>{l.noExpenses}</Text>
            : data.categories.map(cat => <CategoryRow key={cat.name} category={cat} />)}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{l.topExpenses}</Text>
          {data.topExpenses.length === 0
            ? <Text>{l.noExpenses}</Text>
            : data.topExpenses.map((exp, i) => <ExpenseRow key={i} expense={exp} />)}
        </View>

        <ReportFooter labels={l} />
      </Page>

      {/* Account balances always start on their own page */}
      <Page size="A4" style={s.page}>
        <ReportHeader labels={l} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>{l.netWorthByType}</Text>
          {data.netWorthByType.map(group => <NetWorthRow key={group.label} group={group} />)}
          <View style={[s.row, { borderBottomWidth: 0, marginTop: 4 }]}>
            <Text style={[s.rowLabel, { fontWeight: 700 }]}>{l.total}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.rowValue}>{formatMoney(data.netWorthTotal)}</Text>
              <DeltaLabel delta={data.netWorthDelta} comparisonLabel={data.comparisonLabel} vsLabel={l.vs} />
            </View>
          </View>
          <Text style={s.note}>{l.excludesInvestments}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{l.accountBalances}</Text>
          {data.accounts.map(acc => <AccountRow key={acc.name} account={acc} comparisonLabel={data.comparisonLabel} vsLabel={l.vs} />)}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{l.investmentsSnapshot}</Text>
          <View style={s.statsRow}>
            <StatCard label={l.invested} value={formatMoney(data.investment.totalInvested)} />
            <StatCard label={l.marketValue} value={formatMoney(data.investment.totalMarketValue)} />
            <StatCard
              label={l.pnl}
              value={formatMoney(data.investment.totalPnl)}
              tone={data.investment.totalPnl >= 0 ? 'positive' : 'negative'}
            />
          </View>
          <Text style={s.note}>{l.investmentsNote}</Text>
        </View>

        <ReportFooter labels={l} />
      </Page>
    </Document>
  )
}

function ReportHeader({ labels }: { labels: MonthlyReportLabels }) {
  return (
    <View>
      <Text style={s.title}>Financelli — {labels.title}</Text>
      <Text style={s.subtitle}>{labels.subtitle}</Text>
    </View>
  )
}

function ReportFooter({ labels }: { labels: MonthlyReportLabels }) {
  return (
    <Text style={s.footer} render={({ pageNumber }) => `Financelli · ${labels.page} ${pageNumber}`} fixed />
  )
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, tone ? s[tone] : {}]}>{value}</Text>
    </View>
  )
}

function DeltaLabel({ delta, comparisonLabel, vsLabel }: { delta: number; comparisonLabel: string; vsLabel: string }) {
  const tone = delta === 0 ? {} : delta > 0 ? s.positive : s.negative
  return (
    <Text style={[s.rowSublabel, tone]}>
      {delta >= 0 ? '+' : ''}{formatMoney(delta)} {vsLabel} {comparisonLabel}
    </Text>
  )
}

function NetWorthRow({ group }: { group: MonthlyReportNetWorthGroup }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{group.label}</Text>
      <Text style={s.rowValue}>{formatMoney(group.value)}</Text>
    </View>
  )
}

function AccountRow({ account, comparisonLabel, vsLabel }: { account: MonthlyReportAccount; comparisonLabel: string; vsLabel: string }) {
  return (
    <View style={s.row}>
      <View>
        <Text style={s.rowLabel}>{account.name}</Text>
        <Text style={s.rowSublabel}>{account.type}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.rowValue}>{formatMoney(account.balance)}</Text>
        <DeltaLabel delta={account.delta} comparisonLabel={comparisonLabel} vsLabel={vsLabel} />
      </View>
    </View>
  )
}

function CategoryRow({ category }: { category: MonthlyReportCategory }) {
  return (
    <View style={s.row}>
      <View style={s.rowLeft}>
        <View style={[s.dot, { backgroundColor: category.color }]} />
        <Text style={s.rowLabel}>{category.name}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={s.rowValue}>{formatMoney(category.value)}</Text>
          <Text style={[s.rowSublabel, { width: 24, textAlign: 'right' }]}>{category.pct}%</Text>
        </View>
        <View style={s.barTrack}>
          <View style={[s.barFill, { width: `${category.pct}%`, backgroundColor: category.color }]} />
        </View>
      </View>
    </View>
  )
}

function ExpenseRow({ expense }: { expense: MonthlyReportExpense }) {
  return (
    <View style={s.row}>
      <View>
        <Text style={s.rowLabel}>{expense.description}</Text>
        <Text style={s.rowSublabel}>{expense.category}</Text>
      </View>
      <Text style={[s.rowValue, s.negative]}>{formatMoney(expense.amount)}</Text>
    </View>
  )
}
