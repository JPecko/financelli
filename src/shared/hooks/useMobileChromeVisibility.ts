import { useEffect, useRef, useState, type RefObject } from 'react'
import {
  MOBILE_CHROME_MEDIA_QUERY,
  MOBILE_CHROME_THRESHOLDS,
  type ScrollDirection,
} from '@/shared/config/mobileChrome'

export type TopbarState = 'in-flow' | 'floating' | 'hidden'

type ChromeThresholds = typeof MOBILE_CHROME_THRESHOLDS

interface TopbarStepInput {
  currentY: number
  lastY: number
  direction: ScrollDirection
  directionTravel: number
  state: TopbarState
  thresholds?: ChromeThresholds
}

interface TopbarStepOutput {
  state: TopbarState
  lastY: number
  direction: ScrollDirection
  directionTravel: number
}

export function computeNextTopbarState({
  currentY,
  lastY,
  direction,
  directionTravel,
  state,
  thresholds = MOBILE_CHROME_THRESHOLDS,
}: TopbarStepInput): TopbarStepOutput {
  const y = Math.max(currentY, 0)
  const delta = y - lastY
  if (Math.abs(delta) < thresholds.minDelta) {
    return { state, lastY, direction, directionTravel }
  }

  // Back at top → always in-flow
  if (y <= thresholds.nearTop) {
    return { state: 'in-flow', lastY: y, direction: 0, directionTravel: 0 }
  }

  const nextDirection: ScrollDirection = delta > 0 ? 1 : -1
  const baseTravel = nextDirection === direction ? directionTravel : 0
  const nextTravel = baseTravel + Math.abs(delta)

  // Scrolling down → hide (from in-flow or floating)
  if (nextDirection === 1 && state !== 'hidden' && nextTravel > thresholds.hideDelta) {
    return { state: 'hidden', lastY: y, direction: nextDirection, directionTravel: 0 }
  }

  // Scrolling up from hidden → float over content
  if (nextDirection === -1 && state === 'hidden' && nextTravel > thresholds.showDelta) {
    return { state: 'floating', lastY: y, direction: nextDirection, directionTravel: 0 }
  }

  return { state, lastY: y, direction: nextDirection, directionTravel: nextTravel }
}

export function useTopbarState({
  pathname,
  scrollerRef,
}: {
  pathname: string
  scrollerRef: RefObject<HTMLElement | null>
}): TopbarState {
  const [topbarState, setTopbarState] = useState<TopbarState>('in-flow')

  const stateRef          = useRef<TopbarState>('in-flow')
  const lastYRef          = useRef(0)
  const directionRef      = useRef<ScrollDirection>(0)
  const directionTravelRef = useRef(0)
  const rafRef            = useRef<number | null>(null)

  // Reset on route change
  useEffect(() => {
    const scroller = scrollerRef.current
    scroller?.scrollTo({ top: 0, behavior: 'auto' })
    stateRef.current = 'in-flow'
    setTopbarState('in-flow')
    directionRef.current = 0
    directionTravelRef.current = 0
    lastYRef.current = scroller?.scrollTop ?? 0
  }, [pathname, scrollerRef])

  // Scroll listener
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    lastYRef.current = scroller.scrollTop
    directionRef.current = 0
    directionTravelRef.current = 0

    const commit = (next: TopbarState) => {
      if (stateRef.current === next) return
      stateRef.current = next
      setTopbarState(next)
    }

    const onScroll = () => {
      if (!window.matchMedia(MOBILE_CHROME_MEDIA_QUERY).matches) {
        commit('in-flow')
        return
      }
      if (rafRef.current != null) return

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null
        const next = computeNextTopbarState({
          currentY: scroller.scrollTop,
          lastY: lastYRef.current,
          direction: directionRef.current,
          directionTravel: directionTravelRef.current,
          state: stateRef.current,
        })
        lastYRef.current = next.lastY
        directionRef.current = next.direction
        directionTravelRef.current = next.directionTravel
        commit(next.state)
      })
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [scrollerRef])

  return topbarState
}
