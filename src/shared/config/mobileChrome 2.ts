export const MOBILE_CHROME_MEDIA_QUERY = '(max-width: 1023px)'

export const MOBILE_CHROME_THRESHOLDS = {
  minDelta: 2,
  hideDelta: 24,
  showDelta: 16,
  nearTop: 8,
  nearBottom: 40,
} as const

export type ScrollDirection = -1 | 0 | 1

