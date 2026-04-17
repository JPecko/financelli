import { cn } from '@/lib/utils'
import { APP_VERSION } from '@/version'
import { useLogoClick } from '@/shared/hooks/useLogoClick'

interface AppLogoButtonProps {
  height?: string
  showVersion?: boolean
  navigateTo?: string | false
  className?: string
}

export default function AppLogoButton({
  height = 'h-10',
  showVersion = false,
  navigateTo = '/dashboard',
  className,
}: AppLogoButtonProps) {
  const handleClick = useLogoClick({ navigateTo })

  return (
    <button
      type="button"
      onClick={() => { void handleClick() }}
      className={cn('flex items-end cursor-pointer', className)}
      aria-label="Check app updates"
      title="Check app updates"
    >
      <img src="/financelli-logo-light.svg" alt="Financelli" className={cn(height, 'dark:hidden')} />
      <img src="/financelli-logo-dark.svg" alt="Financelli" className={cn(height, 'hidden dark:block')} />
      {showVersion && (
        <span className="text-[10px] text-muted-foreground/60 ml-1 pb-0.5">{APP_VERSION}</span>
      )}
    </button>
  )
}
