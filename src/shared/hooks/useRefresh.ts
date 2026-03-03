import { useState, useEffect } from 'react'

const REFRESH_EVENT = 'finance:refresh'

/** Broadcast a global refresh to all data hooks */
export function emitRefresh() {
  window.dispatchEvent(new Event(REFRESH_EVENT))
}

/** Returns an ever-incrementing key that changes on every emitRefresh() */
export function useRefresh(): number {
  const [key, setKey] = useState(0)

  useEffect(() => {
    const handler = () => setKey(k => k + 1)
    window.addEventListener(REFRESH_EVENT, handler)
    return () => window.removeEventListener(REFRESH_EVENT, handler)
  }, [])

  return key
}
