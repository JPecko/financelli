// Superseded by useVersionCheck — kept only for MobileHeader/Sidebar click handler
import { APP_VERSION } from '@/version'

export async function hasAppUpdate(): Promise<boolean> {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' })
    if (!res.ok) return false
    const data = await res.json() as { version?: string }
    if (!data.version) return false
    const normalize = (v: string) => v.replace(/^v/, '').trim()
    return normalize(data.version) !== normalize(APP_VERSION)
  } catch {
    return false
  }
}
