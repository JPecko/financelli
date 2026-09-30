// Theme-aware via CSS vars in index.css: dark = near-black → color, light = white → soft color
export function accountGradient(color: string): string {
  const from = `color-mix(in srgb, ${color} var(--account-gradient-from), var(--account-gradient-from-base))`
  const to   = `color-mix(in srgb, ${color} var(--account-gradient-to), #ffffff)`
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
}
