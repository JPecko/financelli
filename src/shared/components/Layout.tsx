import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAccountPrefsStore } from '@/shared/store/accountPrefsStore'
import BottomNav from '@/shared/components/layout/BottomNav'
import MobileHeader from '@/shared/components/layout/MobileHeader'
import { useTopbarState } from '@/shared/hooks/useMobileChromeVisibility'

export default function Layout() {
  const load = useAccountPrefsStore(s => s.load)
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement | null>(null)
  const topbarState = useTopbarState({ pathname, scrollerRef: mainRef })

  useEffect(() => { void load() }, [load])

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-background">
      <Sidebar />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <main
          ref={mainRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Topbar in-flow: scrolls away naturally with page content */}
          <div className="lg:hidden">
            <MobileHeader />
          </div>

          <Outlet />
        </main>

        {/* Bottom nav: always visible */}
        <BottomNav />
      </div>

      {/* Safe-area cap: fixed, always covers status-bar area when topbar has scrolled away */}
      <div className="mobile-safe-area-cap" aria-hidden="true" />

      {/* Floating topbar: appears when user scrolls up significantly mid-page */}
      {topbarState === 'floating' && (
        <div className="mobile-chrome-floating fixed inset-x-0 top-0 z-50 lg:hidden bg-sidebar">
          <MobileHeader />
        </div>
      )}
    </div>
  )
}
