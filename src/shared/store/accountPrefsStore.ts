import { create } from 'zustand'
import { profilesRepo } from '@/data/repositories/profilesRepo'

export type SortKey = 'default' | 'name' | 'type' | 'color' | 'balance' | 'manual'

interface AccountPrefsState {
  sort:        SortKey
  manualOrder: number[]
  colorOrder:  string[]
  loaded:      boolean
  load:            () => Promise<void>
  setSort:         (sort: SortKey) => void
  setManualOrder:  (order: number[]) => void
  setColorOrder:   (colors: string[]) => void
}

export const useAccountPrefsStore = create<AccountPrefsState>()((set, get) => ({
  sort:        'default',
  manualOrder: [],
  colorOrder:  [],
  loaded:      false,

  load: async () => {
    if (get().loaded) return
    const prefs = await profilesRepo.getPrefs()
    set({
      sort:        prefs.sort as SortKey,
      manualOrder: prefs.manualOrder,
      colorOrder:  prefs.colorOrder,
      loaded:      true,
    })
  },

  setSort:        (sort)        => { set({ sort });        void profilesRepo.savePrefs({ sort }) },
  setManualOrder: (manualOrder) => { set({ manualOrder }); void profilesRepo.savePrefs({ manualOrder }) },
  setColorOrder:  (colorOrder)  => { set({ colorOrder });  void profilesRepo.savePrefs({ colorOrder }) },
}))
