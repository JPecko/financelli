import { useState, useEffect } from 'react'
import { Wallet, Banknote, PiggyBank, BarChart2, HandCoins, CreditCard } from 'lucide-react'
import { bankLogoUrl } from '@/shared/config/banks'

const TYPE_ICONS: Record<string, React.ElementType> = {
  checking:   Banknote,
  savings:    PiggyBank,
  investment: BarChart2,
  cash:       HandCoins,
  credit:     CreditCard,
}

// Module-level blob cache: domain → blob URL or 'failed'
// Persists for the app lifetime — zero network requests after first load
const logoCache = new Map<string, string | 'failed'>()

export default function BankLogo({ domain, name, accountType, imgClassName, iconClassName }: {
  domain: string; name: string; accountType: string
  imgClassName?: string; iconClassName?: string
}) {
  const [src, setSrc] = useState<string | 'failed' | null>(() => logoCache.get(domain) ?? null)
  const Icon = TYPE_ICONS[accountType] ?? Wallet

  useEffect(() => {
    if (logoCache.has(domain)) return
    fetch(bankLogoUrl(domain))
      .then(res => { if (!res.ok) throw new Error('not ok'); return res.blob() })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob)
        logoCache.set(domain, blobUrl)
        setSrc(blobUrl)
      })
      .catch(() => {
        logoCache.set(domain, 'failed')
        setSrc('failed')
      })
  }, [domain])

  if (src === 'failed') return <Icon className={iconClassName ?? 'h-4 w-4 shrink-0 text-muted-foreground'} />
  if (!src) return <span className="h-4 w-4 shrink-0" />
  return <img src={src} alt={name} className={imgClassName ?? 'h-4 w-4 rounded-sm object-contain shrink-0'} />
}
