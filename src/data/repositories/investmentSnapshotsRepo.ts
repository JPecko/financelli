import { supabase } from '@/data/supabase'
import type { InvestmentSnapshot } from '@/domain/types'

type InvestmentSnapshotRow = {
  account_id:    number
  snapshot_date: string
  value_cents:   number
}

function toSnapshot(row: InvestmentSnapshotRow): InvestmentSnapshot {
  return {
    accountId:    row.account_id,
    snapshotDate: row.snapshot_date,
    valueCents:   Number(row.value_cents),
  }
}

export const investmentSnapshotsRepo = {
  getSince: async (fromDate: string): Promise<InvestmentSnapshot[]> => {
    const { data, error } = await supabase
      .from('investment_snapshots')
      .select('account_id, snapshot_date, value_cents')
      .gte('snapshot_date', fromDate)
    if (error) throw error
    return (data as InvestmentSnapshotRow[]).map(toSnapshot)
  },

  // One value per account per month-end — later writes in the same month overwrite earlier ones
  upsertMany: async (snapshots: InvestmentSnapshot[]): Promise<void> => {
    if (snapshots.length === 0) return
    const rows = snapshots.map(s => ({
      account_id:    s.accountId,
      snapshot_date: s.snapshotDate,
      value_cents:   Math.round(s.valueCents),
    }))
    const { error } = await supabase
      .from('investment_snapshots')
      .upsert(rows, { onConflict: 'account_id,snapshot_date' })
    if (error) throw error
  },
}
