import { useId } from 'react'
import { cn } from '@/lib/utils'

type BrandLogoVariant = 'mark' | 'wordmark'

interface BrandLogoProps {
  variant?: BrandLogoVariant
  className?: string
  title?: string
}

function BrandMark({ idPrefix }: { idPrefix: string }) {
  const gradMain = `${idPrefix}-brand-main`
  const gradArrow = `${idPrefix}-brand-arrow`

  return (
    <>
      <defs>
        <linearGradient id={gradMain} x1="8" y1="12" x2="52" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7CE69A" />
          <stop offset="1" stopColor="#19C768" />
        </linearGradient>
        <linearGradient id={gradArrow} x1="10" y1="46" x2="52" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5BE08E" />
          <stop offset="1" stopColor="#7DE7A3" />
        </linearGradient>
      </defs>

      <path
        d="M8 16a4 4 0 0 1 4-4h30c3.7 0 5.5 4.5 2.8 7.1L36 28H25.8v8L8 47.2V16Z"
        fill={`url(#${gradMain})`}
      />
      <path
        d="M8 51.5 20.5 46v16.8L11.6 67a2.4 2.4 0 0 1-3.6-2.1V51.5Z"
        fill={`url(#${gradMain})`}
      />
      <path d="M24 44.5 36.5 39v22L24 66.5v-22Z" fill={`url(#${gradMain})`} />
      <path
        d="M39.5 37.7 52 32v22.5c0 1.2-.7 2.2-1.8 2.7L39.5 62V37.7Z"
        fill={`url(#${gradMain})`}
      />
      <path
        d="M6.8 45.8C20.4 39.8 31.8 31.4 47.8 13.2"
        stroke={`url(#${gradArrow})`}
        strokeWidth="4.8"
        strokeLinecap="round"
      />
      <path
        d="m43.5 13.4 11-2.6-2.7 11"
        stroke={`url(#${gradArrow})`}
        strokeWidth="4.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  )
}

export default function BrandLogo({
  variant = 'wordmark',
  className,
  title = 'Financelli',
}: BrandLogoProps) {
  const idPrefix = useId().replace(/:/g, '')

  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 64 72"
        role="img"
        aria-label={title}
        className={cn('h-8 w-8', className)}
      >
        <BrandMark idPrefix={idPrefix} />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 442 72"
      role="img"
      aria-label={title}
      className={cn('h-8 w-auto', className)}
    >
      <g transform="translate(2 0)">
        <BrandMark idPrefix={idPrefix} />
      </g>
      <text
        x="86"
        y="49"
        fill="currentColor"
        fontSize="56"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontWeight="700"
        letterSpacing="-1"
      >
        Financelli
      </text>
    </svg>
  )
}

