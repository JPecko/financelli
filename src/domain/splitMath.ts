// Pure integer share-splitting math, reused for both money (cents) and percent (centipercent) units.

export function distributeEvenly(total: number, ids: number[]): Record<number, number> {
  if (ids.length === 0) return {}
  const base = Math.floor(total / ids.length)
  const rem  = total - base * ids.length
  return Object.fromEntries(ids.map((id, i) => [id, i < rem ? base + 1 : base]))
}

// Splits `amount` across `ids` proportionally to `weights` (falls back to even when every weight is ~0).
// Leftover rounding units go to the shares with the largest fractional remainder, so the sum always matches exactly.
function distributeProportional(amount: number, ids: number[], weights: Record<number, number>): Record<number, number> {
  if (ids.length === 0) return {}
  const totalWeight = ids.reduce((sum, id) => sum + Math.max(0, weights[id] ?? 0), 0)
  if (totalWeight <= 0) return distributeEvenly(amount, ids)

  const shares  = ids.map(id => (Math.max(0, weights[id] ?? 0) / totalWeight) * amount)
  const floors  = shares.map(Math.floor)
  const leftover = amount - floors.reduce((a, b) => a + b, 0)
  const order = shares
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac)

  const result: Record<number, number> = {}
  ids.forEach((id, i) => { result[id] = floors[i] })
  for (let k = 0; k < leftover; k++) result[ids[order[k % ids.length].i]] += 1
  return result
}

/** Sets `changedId`'s share to `newValue` (clamped to [0, total]) and redistributes the rest across
 *  the other ids proportionally to their current shares — so the total always stays fixed. */
export function redistributeAfterChange(
  total: number, ids: number[], current: Record<number, number>, changedId: number, newValue: number,
): Record<number, number> {
  const clamped = Math.max(0, Math.min(total, Math.round(newValue)))
  const others  = ids.filter(id => id !== changedId)
  const rest    = distributeProportional(total - clamped, others, current)
  return { ...rest, [changedId]: clamped }
}

/** Rescales a share map onto a new total, preserving relative ratios. */
export function rescale(current: Record<number, number>, ids: number[], prevTotal: number, newTotal: number): Record<number, number> {
  if (prevTotal <= 0) return distributeEvenly(newTotal, ids)
  return distributeProportional(newTotal, ids, current)
}
