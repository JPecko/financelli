import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MobileChromeContainerProps {
  children: ReactNode
  visible: boolean
  placement: 'top' | 'bottom'
}

export default function MobileChromeContainer({
  children,
  visible,
  placement,
}: MobileChromeContainerProps) {
  return (
    <div
      className={cn(
        'mobile-chrome',
        placement === 'top'
          ? 'mobile-chrome-top relative z-30 bg-sidebar'
          : 'mobile-chrome-bottom relative z-30 bg-sidebar',
        visible ? 'mobile-chrome-visible' : 'mobile-chrome-hidden',
      )}
    >
      {children}
    </div>
  )
}
