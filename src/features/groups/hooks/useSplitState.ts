import { useRef, useState, useEffect } from 'react'
import { toCents, fromCents } from '@/domain/money'
import { distributeEvenly, redistributeAfterChange, rescale } from '@/domain/splitMath'
import type { GroupMember } from '@/domain/types'

export type SplitMode = 'even' | 'percent' | 'custom'
export interface SplitRow { memberId: number; amount: string }

const PCT_TOTAL = 10000 // basis points = 100.00%
const parseMoney = (v: string) => parseFloat(String(v).replace(',', '.')) || 0

/**
 * Owns the split math for a group expense: even / percent / custom modes, each self-adjusting so
 * the shares always sum to the total. Changing one member's share redistributes the remainder
 * across the others proportionally to their current shares (evenly if they're all at zero).
 */
export function useSplitState(members: GroupMember[], totalCents: number) {
  const ids = members.map(m => m.id!)

  const [splitMode, setSplitModeState] = useState<SplitMode>('even')
  const [customCents, setCustomCents]     = useState<Record<number, number>>({})
  const [centipercents, setCentipercents] = useState<Record<number, number>>({})
  const [splitError, setSplitError] = useState('')

  const setSplitMode = (mode: SplitMode) => { setSplitModeState(mode); setSplitError('') }

  // Call after loading a new member set (new/changed group) to reset both modes to an even split.
  const resetEven = (nextIds: number[], total: number) => {
    setCustomCents(distributeEvenly(total, nextIds))
    setCentipercents(distributeEvenly(PCT_TOTAL, nextIds))
    setSplitMode('even')
  }

  // Call when loading an existing entry's splits (edit mode) — seeds custom amounts and switches to custom.
  const applyCustomSplits = (existing: { memberId: number; amount: number }[]) => {
    setCustomCents(Object.fromEntries(existing.map(s => [s.memberId, s.amount])))
    setSplitMode('custom')
  }

  // Call when loading stored percents (e.g. a recurring rule's saved split) — seeds percent mode.
  const applyPercents = (existing: Record<number, number>) => {
    setCentipercents(Object.fromEntries(Object.entries(existing).map(([id, pct]) => [Number(id), Math.round(pct * 100)])))
    setSplitMode('percent')
  }

  // Keep custom amounts proportional to the total as it's edited, so the sum tracks it automatically.
  const prevTotalRef = useRef(totalCents)
  useEffect(() => {
    if (totalCents === prevTotalRef.current) return
    setCustomCents(prev => rescale(prev, ids, prevTotalRef.current, totalCents))
    prevTotalRef.current = totalCents
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCents])

  const handlePercentChange = (memberId: number, pct: number) => {
    setCentipercents(prev => redistributeAfterChange(PCT_TOTAL, ids, prev, memberId, Math.round(pct * 100)))
    setSplitError('')
  }
  const handleAmountChange = (memberId: number, euros: string) => {
    const cents = toCents(parseMoney(euros))
    setCustomCents(prev => redistributeAfterChange(totalCents, ids, prev, memberId, cents))
    setSplitError('')
  }
  const setMemberFull = (memberId: number) =>
    splitMode === 'percent' ? handlePercentChange(memberId, 100) : handleAmountChange(memberId, fromCents(totalCents).toFixed(2))
  const setMemberEmpty = (memberId: number) =>
    splitMode === 'percent' ? handlePercentChange(memberId, 0) : handleAmountChange(memberId, '0')

  const activeCents =
    splitMode === 'even'    ? distributeEvenly(totalCents, ids) :
    splitMode === 'percent' ? rescale(centipercents, ids, PCT_TOTAL, totalCents) :
    customCents

  const splits: SplitRow[] = ids.map(id => ({ memberId: id, amount: fromCents(activeCents[id] ?? 0).toFixed(2) }))
  const percents: Record<number, string> = Object.fromEntries(ids.map(id => [id, Math.round((centipercents[id] ?? 0) / 100).toString()]))

  return {
    splitMode, setSplitMode, splitError, setSplitError,
    splits, percents,
    resetEven, applyCustomSplits, applyPercents,
    handlePercentChange, handleAmountChange,
    setMemberFull, setMemberEmpty,
  }
}
