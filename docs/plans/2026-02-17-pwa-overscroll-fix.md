# PWA Overscroll Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate iOS elastic overscroll (rubber-band effect) that causes "top content gets covered" on scroll, improving native app feel.

**Architecture:** Two-phase approach. Phase 1 (immediate) applies a safe CSS-only fix + one page refactor. Phase 2 (future) progressively migrates remaining document-flow pages to the fixed-shell pattern.

**Tech Stack:** CSS (`overscroll-behavior`), Tailwind CSS (`h-dvh`, `overflow-hidden`, `overflow-y-auto`)

---

## Background: Two Layout Patterns in the App

The app currently uses two distinct layout patterns:

### Pattern A: Fixed Shell (correct for PWA)
```
<div class="h-dvh overflow-hidden">     ← viewport-locked outer shell
  <header>...</header>
  <main class="flex-1 overflow-y-auto"> ← only this scrolls
    {content}
  </main>
  <AppTabbar />
</div>
```

**Pages using this:** home, route list, offline/crag detail, offline/route detail, loading skeletons

### Pattern B: Document Flow (web-style, causes overscroll)
```
<div class="min-h-screen">              ← grows beyond viewport
  <header>...</header>
  <main>                                ← body-level scroll
    {content}
  </main>
</div>
```

**Pages using this:** login, profile, intro, auth/verify, auth/passkey-setup, auth/security-setup, offline list, error, not-found

### Why Pattern B causes the bug

`min-h-screen` lets the container grow taller than the viewport. When content exceeds one screen, the browser's **document-level scroll** activates. On iOS Safari/WebKit, document-level scroll has **elastic overscroll** (rubber-band bounce). When the user scrolls past the top or bottom edge, the entire page visually shifts, partially hiding top content.

---

## Phase 1: Immediate Fix (safe, no breaking changes)

### Task 1: Add `overscroll-behavior: none` to html/body

**Files:**
- Modify: `packages/ui/src/styles/globals.css:342-347`

**What it does:** Tells the browser to **stop at scroll boundaries** instead of applying elastic bounce. Does NOT affect normal scroll — pages with `min-h-screen` still scroll normally, they just don't bounce.

**Step 1: Add overscroll-behavior to body rule**

In `globals.css`, find the existing `body` rule in `@layer base`:

```css
/* Before */
body {
  @apply bg-background text-foreground;
  background-color: var(--theme-surface);
  color: var(--theme-on-surface);
  transition: var(--theme-transition);
}
```

Change to:

```css
/* After */
html {
  overscroll-behavior: none;
}

body {
  @apply bg-background text-foreground;
  background-color: var(--theme-surface);
  color: var(--theme-on-surface);
  transition: var(--theme-transition);
  overscroll-behavior: none;
}
```

> `overscroll-behavior: none` on both `html` and `body` ensures full coverage — some browsers apply overscroll to `html`, others to `body`.

**Step 2: Verify no side effects**

Run: `pnpm --filter @bloctop/pwa dev`

Test these pages on mobile (or Chrome DevTools mobile emulation):
- [x] Home page — scroll crag cards, no bounce at top/bottom edges
- [x] Route list — scroll route cards, no bounce
- [x] Login page — still scrollable if content overflows (form fields visible)
- [x] Profile page — still scrollable (Passkey list, settings all reachable)
- [x] Intro page — still scrollable (all sections reachable)
- [x] Crag detail — scroll works, no elastic bounce at top

**Step 3: Commit**

```bash
git add packages/ui/src/styles/globals.css
git commit -m "fix: disable iOS elastic overscroll for native app feel"
```

---

### Task 2: Fix crag detail mobile scroll architecture

**Files:**
- Modify: `apps/pwa/src/app/[locale]/crag/[id]/crag-detail-client.tsx:95-104, 186`

**Problem:** Mobile crag detail uses `h-dvh overflow-y-auto` on the **outer** div — the whole page is a scroll container. This is inconsistent with the home page pattern and causes the hero image to scroll away entirely.

**Step 1: Change mobile outer container to fixed shell**

Find (around line 95-104):

```tsx
<div
  className={isMobile
    ? "h-dvh overflow-y-auto"
    : "flex flex-col h-dvh overflow-hidden"
  }
```

Change to:

```tsx
<div
  className={isMobile
    ? "flex flex-col h-dvh overflow-hidden"
    : "flex flex-col h-dvh overflow-hidden"
  }
```

Since both branches are now identical, simplify to:

```tsx
<div
  className="flex flex-col h-dvh overflow-hidden"
```

**Step 2: Add overflow-y-auto to mobile main**

Find (around line 186):

```tsx
<main className={isMobile ? "px-4 pb-24" : "flex-1 overflow-y-auto px-4 pb-24"}>
```

Change to:

```tsx
<main className="flex-1 overflow-y-auto px-4 pb-24">
```

Again both branches become identical, so simplify.

**Step 3: Ensure hero section is flex-shrink-0**

Find the hero section wrapper (around line 106):

```tsx
<div ref={heroRef} className={isMobile ? "relative" : "relative flex-shrink-0"}>
```

Change to:

```tsx
<div ref={heroRef} className="relative flex-shrink-0">
```

This prevents the hero image from being compressed when the content area uses `flex-1`.

**Step 4: Check for scroll-dependent features in crag detail**

The crag detail page has a **hero collapse on scroll** behavior (scroll-reveal class, hero height transition). After changing to inner scroll, the scroll event source changes from the outer div to `<main>`. Verify:

- If `heroRef` or any `IntersectionObserver` is attached to the outer div's scroll, it needs to be re-targeted to `<main>`.
- If `useScrollReveal` relies on `window.scrollY`, it won't work with inner scroll — needs to use the `<main>` element's `scrollTop`.

**Action:** Read the hero collapse implementation before applying this change. If it relies on document scroll, this task needs additional work.

```bash
# Check what scroll mechanism is used
grep -n "scroll\|IntersectionObserver\|heroRef" apps/pwa/src/app/[locale]/crag/[id]/crag-detail-client.tsx
```

**Step 5: Type check**

Run: `pnpm turbo typecheck`
Expected: PASS

**Step 6: Verify locally**

1. Open crag detail page on mobile
2. Hero image should remain visible (flex-shrink-0)
3. Content below hero scrolls within `<main>`
4. No elastic bounce at top or bottom
5. Hero collapse animation still works (if applicable)

**Step 7: Commit**

```bash
git add apps/pwa/src/app/[locale]/crag/[id]/crag-detail-client.tsx
git commit -m "refactor: unify crag detail mobile layout to fixed-shell pattern"
```

---

## Phase 2: Progressive Page Migration (future, not in this PR)

These pages currently use `min-h-screen` document-flow layout. They should be migrated to the fixed-shell pattern one-by-one in future PRs. Each migration is independent and can be done separately.

### Priority order:

| Priority | Page | Current Layout | Difficulty | Notes |
|----------|------|---------------|------------|-------|
| 1 | `profile/page.tsx` | `min-h-screen` | Medium | Long scrollable content, has header + tabbar |
| 2 | `login/page.tsx` | `min-h-screen` | Low | Short content, tab-based form |
| 3 | `offline/page.tsx` | `min-h-screen` | Low | Card list, similar to home |
| 4 | `intro/page.tsx` | `min-h-screen` | Medium | Has scroll-reveal animations |
| 5 | `auth/passkey-setup/page.tsx` | `min-h-screen` | Low | Simple form |
| 6 | `auth/security-setup/page.tsx` | `min-h-screen` | Low | Simple form |
| 7 | `auth/verify/page.tsx` | `min-h-screen` | Low | Centered content |
| 8 | `error.tsx` (x2) | `min-h-screen` | Low | Centered error message |
| 9 | `not-found.tsx` | `min-h-screen` | Low | Centered message |

### Migration pattern for each page:

```tsx
// Before (document flow)
<div className="flex flex-col min-h-screen">
  <header>...</header>
  <main className="flex-1 px-4 pb-24">
    {content}
  </main>
</div>

// After (fixed shell)
<div className="flex flex-col h-dvh overflow-hidden">
  <header className="flex-shrink-0">...</header>
  <main className="flex-1 overflow-y-auto px-4 pb-24">
    {content}
  </main>
</div>
```

### When to change Layout layer

Once ALL pages under `[locale]/` use the fixed-shell pattern, the layout wrapper can be simplified:

```tsx
// [locale]/layout.tsx — ONLY after all child pages are migrated
<div className="h-dvh overflow-hidden" style={{ backgroundColor: 'var(--theme-desktop-bg)' }}>
  <div id="app-shell" className="relative mx-auto w-full h-full md:shadow-2xl" ...>
    {children}
  </div>
</div>
```

**Do NOT change layout.tsx until all child pages are migrated.** Changing it prematurely will break all document-flow pages.

---

## Browser Compatibility

| Property | Chrome | Safari | Firefox | iOS Safari |
|----------|--------|--------|---------|------------|
| `overscroll-behavior: none` | 63+ | 16+ | 59+ | 16+ |
| `h-dvh` (100dvh) | 108+ | 15.4+ | 94+ | 15.4+ |

All target browsers support these properties. No polyfills needed.

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|-----------|
| `overscroll-behavior: none` | **Minimal** — only affects bounce, not scroll | Test all page types |
| Crag detail refactor | **Low-Medium** — scroll source changes | Check hero collapse & IntersectionObserver |
| Layout layer change | **High** — breaks 10 pages | Deferred to Phase 2 |
