'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * The ATOM-S3 board as a background motif.
 *
 * The product the students are actually learning on, carried through the whole
 * portal so the app reads as one thing with the marketing site rather than a
 * generic dashboard wearing the logo.
 *
 * The art is a keyed cut-out (`public/board-*.webp`): the photo's cream studio
 * backdrop is transparent, which is what lets one asset sit on the cream paper
 * AND on the near-black dark theme. On cream it blends because the photo was
 * lit on the same colour; on ink it reads as the boards floating in the dark.
 *
 * Everything here is decoration, so it is `aria-hidden`, never interactive, and
 * pinned behind the content -- it must be impossible for it to eat a click or
 * be announced to a screen reader.
 */

interface BoardPlateProps {
  /**
   * Which asset to use.
   *
   * `hero` is the full-detail plate for the one surface that shows the art at
   * full strength. `ambient` is a smaller, pre-blurred copy at a third of the
   * bytes -- it loads on every page in the portal, where it is rendered at 6%
   * opacity and no encoder detail could possibly survive. Blurring in the asset
   * rather than with a CSS filter also spares a full-width repaint on scroll.
   */
  art?: 'hero' | 'ambient'
  className?: string
  /** Which way the art dissolves. Named for the direction it fades TOWARDS. */
  mask?: 'radial' | 'fadeLeft' | 'fadeUp'
  /** Loaded eagerly only where the art is the point, e.g. the sign-in panel. */
  priority?: boolean
}

const MASKS: Record<NonNullable<BoardPlateProps['mask']>, string> = {
  // Fades on every edge -- for art that floats inside a panel.
  radial: 'radial-gradient(70% 70% at 50% 45%, #000 42%, transparent 100%)',
  // Solid at the right, dissolving leftwards: art anchored to a right edge.
  fadeLeft: 'linear-gradient(to left, #000 40%, transparent 96%)',
  /**
   * Solid at the bottom, dissolving upwards: art rising from a bottom edge.
   *
   * The art is already a cut-out with no rectangular edge to hide, so this only
   * has to soften the top of the composition where it meets body copy. Fading
   * from too low leaves a visible horizontal seam across the panel.
   */
  fadeUp: 'linear-gradient(to top, #000 58%, transparent 100%)',
}

/**
 * The art itself, positioned by its parent.
 *
 * Deliberately a plain `<img>`: `next/config` sets `images.unoptimized`, so
 * `next/image` would add a wrapper and a layout contract for no benefit on a
 * decorative element whose size is entirely CSS-driven.
 */
export function BoardPlate({
  art = 'ambient',
  className,
  mask = 'radial',
  priority = false,
}: BoardPlateProps) {
  const mask_ = MASKS[mask]

  return (
    <img
      src={art === 'hero' ? '/board-hero.webp' : '/board-ambient.webp'}
      alt=""
      aria-hidden="true"
      draggable={false}
      loading={priority ? 'eager' : 'lazy'}
      // eslint-disable-next-line @next/next/no-img-element
      fetchPriority={priority ? 'high' : 'low'}
      className={cn('pointer-events-none select-none object-contain', className)}
      style={{
        maskImage: mask_,
        WebkitMaskImage: mask_,
      }}
    />
  )
}

/**
 * The portal-wide layer: one quiet board in the corner of every page.
 *
 * Fixed rather than absolute, so it does not scroll away and leave long pages
 * bare halfway down, and kept faint enough that body text over it still meets
 * contrast -- the point is a sense of place, not a picture.
 */
export function BoardBackdrop() {
  const pathname = usePathname()

  // Sign-in composes its own, much bolder board art into the ink panel, and two
  // copies of the same photograph on one screen reads as a mistake.
  if (pathname?.startsWith('/login')) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* The lime bloom the marketing site opens with. */}
      <div
        className="absolute inset-x-0 top-0 h-[38rem]"
        style={{
          backgroundImage:
            'radial-gradient(60rem 26rem at 50% -12rem, hsl(var(--brand) / 0.20), transparent 72%)',
        }}
      />

      <BoardPlate
        art="ambient"
        mask="fadeLeft"
        className={cn(
          'absolute -right-[12%] top-[7rem] w-[52vw] max-w-[46rem] rotate-[-5deg]',
          /**
           * Deliberately at the edge of perception. Pages here are dense with
           * tables and cards, and anything readable as a photograph behind body
           * text costs legibility for decoration. Slightly stronger on ink,
           * where a dark board has less to work with.
           */
          'opacity-[0.07] dark:opacity-[0.10]',
          // Below md the art would sit under the whole content column.
          'hidden lg:block'
        )}
      />
    </div>
  )
}
