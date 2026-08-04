import type { Config } from 'tailwindcss'

// all in fixtures is set to tailwind v3 as interims solutions

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './contexts/**/*.{js,ts,jsx,tsx,mdx}',
    '*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Figtree (the marketing site's face) with the mono reserved for figures.
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        // qbitio signature lime. 400 is the logo colour as the site ships it
        // (#D9FF03); it is only legible as a surface (put ink on it) or as text
        // on dark. 700+ are the olive tones that stay readable on cream.
        brand: {
          50: '#FBFFE8',
          100: '#F4FFC2',
          200: '#EBFF8A',
          300: '#E2FF4D',
          400: '#D9FF03',
          500: '#C2E600',
          600: '#9BBA00',
          700: '#6E8200',
          800: '#4E5C00',
          900: '#373F00',
          950: '#1E2200',
          DEFAULT: '#D9FF03',
        },
        // The site's warm neutrals, for the places that want the literal paper
        // and ink rather than a semantic token.
        paper: '#FFFAF5',
        ink: '#121111',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
      },
      boxShadow: {
        // Warm shadows: a neutral-grey drop shadow turns cream muddy.
        soft: '0 1px 2px hsl(20 14% 4% / 0.04), 0 8px 24px -16px hsl(20 14% 4% / 0.2)',
        lifted: '0 1px 2px hsl(20 14% 4% / 0.04), 0 18px 40px -24px hsl(20 14% 4% / 0.3)',
        lime: '0 8px 24px -10px hsl(68 100% 45% / 0.5)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        slideIn: {
          from: {
            transform: 'translateX(100%)',
            opacity: '0',
          },
          to: {
            transform: 'translateX(0)',
            opacity: '1',
          },
        },
        scaleIn: {
          from: {
            transform: 'scale(0.9)',
            opacity: '0',
          },
          to: {
            transform: 'scale(1)',
            opacity: '1',
          },
        },
        scan: {
          '0%': {
            transform: 'translateY(0)',
          },
          '100%': {
            transform: 'translateY(100%)',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        slideIn: 'slideIn 0.3s ease-out',
        scaleIn: 'scaleIn 0.3s ease-out',
        scan: 'scan 2s ease-in-out infinite',
      },
    },
  },
  // The `reading` variant went with the reading theme.
  plugins: [require('tailwindcss-animate')],
}
export default config
