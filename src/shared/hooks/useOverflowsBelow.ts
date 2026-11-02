import { useLayoutEffect, useRef, useState } from 'react'

/** True while the closest `scrollerSelector` ancestor of `ref` has content hidden below its visible area. */
export function useOverflowsBelow<T extends HTMLElement>(scrollerSelector: string) {
  const ref = useRef<T>(null)
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    const scroller = ref.current?.closest<HTMLElement>(scrollerSelector)
    if (!scroller) return
    const update = () => setOverflows(scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight > 1)

    // Scroll height changes when children resize; ResizeObserver also fires once on observe
    const resize = new ResizeObserver(update)
    const observeAll = () => {
      resize.disconnect()
      resize.observe(scroller)
      for (const child of Array.from(scroller.children)) resize.observe(child)
    }
    observeAll()
    // Tab switches replace the scroller's children
    const mutations = new MutationObserver(observeAll)
    mutations.observe(scroller, { childList: true })
    scroller.addEventListener('scroll', update, { passive: true })

    return () => {
      resize.disconnect()
      mutations.disconnect()
      scroller.removeEventListener('scroll', update)
    }
  }, [scrollerSelector])

  return { ref, overflows }
}
