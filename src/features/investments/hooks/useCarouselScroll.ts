import { useRef, useEffect, useState, useCallback } from 'react'

export const CAROUSEL_GAP       = 12
export const CAROUSEL_MIN_WIDTH = 192

// Match InvestmentsPage layout: max-w-4xl (56rem) + p-6 (1.5rem)
const MAX_WIDTH_REM = 56
const PADDING_REM   = 1.5

interface Options {
  count:      number
  selectedId: number | null
  onSelect:   (id: number) => void
}

export function useCarouselScroll({ count, selectedId, onSelect }: Options) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs     = useRef<Map<number, HTMLButtonElement>>(new Map())

  const isDragging   = useRef(false)
  const wasDragged   = useRef(false)
  const dragStartX   = useRef(0)
  const scrollStart  = useRef(0)

  const isProgrammaticScroll    = useRef(false)
  const programmaticScrollTimer = useRef<ReturnType<typeof setTimeout>>()

  const [cardWidth, setCardWidth] = useState(CAROUSEL_MIN_WIDTH)

  // Set scroll-snap on mount (managed via DOM to avoid React interference during drag)
  useEffect(() => {
    const el = containerRef.current
    if (el) el.style.scrollSnapType = 'x mandatory'
  }, [])

  // Recompute card width whenever viewport or card count changes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const compute = () => {
      const rem       = parseFloat(getComputedStyle(document.documentElement).fontSize)
      const vw        = el.clientWidth
      const edgePx    = Math.max((vw - MAX_WIDTH_REM * rem) / 2 + PADDING_REM * rem, PADDING_REM * rem)
      const available = vw - 2 * edgePx
      const totalMin  = count * CAROUSEL_MIN_WIDTH + (count - 1) * CAROUSEL_GAP
      setCardWidth(
        totalMin <= available
          ? Math.floor((available - (count - 1) * CAROUSEL_GAP) / count)
          : CAROUSEL_MIN_WIDTH,
      )
    }
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    compute()
    return () => ro.disconnect()
  }, [count])

  // Scroll selected card to center within the carousel only (not ancestors)
  useEffect(() => {
    if (selectedId == null) return
    const el   = containerRef.current
    const card = cardRefs.current.get(selectedId)
    if (!el || !card) return

    isProgrammaticScroll.current = true
    clearTimeout(programmaticScrollTimer.current)
    programmaticScrollTimer.current = setTimeout(() => {
      isProgrammaticScroll.current = false
    }, 600)

    const cRect = el.getBoundingClientRect()
    const kRect = card.getBoundingClientRect()
    const delta = (kRect.left + kRect.width / 2) - (cRect.left + el.clientWidth / 2)
    el.scrollTo({ left: el.scrollLeft + delta, behavior: 'smooth' })
  }, [selectedId, cardWidth])

  const getCardAtCenter = useCallback((): number | null => {
    const el = containerRef.current
    if (!el) return null
    const { left, width } = el.getBoundingClientRect()
    const center = left + width / 2
    let bestId: number | null = null
    let minDist = Infinity
    for (const [id, card] of cardRefs.current) {
      const r    = card.getBoundingClientRect()
      const dist = Math.abs(r.left + r.width / 2 - center)
      if (dist < minDist) { minDist = dist; bestId = id }
    }
    return bestId
  }, [])

  // Sync selection after manual scroll settles (touch swipe + pointer drag snap)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout>
    const onScroll = () => {
      if (isProgrammaticScroll.current) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        const id = getCardAtCenter()
        if (id != null && id !== selectedId) onSelect(id)
      }, 120)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); clearTimeout(timer) }
  }, [getCardAtCenter, selectedId, onSelect])

  // ── Pointer handlers ────────────────────────────────────────────────────────
  // setPointerCapture is deferred until the 4px drag threshold is exceeded so
  // that a plain click on a card button generates its click event normally.

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el) return
    isDragging.current  = true
    wasDragged.current  = false
    dragStartX.current  = e.clientX
    scrollStart.current = el.scrollLeft
    el.style.scrollBehavior = 'auto'
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    const el = containerRef.current
    if (!el) return
    const dx = e.clientX - dragStartX.current
    if (Math.abs(dx) > 4) {
      if (!wasDragged.current) {
        wasDragged.current = true
        el.setPointerCapture(e.pointerId)
        el.style.cursor         = 'grabbing'
        el.style.scrollSnapType = 'none'
      }
      el.scrollLeft = scrollStart.current - dx
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    isDragging.current = false
    const el = containerRef.current
    if (!el) return
    if (wasDragged.current) el.releasePointerCapture(e.pointerId)
    el.style.cursor         = 'grab'
    el.style.scrollBehavior = ''
    el.style.scrollSnapType = 'x mandatory'
    setTimeout(() => { wasDragged.current = false }, 50)
  }

  const handleCardClick = (id: number) => {
    if (!wasDragged.current) onSelect(id)
  }

  return {
    containerRef,
    cardRefs,
    cardWidth,
    handleCardClick,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
