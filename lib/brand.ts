/**
 * qbitio brand configuration.
 *
 * Single source of truth for the white-labelled product identity. Anything that
 * renders the product name, tagline or logo should read from here rather than
 * hard-coding a string, so a future re-brand is a one-file change.
 *
 * Palette: the qbitio mark is black + white + a single signature lime
 * (#D5FF00). Lime is an *accent* colour — it is bright enough that it only
 * works as a surface (with black on top) or as text on a dark background. The
 * `brand` scale in `tailwind.config.ts` mirrors these values; shades 700+ are
 * the readable olive tones for lime-flavoured text on light surfaces.
 */

export const brand = {
  /** Product name as it appears in UI copy. Lower-case is intentional — it matches the wordmark. */
  name: 'qbitio',
  /** Used where the name starts a sentence or stands alone as a title. */
  displayName: 'qbitio',
  tagline: 'Learn. Practice. Level up.',
  /** Short descriptor that sits under the wordmark in tight chrome. */
  subtitle: 'Learning Platform',
  shortDescription: 'qbitio learning platform',
  /** Institutional co-brand shown on the login hero. */
  partner: 'Apollo Engineering College',

  logo: {
    /** Full wordmark, black letterforms + lime "io". Transparent background. */
    wordmark: '/qbitio-logo.png',
    /** Same wordmark with white letterforms, for dark surfaces. */
    wordmarkDark: '/qbitio-logo-dark.png',
    /** Square "Q" glyph, black. */
    mark: '/qbitio-mark.png',
    /** Square "Q" glyph, white. */
    markDark: '/qbitio-mark-dark.png',
  },
} as const

/** The signature lime, as hex — for canvas, charts, meta tags and inline SVG. */
export const BRAND_LIME = '#D5FF00'
/** The ink black used alongside it. */
export const BRAND_INK = '#0A0A0A'

export type Brand = typeof brand
