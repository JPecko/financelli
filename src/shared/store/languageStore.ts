import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Language = 'en' | 'pt'

interface LanguageStore {
  lang: Language
  setLang: (l: Language) => void
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'finance-lang' },
  ),
)
