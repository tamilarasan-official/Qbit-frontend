import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { BoardBackdrop } from '@/components/brand/BoardBackdrop'
import { brand } from '@/lib/brand'

/**
 * Figtree is the marketing site's typeface (qbitio.com) -- the portal now shares
 * it so the two read as one product. Geist Mono stays for figures: scores,
 * points, quiz codes and register numbers line up in tables only if the digits
 * are tabular.
 */
const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: {
    default: brand.displayName,
    template: `%s · ${brand.displayName}`,
  },
  description: `${brand.displayName} — ${brand.tagline}`,
  applicationName: brand.displayName,
  // Icons come from the file conventions: app/icon.png and app/apple-icon.png.
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${figtree.variable} ${GeistMono.variable}`}>
      <head>
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#FFFAF5" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121111" />
      </head>
      <body>
        <ThemeProvider>
          {/*
            Sits behind every page: the board motif plus the site's lime bloom.
            Mounted here rather than per-page so a route added later cannot
            forget it, and so it does not repaint on navigation.
          */}
          <BoardBackdrop />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
