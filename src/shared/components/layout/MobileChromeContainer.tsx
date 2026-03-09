import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { TopbarState } from '@/shared/hooks/useMobileChromeVisibility'

interface MobileChromeContainerProps {
  children: ReactNode
  placement: 'top' | 'bottom'
  topbarState?: TopbarState
}

export default function MobileChromeContainer({
  children,
  placement,
  topbarState = 'in-flow',
}: MobileChromeContainerProps) {
  if (placement === 'bottom') {
    return (
      <div className="mobile-chrome mobile-chrome-bottom mobile-chrome-visible relative z-30 bg-sidebar">
        {children}
      </div>
    )
  }

  // Floating: fixed overlay that slides in from top, no flex space taken
  if (topbarState === 'floating') {
    return (
      <div className="mobile-chrome-floating fixed inset-x-0 top-0 z-50 bg-sidebar">
        {children}
      </div>
    )
  }

  // in-flow or hidden: normal flex item (takes/releases space)
  return (
    <div
      className={cn(
        'mobile-chrome mobile-chrome-top relative z-30 bg-sidebar',
        topbarState === 'in-flow' ? 'mobile-chrome-visible' : 'mobile-chrome-hidden',
      )}
    >
      {children}
    </div>
  )
}
