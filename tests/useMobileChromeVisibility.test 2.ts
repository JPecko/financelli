import { describe, expect, it } from 'vitest'
import { computeNextChromeState } from '../src/shared/hooks/useMobileChromeVisibility'

describe('computeNextChromeState', () => {
  it('keeps state when scroll delta is below min threshold', () => {
    const next = computeNextChromeState({
      currentY: 101,
      maxScroll: 1000,
      lastY: 100,
      direction: 1,
      directionTravel: 5,
      visible: true,
    })

    expect(next).toEqual({
      visible: true,
      lastY: 100,
      direction: 1,
      directionTravel: 5,
    })
  })

  it('forces visible when near top', () => {
    const next = computeNextChromeState({
      currentY: 4,
      maxScroll: 1000,
      lastY: 30,
      direction: 1,
      directionTravel: 20,
      visible: false,
    })

    expect(next.visible).toBe(true)
    expect(next.direction).toBe(0)
    expect(next.directionTravel).toBe(0)
  })

  it('forces visible when near bottom', () => {
    const next = computeNextChromeState({
      currentY: 965,
      maxScroll: 1000,
      lastY: 900,
      direction: 1,
      directionTravel: 20,
      visible: false,
    })

    expect(next.visible).toBe(true)
    expect(next.direction).toBe(0)
    expect(next.directionTravel).toBe(0)
  })

  it('hides after enough downward travel', () => {
    let state = {
      visible: true,
      lastY: 100,
      direction: 0 as -1 | 0 | 1,
      directionTravel: 0,
    }

    state = computeNextChromeState({
      currentY: 115,
      maxScroll: 1000,
      ...state,
    })
    state = computeNextChromeState({
      currentY: 130,
      maxScroll: 1000,
      ...state,
    })

    expect(state.visible).toBe(false)
  })

  it('shows after enough upward travel when hidden', () => {
    let state = {
      visible: false,
      lastY: 220,
      direction: 0 as -1 | 0 | 1,
      directionTravel: 0,
    }

    state = computeNextChromeState({
      currentY: 210,
      maxScroll: 1000,
      ...state,
    })
    state = computeNextChromeState({
      currentY: 200,
      maxScroll: 1000,
      ...state,
    })

    expect(state.visible).toBe(true)
  })
})

