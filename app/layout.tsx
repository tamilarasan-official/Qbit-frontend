import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { brand } from '@/lib/brand'

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
    <html lang="en">
      <head>
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0A0A0A" />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
