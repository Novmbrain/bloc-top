# Project Index: 罗源野抱 TOPO PWA

Generated: 2026-01-30 (updated)

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── not-found.tsx                 # 404 page
│   ├── sw.ts                         # Service Worker (Serwist)
│   ├── globals.css                   # Global styles + theme variables
│   ├── [locale]/                     # i18n routes (zh/en/fr)
│   │   ├── layout.tsx                # Locale layout
│   │   ├── page.tsx                  # Homepage - crag list (SSR)
│   │   ├── home-client.tsx           # Homepage client component
│   │   ├── crag/[id]/               # Crag detail page
│   │   │   ├── page.tsx             # Server component
│   │   │   └── crag-detail-client.tsx # Client component
│   │   ├── route/                    # Route detail page
│   │   │   ├── page.tsx             # Server component
│   │   │   └── route-client.tsx     # Client component
│   │   ├── editor/                   # Editor pages (topo annotation)
│   │   │   ├── page.tsx             # Editor home
│   │   │   ├── faces/page.tsx       # Face management
│   │   │   └── routes/page.tsx      # Route annotation
│   │   ├── profile/page.tsx         # User profile
│   │   └── offline/                 # Offline fallback pages
│   │       ├── page.tsx
│   │       ├── crag/[id]/page.tsx
│   │       └── route/[id]/page.tsx
│   └── api/                          # API Routes
│       ├── beta/route.ts             # Beta video CRUD
│       ├── crags/route.ts            # GET all crags
│       ├── crags/[id]/routes/route.ts # GET crag routes
│       ├── faces/route.ts            # GET R2 face listing
│       ├── routes/[id]/route.ts      # GET/PATCH route
│       ├── upload/route.ts           # POST topo image to R2
│       ├── weather/route.ts          # GET weather data
│       ├── geo/route.ts              # IP geolocation
│       ├── feedback/route.ts         # User feedback
│       ├── log/route.ts              # Client error reporting
│       ├── visit/route.ts            # Visit tracking
│       └── revalidate/route.ts       # ISR revalidation
├── components/
│   ├── ui/                           # shadcn/ui primitives
│   │   ├── button.tsx, skeleton.tsx, toast.tsx
│   │   ├── drawer.tsx               # Swipe-to-dismiss drawer
│   │   ├── image-viewer.tsx         # Pinch-zoom image viewer
│   │   └── segmented-control.tsx    # Tab-like segmented control
│   ├── editor/                       # Editor-specific components
│   │   ├── fullscreen-topo-editor.tsx # SVG topo line editor
│   │   ├── crag-selector.tsx        # Editor crag selector
│   │   ├── progress-ring.tsx        # Circular progress indicator
│   │   └── route-card.tsx           # Editor route card
│   ├── crag-card.tsx                # Crag list card
│   ├── app-tabbar.tsx               # Bottom navigation (glass morphism)
│   ├── filter-chip.tsx              # Single/multi select filter chip
│   ├── filter-drawer.tsx            # Filter panel drawer
│   ├── route-detail-drawer.tsx      # Route detail (multi-route switch)
│   ├── topo-line-overlay.tsx        # SVG topo line (single route)
│   ├── multi-topo-line-overlay.tsx  # SVG topo lines (shared face)
│   ├── beta-list-drawer.tsx         # Beta video list
│   ├── beta-submit-drawer.tsx       # Beta video submission
│   ├── search-overlay.tsx           # Search overlay
│   ├── search-drawer.tsx            # Search drawer
│   ├── floating-search.tsx          # Floating search button
│   ├── amap-container.tsx           # AMap container
│   ├── weather-strip.tsx            # Homepage weather bar
│   ├── weather-badge.tsx            # Card weather badge
│   ├── weather-card.tsx             # Detail weather card
│   ├── city-selector.tsx            # City dropdown selector
│   ├── empty-city.tsx               # Empty city state
│   ├── theme-provider.tsx           # next-themes provider
│   ├── theme-switcher.tsx           # Theme toggle
│   ├── locale-switcher.tsx          # Language switcher
│   ├── install-prompt.tsx           # PWA install prompt
│   ├── sw-update-prompt.tsx         # SW update prompt
│   ├── offline-indicator.tsx        # Offline banner
│   ├── offline-cache-manager.tsx    # Offline cache manager
│   ├── offline-download-provider.tsx # Offline download context
│   └── download-button.tsx          # Download for offline button
├── hooks/
│   ├── use-route-search.ts          # Route search logic
│   ├── use-city-selection.ts        # City selection (localStorage + IP)
│   ├── use-crag-routes.ts           # Crag & routes data fetching
│   ├── use-delayed-loading.ts       # Delayed skeleton loading
│   ├── use-climber-body-data.ts     # Climber body measurements
│   ├── use-locale-preference.ts     # Locale preference
│   ├── use-offline-download.ts      # Offline download management
│   └── use-offline-mode.ts          # Offline mode detection
├── lib/
│   ├── utils.ts                     # cn() utility
│   ├── tokens.ts                    # Design tokens
│   ├── constants.ts                 # App constants (R2 URLs, etc.)
│   ├── grade-utils.ts               # V-grade utilities
│   ├── filter-constants.ts          # Filter config (grades, URL params)
│   ├── beta-constants.ts            # Beta platform config
│   ├── cache-config.ts              # Unified cache TTL config
│   ├── rate-limit.ts                # In-memory rate limiting
│   ├── city-config.ts               # City config (adcode, coords)
│   ├── weather-constants.ts         # Weather icons, thresholds
│   ├── weather-utils.ts             # Climbing suitability scoring
│   ├── crag-theme.ts                # Per-crag theme colors
│   ├── api-error-codes.ts           # API error code constants
│   ├── topo-constants.ts            # Topo editor constants
│   ├── topo-utils.ts                # Topo coordinate utilities
│   ├── editor-utils.ts              # Editor helper utilities
│   ├── offline-storage.ts           # IndexedDB offline storage
│   ├── logger.ts                    # Server-side logger
│   ├── client-logger.ts             # Client-side logger
│   ├── mongodb.ts                   # MongoDB connection
│   ├── db/index.ts                  # Data access layer
│   └── themes/                      # Theme system
│       ├── index.ts                 # Theme types & utils
│       ├── light.ts                 # Light theme (Dracula Light)
│       └── dark.ts                  # Dark theme (Dracula)
├── i18n/
│   ├── navigation.ts               # next-intl navigation
│   ├── request.ts                   # next-intl request config
│   └── routing.ts                   # i18n routing config
├── types/index.ts                   # TypeScript type definitions
├── middleware.ts                     # Next.js middleware (i18n)
└── test/
    ├── setup.tsx                    # Vitest global setup
    └── utils.tsx                    # Test helpers

messages/                             # i18n translation files
├── zh.json, en.json, fr.json

scripts/
├── seed.ts                          # DB migration (dev)
├── seed-beta.ts                     # Beta data seeding
├── copy-db-to-prod.ts              # Copy DB to production
├── backup-to-db.ts                 # Backup to DB
├── check-routes.ts                  # Route data validation
├── migrate-add-cityid.ts           # Add cityId migration
├── migrate-r2-face-keys.ts         # R2 face key migration
├── migrate-r2-face-to-area.ts      # R2 face→area hierarchy migration
└── init-visits.ts                   # Initialize visit counters
```

## 🚀 Entry Points

- **App**: `src/app/[locale]/page.tsx` — Homepage (crag list, SSR + ISR)
- **API**: `src/app/api/` — 12 API routes
- **SW**: `src/app/sw.ts` — Serwist service worker
- **Middleware**: `src/middleware.ts` — i18n locale detection
- **DB seed**: `scripts/seed.ts` — Database migration

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.2 + App Router + ISR |
| Database | MongoDB Atlas (native driver) |
| Styling | Tailwind CSS v4 + shadcn/ui (new-york) |
| Theming | next-themes (Dracula palette) |
| PWA | Serwist (service worker) |
| i18n | next-intl (zh/en/fr) |
| Map | 高德地图 JS API 1.4.15 |
| Storage | Cloudflare R2 (images at img.bouldering.top) |
| Testing | Vitest + Testing Library + Playwright |
| CI/CD | GitHub Actions + Vercel |

## 🔧 Key Configuration

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js config (Turbopack, image domains) |
| `vitest.config.ts` | Vitest test config |
| `playwright-ct.config.ts` | Playwright component test config |
| `components.json` | shadcn/ui config (new-york style) |
| `vercel.json` | Vercel deployment config |
| `.env.local` | Environment variables (MONGODB_URI, AMAP_KEY) |

## 🧪 Tests

- **42 test files** (unit + component + Playwright)
- **Unit tests**: `src/lib/*.test.ts` (19 files)
- **Component tests**: `src/components/*.test.tsx` (15 files)
- **Playwright**: `*.ct.tsx` (2 files)
- **Hook tests**: `src/hooks/*.test.ts` (6 files)
- Coverage: ~34%

## 🔗 Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.1.2 | React framework |
| react | 19.2.3 | UI library |
| mongodb | 7.x | Database driver |
| @serwist/next | 9.5.x | PWA service worker |
| next-intl | 4.7.x | Internationalization |
| next-themes | 0.4.x | Theme switching |
| @aws-sdk/client-s3 | 3.975.x | R2 image storage |
| lucide-react | 0.562.x | Icons |
| pinyin-pro | 3.28.x | Chinese pinyin search |
| react-zoom-pan-pinch | 3.7.x | Image zoom/pan |

## 📝 Quick Start

```bash
nvm use
npm install
cp .env.example .env.local  # Configure MONGODB_URI, AMAP_KEY
npm run dev                  # Turbopack dev server
npm run test                 # Vitest watch mode
npm run build                # Production build
```

## 🏗 Architecture Patterns

- **Data flow**: MongoDB → Server Components (SSR/ISR) → Client Components
- **API routes**: Rate-limited, with unified error codes and logging
- **Theming**: CSS variables (`--theme-*`) controlled by `.dark` class
- **Offline**: IndexedDB storage + R2 image caching (30d, max 200)
- **Editor**: Desktop dual-panel / mobile master-detail navigation
- **Git workflow**: Issue-first → feature branch → PR → CI → merge
