import type { CSSProperties } from 'react'

export const chartTooltipStyle: CSSProperties = {
  fontSize: 12,
  backgroundColor: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.15)',
  padding: '6px 10px',
}

export const chartTooltipLabelStyle: CSSProperties = {
  color: 'var(--muted-foreground)',
  marginBottom: 4,
  fontWeight: 500,
}
