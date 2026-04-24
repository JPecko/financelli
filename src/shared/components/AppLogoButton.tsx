import { cn } from '@/lib/utils'
import { APP_VERSION } from '@/version'
import { useLogoClick } from '@/shared/hooks/useLogoClick'

interface AppLogoButtonProps {
  height?: string
  showVersion?: boolean
  navigateTo?: string | false
  className?: string
  /** Force the dark-background logo variant regardless of theme (e.g. inside dark sidebars in light mode) */
  forceDark?: boolean
}

export default function AppLogoButton({
  height = 'h-10',
  showVersion = false,
  navigateTo = '/dashboard',
  className,
  forceDark = false,
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
      <img
        src="/financelli-logo-light.svg"
        alt="Financelli"
        className={cn(height, forceDark ? 'hidden' : 'dark:hidden')}
      />
      <img
        src="/financelli-logo-dark.svg"
        alt="Financelli"
        className={cn(height, forceDark ? '' : 'hidden dark:block')}
      />
      {showVersion && (
        <span className={cn(
          'text-[10px] ml-1 pb-0.5',
          forceDark ? 'text-white/30' : 'text-muted-foreground/60',
        )}>{APP_VERSION}</span>
      )}
    </button>
  )
}
