import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

const THEME_COLOR: Record<Theme, string> = { light: '#ffffff', dark: '#000000' }

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  // Keeps the browser/Android system bar matching the app chrome
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggle: () => {
        const next: Theme = get().theme === 'light' ? 'dark' : 'light'
        applyTheme(next)
        set({ theme: next })
      },
      setTheme: (t: Theme) => { applyTheme(t); set({ theme: t }) },
    }),
    {
      name: 'finance-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)
