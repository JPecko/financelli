import { enUS, pt } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import type { Language } from '@/shared/store/languageStore'

const LOCALES: Record<Language, Locale> = { en: enUS, pt }

export function getDateFnsLocale(lang: Language): Locale {
  return LOCALES[lang]
}
