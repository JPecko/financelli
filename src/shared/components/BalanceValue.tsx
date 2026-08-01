import { usePrivacyStore } from '@/shared/store/privacyStore'
import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  className?: string
}

/** Wraps a money value so it blurs when the user has enabled privacy mode. */
export default function BalanceValue({ children, className }: Props) {
  const hideBalances = usePrivacyStore(s => s.hideBalances)
  return (
    <span className={cn(hideBalances && 'blur-sm select-none', className)}>
      {children}
    </span>
  )
}
