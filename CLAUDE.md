# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

qbitio is a Next.js 15 educational platform that provides quiz functionality, learning resources, and student management. The app uses Supabase for authentication and database, with role-based access control (admin, mentor, student).

## Development Commands

```bash
# Install dependencies (note: README has typo "num install", use npm)
npm install

# Run development server
npm run dev

# Build for production
next build

# Start production server
npm start

# Lint code
npm run lint
```

The development server runs at `http://localhost:3000`.

## Tech Stack

- **Framework**: Next.js 15 (App Router with React 18)
- **Authentication**: Supabase Auth with SSR support
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Forms**: React Hook Form with Zod validation
- **TypeScript**: Strict mode enabled

## Architecture

### Authentication Flow

The app uses Supabase SSR authentication with three key utility files:

1. **`utils/supabase/client.ts`**: Client-side Supabase client for use in Client Components
2. **`utils/supabase/server.ts`**: Server-side Supabase client for Server Components and API routes
3. **`utils/supabase/middleware.ts`**: Session management and auth protection

**Middleware** (`middleware.ts`): Protects all routes except `/login`, `/auth/*`, and `/error`. Unauthenticated users are redirected to `/login`.

**Auth callback** (`app/auth/callback/route.ts`): Handles OAuth callbacks and role-based redirects:
- Admin → `/admin/dashboard`
- Mentor → `/mentor/dashboard`
- Student → `/student/dashboard`

### Route Structure

- **`/`**: Main platform UI with Home and Apps tabs
- **`/quiz`**: Quiz code entry page
- **`/quiz/[quizCode]`**: Dynamic quiz page based on code
- **`/login`**: Authentication page
- **`/private`**: Example protected page
- **`/settings`**: User settings with multiple tabs (Profile, Security, Notifications, Billing, Preferences)
- **Other routes**: `/leaderboard`, `/lessons`, `/resources`, `/projects`, `/videos`, `/community`, `/discussion`, `/qna`, `/exercises`, `/assignment`, `/progress`, `/feedback`, `/editor`, `/announcement`

### Component Architecture

**Main Platform Component** (`components/platform/platform.tsx`):
- Uses tab-based navigation with URL hash routing
- Manages sidebar state (desktop/mobile)
- Integrates Header and Sidebar components
- Current tabs: Home, Apps (with placeholders for Files, Projects, Learn)

**Sidebar** (`components/sidebar.tsx`):
- Responsive design with separate mobile/desktop versions
- Fetches user data from Supabase on mount
- Navigation sections: Overview, Learn
- Displays user profile with avatar

**UI Components** (`components/ui/`):
- shadcn/ui based component library (59 components)
- Radix UI primitives for accessibility

### Path Aliases

The project uses `@/*` to import from the root directory:
```typescript
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
```

## Supabase Integration

### Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

### Database Schema
The app expects a `profiles` table with at minimum:
- `id` (references auth.users)
- `role` (admin | mentor | student)

### Client Usage Patterns

**Server Components**:
```typescript
import { createClient } from '@/utils/supabase/server'

const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

**Client Components**:
```typescript
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
```

## Styling Approach

- Utility-first with Tailwind CSS
- Custom theme configuration in `tailwind.config.ts`
- Global styles in `app/globals.css`
- Geist font family (Sans and Mono) configured in root layout
- Rounded corners (rounded-xl, rounded-2xl, rounded-3xl) used throughout for modern UI
- Framer Motion for page transitions and animations

### Brand (qbitio)

The product is white-labelled as **qbitio**: black, white and one signature lime
(`#D5FF00`). Identity strings and logo paths live in `lib/brand.ts` — render the
name from there rather than hard-coding it. Logos are exposed through
`components/brand/Logo.tsx` (`BrandWordmark`, `BrandMark`, `BrandBadge`), which
swaps a light-ink and a dark-ink PNG by theme.

The `brand-*` Tailwind scale is the lime ramp. **Lime is a surface colour, not a
text colour** — it is far too bright to read on white:

| Use | Reach for |
|---|---|
| Surfaces: buttons, badges, active states, gradient stops | `brand-300`/`brand-400` — always with **black** type (`text-black`) |
| Tints and washes | `brand-50` … `brand-200` |
| Lime-flavoured *text* on a light surface | `brand-700` / `brand-800` (readable olive) |
| Lime-flavoured *text* on a dark surface | `brand-300` / `brand-400` under a `dark:` variant |
| `bg-clip-text` gradient headings | `from-neutral-900 to-brand-700`, `dark:from-white dark:to-brand-400` |

Semantic colours are deliberately *not* lime and should stay that way: success
green, error red, warning amber, the rank ladder in `lib/ranks.ts`, and the
app-grid icon palette in `lib/dummydata.tsx`.

Theme tokens in `app/globals.css` resolve `--primary` differently per theme so
`text-primary` stays legible everywhere: black in light, lime in dark, deep
olive in reading. `--brand` is the raw lime in all three.

## Key Patterns

1. **Client Components**: Most interactive UI uses `'use client'` directive due to state management, animations, and form handling
2. **Server Components**: Used for auth checks and initial data fetching (see `/private/page.tsx`)
3. **Tab Navigation**: URL hash-based routing for main platform tabs
4. **Responsive Design**: Mobile-first with separate mobile menu and sidebar states
5. **Type Safety**: TypeScript with strict mode, no implicit any

## Known Issues / TODOs

From `README.md`:
1. Implement Google Login/Signup
2. Create Row Level Security (RLS) policies on Supabase
3. Add Leaderboard icon in Header showcasing points of user and on click will go to /leaderboard page

## Development Notes

- The app root (`/`) redirects to the Platform component, not a traditional landing page
- Quiz functionality is minimal (just code entry and display)
- Many route directories exist but may have minimal implementation
- `lib/dummydata.tsx` contains sample data for apps and UI elements
- The platform uses extensive Lucide React icons throughout
