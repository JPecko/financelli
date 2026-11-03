import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MOBILE_NAV_DEFAULT_ORDER } from '@/shared/config/mobileNav'

interface MobileNavStore {
  order: string[]
  setOrder: (order: string[]) => void
  reset: () => void
}

// Per device: the order only matters for the mobile bottom bar of this device
export const useMobileNavStore = create<MobileNavStore>()(
  persist(
    set => ({
      order:    MOBILE_NAV_DEFAULT_ORDER,
      setOrder: order => set({ order }),
      reset:    () => set({ order: MOBILE_NAV_DEFAULT_ORDER }),
    }),
    { name: 'finance-mobile-nav' },
  ),
)
