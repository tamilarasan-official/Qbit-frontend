import { cn } from '@/lib/utils'
import { brand } from '@/lib/brand'

type LogoProps = {
  className?: string
  /** Hint the browser to fetch eagerly — use on above-the-fold placements. */
  priority?: boolean
}

/**
 * Full qbitio wordmark.
 *
 * The mark is black letterforms + a lime "io", so it needs a light-ink and a
 * dark-ink cut. Both PNGs are transparent and identically sized; the pair is
 * swapped by the `.dark` class rather than a CSS filter, which would shift the
 * lime off-brand. `className` should set the height only — width stays auto so
 * the aspect ratio survives.
 */
export function BrandWordmark({ className, priority }: LogoProps) {
  const common = cn('w-auto select-none', className)
  return (
    <>
      <img
        src={brand.logo.wordmark}
        alt={brand.displayName}
        className={cn(common, 'logo-light')}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
      <img
        src={brand.logo.wordmarkDark}
        alt=""
        aria-hidden="true"
        className={cn(common, 'logo-dark')}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </>
  )
}

/** Square "Q" glyph, for tight spots: avatars, collapsed rails, loaders. */
export function BrandMark({ className, priority }: LogoProps) {
  const common = cn('w-auto select-none', className)
  return (
    <>
      <img
        src={brand.logo.mark}
        alt={brand.displayName}
        className={cn(common, 'logo-light')}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
      <img
        src={brand.logo.markDark}
        alt=""
        aria-hidden="true"
        className={cn(common, 'logo-dark')}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </>
  )
}

/**
 * The "Q" on a lime plate — a self-contained badge that reads on any surface,
 * unlike the bare glyph which needs the theme to supply contrast.
 */
export function BrandBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-2xl bg-brand-400 p-1.5',
        className,
      )}
    >
      <img
        src={brand.logo.mark}
        alt={brand.displayName}
        className="h-full w-auto select-none"
        decoding="async"
      />
    </span>
  )
}
