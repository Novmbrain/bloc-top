# 寻岩记 (BlocTop) — iOS App PRD

> Product Requirements Document for migrating PWA user-facing features to native iOS.
> Generated from PWA codebase analysis. Editor features excluded (remains as standalone web app).

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Roles & Authentication](#2-user-roles--authentication)
3. [Data Model](#3-data-model)
4. [Feature Modules](#4-feature-modules)
   - 4.1 [Home — Crag Discovery](#41-home--crag-discovery)
   - 4.2 [Crag Detail](#42-crag-detail)
   - 4.3 [Route Browsing & Filtering](#43-route-browsing--filtering)
   - 4.4 [Route Detail & Topo Viewer](#44-route-detail--topo-viewer)
   - 4.5 [Beta Video System](#45-beta-video-system)
   - 4.6 [Search](#46-search)
   - 4.7 [Weather & Climbing Conditions](#47-weather--climbing-conditions)
   - 4.8 [Map & Navigation](#48-map--navigation)
   - 4.9 [Offline Mode](#49-offline-mode)
   - 4.10 [User Profile & Settings](#410-user-profile--settings)
   - 4.11 [Onboarding & App Info](#411-onboarding--app-info)
5. [Internationalization (i18n)](#5-internationalization-i18n)
6. [Design System](#6-design-system)
7. [API Endpoints Reference](#7-api-endpoints-reference)
8. [Business Logic & Algorithms](#8-business-logic--algorithms)
9. [Caching Strategy](#9-caching-strategy)
10. [Error Handling](#10-error-handling)

---

## 1. Product Overview

**App Name**: 寻岩记 (BlocTop)
**Tagline**: 攀岩线路分享平台 — Climbing Route Sharing Platform
**Target Users**: Boulder climbers in China (expandable internationally)
**Core Value**: Discover crags → Browse routes with topo images → Watch beta videos → Save for offline climbing

### Core User Journey

```
选择城市 → 浏览岩场列表 → 查看岩场详情 (天气/地图/介绍)
    → 浏览线路列表 (筛选/排序) → 查看线路详情 (Topo图/Beta视频)
    → 下载离线数据 → 户外攀岩时离线查看
```

### Key Metrics (PWA Existing)

| Metric | Description |
|--------|-------------|
| Page views | Visit tracking via `/api/visit` |
| Offline downloads | Crag download initiation rate |
| Beta submissions | User-contributed video links |
| Auth completion | Login success rate |
| Search usage | Query volume |

---

## 2. User Roles & Authentication

### 2.1 Authentication Methods

| Method | Description | Flow |
|--------|-------------|------|
| **Magic Link** | Passwordless email login | Enter email → Receive link → Click to verify → Logged in |
| **Password** | Traditional email + password | Enter credentials → Submit → Logged in |
| **Passkey/WebAuthn** | Biometric (Face ID / Touch ID) | Tap "Sign in with Passkey" → Biometric prompt → Logged in |

**Post-Login Redirect**: Supports `callbackURL` parameter to return user to the page they were on before login.

**Passkey Enrollment**: After first login (if no passkey registered), prompt user to set up biometric login. User can "Skip for now".

### 2.2 User Roles

| Role | Permissions |
|------|------------|
| `user` (default) | Browse, search, download offline, submit beta videos |
| `admin` | All user permissions + create/delete crags, manage users, manage permissions |
| `manager` (per-crag) | Edit specific crag's info/routes/faces/betas (assigned by admin) |

### 2.3 Permission Functions

```
canCreateCrag(role)              → admin only
canEditCrag(userId, cragId, role) → admin OR manager of that crag
canManagePermissions(...)         → admin only
canAccessEditor(...)              → admin OR manager of any crag
```

> Note: The iOS app only needs `user` role features. Admin/manager operations remain on the Editor web app.

---

## 3. Data Model

### 3.1 Core Types

#### Route (线路/Boulder Problem)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | ✅ | Unique numeric ID |
| `name` | string | ✅ | Route name |
| `grade` | string | ✅ | V0-V13 or "？" (Hueco V-Scale) |
| `cragId` | string | ✅ | Parent crag slug (e.g., "yuan-tong-si") |
| `area` | string | ✅ | Sub-area within crag |
| `faceId` | string | | Rock face ID (routes sharing same faceId share one topo image) |
| `setter` | string | | Route setter name |
| `FA` | string | | First ascent credit |
| `description` | string | | Route description |
| `betaLinks` | BetaLink[] | | Array of beta video links |
| `topoLine` | TopoPoint[] | | Normalized 0-1 coordinates for SVG line drawing |
| `topoTension` | number | | Catmull-Rom curve tension parameter |
| `topoAnnotations` | RouteTopoAnnotation[] | | Multi-image topo support |

#### Crag (岩场/Boulder Area)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Slug format (e.g., "yuan-tong-si") |
| `name` | string | ✅ | Display name |
| `cityId` | string | ✅ | City/district ID |
| `location` | string | ✅ | Location text |
| `description` | string | ✅ | Crag introduction |
| `approach` | string | ✅ | How to get there |
| `developmentTime` | string | | Development history |
| `coverImages` | string[] | | Cover image URLs |
| `coordinates` | {lng, lat} | | GCJ-02 coordinate system |
| `approachPaths` | ApproachPath[] | | Hiking route polylines |
| `areas` | string[] | | Sub-area list |
| `credits` | CragCredit[] | | Contributor credits |

#### BetaLink (Beta 视频)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique ID |
| `platform` | "xiaohongshu" | ✅ | Video platform |
| `noteId` | string | ✅ | XHS note ID (for deduplication) |
| `url` | string | ✅ | Resolved final URL |
| `originalUrl` | string | | Original short URL before resolution |
| `title` | string | | Video title |
| `author` | string | | Author name |
| `climberHeight` | number | | Submitter height in cm |
| `climberReach` | number | | Submitter arm span in cm |
| `createdAt` | Date | | Submission timestamp |

#### TopoPoint (线路标注坐标)

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | 0-1 normalized X coordinate |
| `y` | number | 0-1 normalized Y coordinate |

### 3.2 Location Types

#### CityConfig (城市)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | e.g., "luoyuan" |
| `name` | string | Display name |
| `shortName` | string | Compact name |
| `adcode` | string | 高德 API city code |
| `coordinates` | {lng, lat} | City center |
| `available` | boolean | Has climbing areas |
| `prefectureId` | string? | Parent prefecture |
| `sortOrder` | number? | Display order |

#### PrefectureConfig (地级市)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Prefecture ID |
| `name` | string | Display name |
| `districts` | string[] | Ordered child city IDs |
| `defaultDistrict` | string | Default when IP matches this prefecture |

#### CitySelection (Union Type)

```
{ type: 'city', id: string }        // Single district
{ type: 'prefecture', id: string }   // Entire prefecture (multi-district)
```

### 3.3 Weather Types

#### WeatherData (Complete Response)

| Field | Type | Description |
|-------|------|-------------|
| `adcode` | string | City code |
| `city` | string | City name |
| `live` | WeatherLive | Current conditions |
| `forecasts` | WeatherForecast[] | 3-day forecast |
| `climbing` | ClimbingCondition | Suitability assessment |
| `updatedAt` | string | ISO timestamp |

#### ClimbingCondition (攀岩适宜度)

| Field | Type | Description |
|-------|------|-------------|
| `level` | "excellent" \| "good" \| "fair" \| "poor" | Rating |
| `label` | string | Display label |
| `description` | string | Explanation text |
| `factors` | string[] | Contributing factors |

### 3.4 Offline Types

#### DownloadProgress

| Field | Type | Description |
|-------|------|-------------|
| `cragId` | string | Crag being downloaded |
| `status` | "idle" \| "downloading" \| "completed" \| "failed" \| "stale" | Current state |
| `totalImages` | number | Total images to download |
| `downloadedImages` | number | Images downloaded so far |
| `error` | string? | Error message if failed |

### 3.5 Grade System

**Scale**: Hueco V-Scale (V0 through V13, plus "？" for unknown)

**Utility Functions**:
- `parseGrade(grade)` → numeric value (-1 for unknown)
- `compareGrades(a, b)` → comparison result
- `computeGradeRange(grades[])` → { min, max }
- `formatGradeRange(range)` → display string (e.g., "V2 - V8")

---

## 4. Feature Modules

### 4.1 Home — Crag Discovery

**Purpose**: Primary landing page. Browse climbing crags organized by city/prefecture.

#### 4.1.1 City/Prefecture Selector

**Two-tier selection system**:

| Mode | Behavior |
|------|----------|
| Single City | Select one district/county → show its crags |
| Prefecture | Select entire prefecture → aggregate crags from all child districts |

**Features**:
- Hierarchical dropdown: Prefecture → District grouping
- IP-based geolocation on first visit (auto-select nearest city)
- Selection persisted in cookie (1-year TTL)
- "Coming Soon" badges for unavailable cities
- Only show prefecture headers when >1 prefecture exists

#### 4.1.2 Crag Card List

Each card displays:

| Element | Description |
|---------|-------------|
| Crag name | Large, bold heading |
| Route count | Badge (e.g., "42 条线路") |
| Difficulty range | Badge (e.g., "V2 - V8") |
| Weather badge | Temperature + weather icon (cached 1hr) |
| Download button | For offline mode (state-based icon) |

**Interactions**:
- Tap card → Navigate to Crag Detail page
- Tap download button → Start offline download (see 4.9)

#### 4.1.3 Empty State

When city has no available crags:
- Mountain icon
- "No crags in this city" message
- Hint about upcoming additions
- Prompt to select different city

#### 4.1.4 Visit Statistics

- Single-session visit tracking (deduplicated per session)
- POST to `/api/visit` on page load
- No visible UI (backend analytics only)

---

### 4.2 Crag Detail

**Purpose**: Detailed information about a specific climbing area.

#### 4.2.1 Hero Image Section

| Feature | Description |
|---------|-------------|
| Single image (mobile) | Full-width cover image |
| Carousel (desktop/multiple images) | Horizontal scroll-snap with dot indicators |
| Fallback | Mountain icon placeholder if no images |
| Back button | Top-left, semi-transparent background |

#### 4.2.2 Crag Header

| Element | Description |
|---------|-------------|
| Title | Large bold h1 with accent underline |
| Credits button | Heart icon → opens Credits Drawer (if credits exist) |
| Route count badge | e.g., "42 条线路" |
| Difficulty range badge | Computed from all routes |

#### 4.2.3 Credits Drawer

- Half-height bottom sheet
- Lists contributors with name + contribution description
- Footer: "Thanks to all who contributed"

#### 4.2.4 Weather Card

**Current conditions**:
- Large temperature + weather icon
- Humidity percentage with droplet icon
- Wind direction + power
- **Climbing suitability** badge (color-coded: green/yellow/red)

**3-day forecast**:
- Mini cards: day label, weather icon, min/max temp, climbing suitability icon

**States**: Loading skeleton → Data → Silent error (no card shown if API fails)

#### 4.2.5 Approach/Navigation Card

| Element | Description |
|---------|-------------|
| Title | "前往方式" (How to get here) |
| Approach text | Multi-line description |
| Embedded map | Interactive map showing crag location |
| Approach paths | Polyline visualization (if available) |
| Navigate button | Deep link to native map app |

#### 4.2.6 Crag Introduction Card

- Title: "岩场介绍"
- Full description text
- Glass morphism card styling

#### 4.2.7 Bottom CTA

- Fixed sticky button: "开始探索线路" (Explore Routes)
- Navigates to Route List filtered by this crag

---

### 4.3 Route Browsing & Filtering

**Purpose**: Browse and filter climbing routes with multi-dimensional filtering.

#### 4.3.1 Layout

```
┌─────────────────────────────────┐
│       Route Filter Bar          │  ← Top: crag/area/face/sort
├────────┬────────────────────────┤
│ Grade  │                        │
│ Range  │    Route List          │  ← Main content
│ Select │    (scrollable)        │
│ (left) │                        │
├────────┴────────────────────────┤
│       Bottom Tab Bar            │  ← Navigation
└─────────────────────────────────┘
```

#### 4.3.2 Route Filter Bar

| Filter | Type | Behavior |
|--------|------|----------|
| Crag selector | Chip group | "All" + available crags. Single-select toggle |
| Area selector | Dropdown | Appears after crag selected. Filters by sub-area |
| Face selector | Thumbnail strip | Shows rock face images. Tap to filter by face |
| Sort toggle | Button | Ascending (V0→V13) ↔ Descending (V13→V0) |
| Active filters | Tag chips | Removable tags showing current filters |
| Results count | Text | "共 XX 条线路" |

#### 4.3.3 Grade Range Selector (Left Sidebar)

| Feature | Description |
|---------|-------------|
| Display | Vertical color spectrum bar (V0-V13) |
| Click | Select single grade |
| Drag | Select continuous range |
| Selection display | "V5 - V10" text above bar |
| Clear button | Reset all grade selections |
| First-time hint | Pulse animation + "Tap or drag to select grades" |
| Touch threshold | 8px to distinguish click from drag |

#### 4.3.4 Route List Item

Each route card shows:
- Route name (bold)
- Grade (color-coded badge with grade-specific color)
- Area name
- Crag name
- Tap → Open Route Detail

**Performance**: Staggered fade-in animation (first 10 items only)

#### 4.3.5 Empty State

- "No results" message
- "Clear filters" button if filters applied

#### 4.3.6 URL-Based State

All filter/sort state encoded in URL query parameters for deep linking and browser navigation.

---

### 4.4 Route Detail & Topo Viewer

**Purpose**: View route topo image with line overlay, route info, and beta videos.

**Container**: Bottom drawer (three-quarter height) triggered by tapping any route card.

#### 4.4.1 Topo Image Section

| Feature | Description |
|---------|-------------|
| Rock face image | Full-width display of the climbing face |
| Topo line overlay | SVG path drawn with Catmull-Rom curves |
| Line animation | Animated stroke drawing effect (stroke-dasharray) |
| Start point marker | Colored circle matching route grade color |
| Tap to replay | Tap start point to replay draw animation |
| Tap to enlarge | Tap image to open full-screen viewer |
| Multi-route mode | When multiple routes share same face, show all routes with different colors |

**Multi-Route Overlay**:
- Selected route: full color + animated draw
- Unselected routes: 30% opacity (faded)
- Tap any unselected route's start point to switch selection
- Smooth fade transitions between routes

#### 4.4.2 Route Info Section

| Element | Description |
|---------|-------------|
| Route name | Large heading |
| Grade | Color-coded badge |
| Area | Sub-area within crag |
| Setter | Route setter credit (with icon) |
| FA | First ascent credit (with icon) |
| Description | Route description text |

#### 4.4.3 Sibling Route Navigation

- When multiple routes exist on same face, show navigation arrows
- Left/right arrows to cycle between sibling routes
- Route name indicator showing current position
- Horizontal slide animation on switch

#### 4.4.4 Multi-Annotation Support

If route has `topoAnnotations` (multiple topo images), provide slide navigation between annotation views.

---

### 4.5 Beta Video System

**Purpose**: Community-contributed climbing video references for routes.

#### 4.5.1 Beta List

**Trigger**: "Beta Videos" tab/section in Route Detail.

Each beta item shows:

| Element | Description |
|---------|-------------|
| Platform icon | Xiaohongshu logo |
| Title | Video title or "@Author" or "Beta #N" fallback |
| Author name | If available |
| Height/Reach tags | Optional badges (e.g., "170cm / 175cm") |
| External link | Opens video in browser/app |
| Copy link button | Copy URL to clipboard (shows "Copied!" for 2s) |

**Actions**:
- Manual refresh button → Fetches latest betas from API
- Shows "From Cache" or "Refreshed" indicator

**Empty State**: "No beta videos" with encouraging message to contribute.

#### 4.5.2 Beta Submission (Authenticated)

**Auth Gate**: Unauthenticated users see login prompt instead of form.

**Login Prompt** (unauthenticated):
- Lock icon in colored circle
- "请先登录" (Please log in first)
- "登录后即可分享 Beta 视频" (Log in to share beta videos)
- "登录/注册" button → Navigate to login with callbackURL

**Submission Form** (authenticated):

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Video URL | Text input | ✅ | Must be valid URL; must be Xiaohongshu link |
| Nickname | Text input | | Max 30 chars; cached in localStorage |
| Height | Number input | | 100-250 cm range |
| Reach | Number input | | 100-250 cm range |

**Smart URL Handling**: Automatically extracts URL from pasted text containing descriptions (e.g., Xiaohongshu share text).

**Platform Detection**: Auto-detects Xiaohongshu from URL, shows green badge.

**States**:
- Submitting: Disabled button with spinner
- Success: Green checkmark + "Beta shared!" → auto-close after 1.5s
- Error: Red alert with translated error message

**Rate Limit**: 5 submissions per minute per IP.

**Deduplication**: Same Xiaohongshu note ID → 409 Conflict.

---

### 4.6 Search

#### 4.6.1 Floating Search Button (Home)

- Fixed bottom-right position (above tab bar)
- Magnifying glass icon
- Tap → Opens Search Drawer
- Only visible when crags are available

#### 4.6.2 Search Drawer

| Feature | Description |
|---------|-------------|
| Input | Full-width, auto-focus (300ms delay), IME-safe |
| Real-time results | Filters routes by name as user types |
| Max results | Shows up to 8 items |
| Overflow | "View All X Results" button → Route List page |
| Route preview | Name, grade, crag name, description preview |
| Tap result | Opens Route Detail Drawer (nested) |
| Clear | X button inside input to clear query |
| Browse all | "Browse All Routes" link to route page |

#### 4.6.3 Route List Search

- Floating search input on Route List page
- Type to filter routes in real-time
- Searches across: name, description, area, setter

#### 4.6.4 Search Algorithm

- Chinese pinyin support (pinyin-pro library)
- Fuzzy matching on route name
- Case-insensitive

---

### 4.7 Weather & Climbing Conditions

#### 4.7.1 Weather Badge (Crag Cards)

- Compact: temperature + weather condition icon
- Shown on each crag card on home page

#### 4.7.2 Weather Card (Crag Detail)

**Current Conditions**:
- Large temperature display (3xl)
- Weather icon + description
- Humidity % with droplet icon
- Wind direction + power
- **Climbing Suitability**: Color-coded badge

**3-Day Forecast**:
- Daily cards: day label, icon, min/max temp, climbing suitability icon

#### 4.7.3 Climbing Suitability Algorithm

See [Section 8.1](#81-climbing-suitability-evaluation) for full algorithm.

**Rating Levels**: Excellent (green) → Good (blue) → Fair (yellow) → Poor (red)

#### 4.7.4 Data Source

- 高德地图 Weather API
- Cache: 1 hour per location
- Silent failure: no weather card shown if API fails

---

### 4.8 Map & Navigation

#### 4.8.1 Map Display

- **Provider**: 高德地图 (AMap) JS API v1.4.15
- **Coordinate System**: GCJ-02 (火星坐标系)
- Shows crag location with pin marker
- Interactive: zoom, pan
- Fixed height: 180px

#### 4.8.2 Approach Paths

- Polyline visualization on map
- Shows hiking/approach route from parking to crag
- Data from crag's `approachPaths` field

#### 4.8.3 Navigation Deep Link

- "Navigate" button opens native map app (AMap)
- Passes crag coordinates + name

> **iOS Note**: Consider using MapKit for native map experience, with option to deep link to 高德地图 app for navigation.

---

### 4.9 Offline Mode

**Purpose**: Download crag data + images for offline climbing sessions.

#### 4.9.1 Download Flow

```
User taps Download → Collect all image URLs (covers + topo)
  → Parallel: cache images + save crag/routes data
  → Show progress (downloaded/total)
  → On completion: update metadata
  → Background: check for updates periodically (30 min)
```

#### 4.9.2 Download Button States

| State | Icon | Color | Behavior |
|-------|------|-------|----------|
| Idle | Cloud download | Default | Tap to start download |
| Downloading | Circular progress | Primary | Shows percentage (e.g., "45%") |
| Completed | Checkmark | Green | Tap for info |
| Stale | Refresh | Warning | Tap to re-download updated data |
| Failed | Alert | Red | Tap to retry |

#### 4.9.3 Offline Page

- Lists all downloaded crags grouped by prefecture
- Each entry: crag name, route count, arrow indicator
- Tap → Offline Crag Detail (static data, no live features)
- "Go Online" button when network available

#### 4.9.4 Offline Browsing

- Full crag + route data from local storage
- Topo images from cache
- **Not available offline**: Weather, beta video list updates, search

#### 4.9.5 Staleness Detection

1. Record `routeCount` at download time
2. Background check (every 30 min): compare with server via `/api/crags/[id]/version`
3. If count changed → show "Update Available" badge on download button

#### 4.9.6 Storage Architecture

| Layer | Technology (PWA) | iOS Equivalent |
|-------|-------------------|----------------|
| Structured data | IndexedDB | Core Data / SwiftData |
| Image cache | Cache API | URLCache / FileManager |
| Metadata | localStorage | UserDefaults |

#### 4.9.7 Offline Indicator

- Top banner when device is offline
- Shows count of available offline crags
- Expandable list of downloaded crags
- WiFi-off icon

---

### 4.10 User Profile & Settings

#### 4.10.1 Unauthenticated State

- Large login CTA card
- "登录 / 注册" (Login / Register)
- "首次登录？设置账号" (First time? Set up account)
- Tap → Navigate to Login page

#### 4.10.2 Authenticated State

- User avatar thumbnail
- User name or email (tappable → Security Settings)
- Email sub-text

#### 4.10.3 Preferences

| Setting | UI | Options |
|---------|------|---------|
| Theme | Segmented control | Light / Dark / Auto (system) |
| Language | Segmented control with flags | 🇨🇳 中文 / 🇬🇧 English / 🇫🇷 Français |

#### 4.10.4 Offline Data Management

- List of downloaded crags with file sizes
- Individual delete buttons per crag
- "Clear all offline data" button
- Storage quota indicator
- Last sync timestamp per crag

#### 4.10.5 About Section

| Item | Action |
|------|--------|
| About BlocTop | → Navigate to Intro/Onboarding page |
| About Author | → Opens Author Drawer (contact/social links) |
| Visit Statistics | Display total app visits (localStorage + API cached) |
| App Version | Footer text |

#### 4.10.6 Account Security (Drawer)

| Section | Features |
|---------|----------|
| Avatar | View/crop/upload/delete profile image |
| Email | Read-only display |
| Profile | Editable: nickname, height (cm), reach (cm), ape index (auto-computed) |
| Password | Set or change password |
| Passkeys | List registered passkeys, add new, delete existing |
| Editor Link | "Go to Editor" (only if user has editor permissions) |
| Logout | Sign out button |

---

### 4.11 Onboarding & App Info

#### 4.11.1 Intro Page

**Hero Section**:
- Animated mountain icon in gradient box
- App name: "寻岩记 (BlocTop)"
- Tagline (translated)

**Feature Timeline** (4 scenes with vertical timeline):

| # | Icon | Title | Description |
|---|------|-------|-------------|
| 1 | Map | Discover crags | Find climbing areas on map |
| 2 | Sliders | Filter & sort | Browse routes by difficulty |
| 3 | Play | Watch beta | Learn from video references |
| 4 | Heart | Save favorites | Download for offline use |

Each scene: numbered circle + icon + title + description with staggered entry animation.

**CTA**: "Start Exploring" button → Navigate to Home.

---

## 5. Internationalization (i18n)

### 5.1 Supported Languages

| Code | Language | Flag | Status |
|------|----------|------|--------|
| `zh` | Chinese (Simplified) | 🇨🇳 | Default |
| `en` | English | 🇬🇧 | Full |
| `fr` | French | 🇫🇷 | Full |

### 5.2 Translation Structure

Translation keys organized by namespace:

| Namespace | Content |
|-----------|---------|
| `Home` | Home page strings |
| `Crag` | Crag detail strings |
| `Route` | Route list/detail strings |
| `Beta` | Beta video strings |
| `Auth` | Login/register strings |
| `Profile` | Profile page strings |
| `Weather` | Weather display strings |
| `Offline` | Offline mode strings |
| `Search` | Search UI strings |
| `Grade` | Grade display strings |
| `Common` | Shared strings (buttons, labels) |
| `APIError` | API error messages |
| `Intro` | Onboarding page strings |

### 5.3 Locale Detection

Priority order:
1. User preference (stored in localStorage)
2. IP geolocation (middleware)
3. Browser Accept-Language header
4. Default: `zh`

### 5.4 Translation Files Location (PWA)

```
apps/pwa/messages/
├── zh.json    # ~500+ keys
├── en.json
└── fr.json
```

---

## 6. Design System

### 6.1 Theme

| Mode | Background | Foreground | Primary |
|------|-----------|-----------|---------|
| Light | White tones | Dark text | Purple accent |
| Dark (Dracula) | #282A36 | #F8F8F2 | #BD93F9 |
| Auto | Follows system | — | — |

### 6.2 Glassmorphism

4-tier glass hierarchy used across all UI surfaces:

| Level | Usage |
|-------|-------|
| `glass-light` | Input fields, subtle backgrounds |
| `glass` | Cards, list items |
| `glass-md` | Drawers, overlays |
| `glass-heavy` | Navigation bars, sticky headers |

Mobile: blur reduced ~40% for performance.

### 6.3 Design Tokens

| Category | Tokens |
|----------|--------|
| Colors | `primary`, `on-primary`, `surface`, `on-surface`, `error`, `success`, `warning` |
| Spacing | `space-xs` (0.25rem) → `space-xl` (1.5rem), `space-page` (1rem) |
| Radius | `radius-xs` (0.25rem) → `radius-full` (9999px) |
| Elevation | 5 levels of shadow |
| App shell | 480px max width, 16px padding (desktop centered) |

### 6.4 Typography

| Style | Font |
|-------|------|
| Sans (primary) | Plus Jakarta Sans |
| Mono (code) | JetBrains Mono |

### 6.5 Grade Colors

Each V-grade has a specific RGB color for badges and topo lines. Colors range from green (V0) through yellow, orange, red, to purple (V13).

### 6.6 Animations

| Animation | Usage |
|-----------|-------|
| Fade-in-up | Cards, dialogs, page sections |
| Scale-in | Icons, badges |
| Drawer slide | Bottom sheets |
| Stroke draw | Topo line animation |
| Pulse subtle | Status indicators |
| Skeleton shimmer | Loading states |

### 6.7 Touch Interactions

- Active press: `scale(0.97)` or `scale(0.98)`
- Drawer swipe: 100px threshold to close
- Scroll-snap: Carousel images snap to center

---

## 7. API Endpoints Reference

### 7.1 Public Endpoints (No Auth)

| Method | Path | Description | Cache |
|--------|------|-------------|-------|
| GET | `/api/cities` | Cities + prefectures list | 5 min |
| GET | `/api/crags` | Crag list (optional `?cityId=`) | ISR |
| GET | `/api/crags/[id]/routes` | Routes for crag | ISR |
| GET | `/api/crags/[id]/version` | Route count (staleness check) | — |
| GET | `/api/routes` | All routes | ISR |
| GET | `/api/routes/[id]` | Single route | ISR |
| GET | `/api/beta?routeId=N` | Beta links for route | 1 hr |
| GET | `/api/weather?adcode=X` | Weather + suitability | 1 hr |
| GET | `/api/geo` | IP geolocation → city | — |

### 7.2 Authenticated Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/beta` | Submit beta link | User login required |
| POST | `/api/feedback` | User feedback | — |
| POST | `/api/visit` | Visit tracking | — |
| POST | `/api/log` | Client error logging | — |
| ALL | `/api/auth/[...all]` | better-auth catch-all | — |

### 7.3 Admin/Manager Endpoints (Editor Only)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/crags` | Create crag (admin) |
| PATCH/DELETE | `/api/crags/[id]` | Update/delete crag |
| POST | `/api/routes` | Create route (manager+) |
| PATCH/DELETE | `/api/routes/[id]` | Update/delete route |
| PATCH/DELETE | `/api/beta` | Edit/delete beta (manager+) |
| POST | `/api/upload` | Upload topo image (manager+) |
| ALL | `/api/faces` | Face image management |
| ALL | `/api/crag-permissions` | Permission management (admin) |

### 7.4 Cross-App

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/revalidate` | ISR on-demand refresh (called by Editor) |

---

## 8. Business Logic & Algorithms

### 8.1 Climbing Suitability Evaluation

```
Input: WeatherLive (temperature, humidity, wind, weather description)

Step 1: Check for bad weather keywords
  - Keywords: 雨, 雪, 冰, 雾, 雷, 暴雨
  - If matched → return { level: 'poor' }

Step 2: Evaluate individual factors
  Temperature:
    excellent [15-30°C], good [10-35°C], fair [5-40°C], else poor
  Humidity:
    excellent [35-65%], good [25-75%], fair [15-85%], else poor
    >85% → always poor
  Wind Power:
    excellent [≤3], good [≤4], fair [≤5], else poor

Step 3: Aggregate (worst-level wins)
  Final level = min(temp_level, humidity_level, wind_level)

Step 4: Optional rain check
  If today's forecast contains rain → add to factors list
```

### 8.2 Route Search (Pinyin Support)

- Uses `pinyin-pro` library for Chinese → Pinyin conversion
- Matches against route name, area, crag name
- Case-insensitive, fuzzy matching
- Shared module: `packages/shared/src/route-search.ts`

### 8.3 Image URL Generation

**R2 Key** (storage): Raw UTF-8, no encoding
```
{cragId}/{area}/{faceId}.jpg
```

**Public URL** (display): Percent-encoded path segments
```
https://img.bouldering.top/{cragId}/{encodeURIComponent(area)}/{encodeURIComponent(faceId)}.jpg
```

**Topo Image URL functions**:
- `getTopoImageUrl(cragId, faceId)` — face topo image
- `getCragCoverUrl(cragId, index)` — crag cover image
- `getRouteTopoUrl(cragId, routeId)` — route-specific topo (legacy)

### 8.4 Beta URL Resolution

1. User pastes Xiaohongshu share text
2. Extract URL from text using regex
3. If short URL (xhslink.com): follow redirects with mobile UA to get final URL
4. Extract `noteId` from final URL
5. Check for duplicates by noteId
6. Store both original and resolved URLs

### 8.5 Grade Range Computation

```
Input: string[] of grades (e.g., ["V2", "V5", "？", "V8"])
1. Filter out "？" and "?"
2. Sort by parseGrade() numeric value
3. Return { min: first, max: last }
4. Format: "V2 - V8"
```

---

## 9. Caching Strategy

| Resource | TTL | Mechanism |
|----------|-----|-----------|
| Weather data | 1 hour | In-memory map + HTTP Cache-Control |
| Cities/Prefectures | 5 minutes | Server stale-while-revalidate |
| Beta links | 1 hour | HTTP Cache-Control |
| Crag/Route data | ISR | On-demand via `/api/revalidate` |
| R2 Images | 30 days | Cloudflare CDN |
| City selection | 1 year | Cookie |
| User preferences | Permanent | localStorage |
| Face image cache | Until invalidated | URL versioning (?t=timestamp) |

---

## 10. Error Handling

### 10.1 API Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `RATE_LIMITED` | 429 | Too many requests |
| `MISSING_FIELDS` | 400 | Required fields missing |
| `INVALID_URL` | 400 | URL format invalid |
| `ONLY_XIAOHONGSHU` | 400 | Only XHS links accepted |
| `DUPLICATE_BETA` | 409 | Same note already submitted |
| `ROUTE_NOT_FOUND` | 404 | Route doesn't exist |
| `CANNOT_PARSE_NOTE` | 400 | Can't extract note ID |
| `INVALID_HEIGHT` | 400 | Height out of 100-250 range |
| `INVALID_REACH` | 400 | Reach out of 100-250 range |
| `UPDATE_FAILED` | 500 | Database update failed |
| `SERVER_ERROR` | 500 | Generic server error |

### 10.2 UI Error Handling Patterns

| Scenario | Behavior |
|----------|----------|
| Weather API fails | No weather card shown (silent) |
| Image load fails | Placeholder icon shown |
| Map API fails | Error message or placeholder |
| Auth failure | Toast with error message |
| Download failure | Error state on button + toast |
| Network loss | Offline indicator banner |

### 10.3 Loading States

| Pattern | Usage |
|---------|-------|
| Skeleton shimmer | Cards, images, weather |
| Circular spinner | Download progress |
| Button disabled + text change | Form submissions |
| Opacity reduction | Route list during filter transition |

---

## Appendix A: Bottom Navigation Structure

| Tab | Icon | Route | Label |
|-----|------|-------|-------|
| Home | House | `/` | 首页 |
| Routes | Mountain | `/route` | 线路 |
| Profile | Gear | `/profile` | 我的 |

## Appendix B: Drawer Heights

| Height | Usage |
|--------|-------|
| Quarter (25%) | Small confirmations |
| Half (50%) | Beta submit, credits, filters |
| Three-quarter (75%) | Route detail, search, security settings |
| Full (100%) | Full-screen content |

## Appendix C: Coordinate System

- **Storage**: GCJ-02 (火星坐标系, same as AMap)
- **No WGS-84 conversion** in codebase
- **Input**: Copy from [高德坐标拾取器](https://lbs.amap.com/tools/picker)
- **iOS Note**: If using Apple Maps (MapKit), need GCJ-02 → WGS-84 conversion

---

*Document generated from BlocTop PWA codebase analysis, 2026-02-22.*
*Editor (Topo Editor) features excluded — remains as standalone web application.*
