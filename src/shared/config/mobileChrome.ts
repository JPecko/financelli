export const MOBILE_CHROME_MEDIA_QUERY = '(max-width: 1023px)'

export const MOBILE_CHROME_THRESHOLDS = {
  minDelta: 2,
  hideDelta: 24,   // px scrolled down before hook considers topbar "away"
  showDelta: 60,   // px scrolled up continuously to show floating topbar
  nearTop: 8,      // px from top to reset to in-flow
} as const

export type ScrollDirection = -1 | 0 | 1

