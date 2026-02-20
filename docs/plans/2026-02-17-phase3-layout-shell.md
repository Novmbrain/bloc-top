# Phase 3: Layout App Shell Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert `#app-shell` div in `[locale]/layout.tsx` from `min-h-screen` to `h-dvh overflow-hidden`, establishing a single viewport boundary at the layout level.

**Architecture:** All 9 child pages already use `h-dvh overflow-hidden` (Phase 2, PR #274). The `#app-shell` is the last `min-h-screen` in the page hierarchy. Converting it prevents any residual document-level scroll. The outer desktop wrapper div stays `min-h-screen` (it provides the desktop background behind the centered shell).

**Tech Stack:** Tailwind CSS (`h-dvh`, `overflow-hidden`)

---

## Background

- Phase 1 (PR #273): Added `overscroll-behavior: none` to html/body, migrated crag detail
- Phase 2 (PR #274): Migrated all 9 remaining pages to fixed-shell
- Phase 3 (this plan): Layout-level shell migration — the final step

**Safety analysis of `#app-shell` children (lines 102-106):**

| Component | Positioning | In document flow? |
|-----------|------------|-------------------|
| `<LocaleDetector />` | Returns `null` | No |
| `<MaintenanceBanner />` | `fixed top-0` | No |
| `<OfflineIndicator />` | `fixed top-0` | No |
| `{children}` | Each page uses `h-dvh overflow-hidden` | Yes (only in-flow child) |
| `<SWUpdatePrompt />` | `fixed bottom-20` | No |

All layout-level components use `fixed` positioning or render no DOM. Only `{children}` participates in document flow, and every page already handles its own viewport-height layout.

---

## Task 1: Modify `#app-shell` className

**Files:**
- Modify: `apps/pwa/src/app/[locale]/layout.tsx:96`

**Step 1: Apply change**

```tsx
// Line 96 — Before:
className="relative mx-auto w-full min-h-screen md:shadow-2xl"

// Line 96 — After:
className="relative mx-auto w-full h-dvh overflow-hidden md:shadow-2xl"
```

Only change `min-h-screen` → `h-dvh overflow-hidden`. Keep `relative`, `mx-auto`, `w-full`, `md:shadow-2xl` untouched.

> **Do NOT change line 90** — the outer desktop wrapper div stays `min-h-screen` (provides desktop background).

**Step 2: Type check**

```bash
pnpm turbo typecheck
```

Expected: All 4 packages pass.

**Step 3: Commit**

```bash
git add apps/pwa/src/app/\[locale\]/layout.tsx
git commit -m "refactor: convert app-shell to fixed viewport boundary (Phase 3)"
```

---

## Task 2: Ship

Run `/ship "refactor: convert app-shell to fixed viewport boundary (Phase 3)"`

---

## Verification (post-deploy)

Test on mobile (or Chrome DevTools mobile emulation):

- [ ] Home page: scrolls normally, no overscroll bounce
- [ ] Crag detail: horizontal carousel + vertical scroll work
- [ ] Route list: filter bar fixed, routes scroll
- [ ] Profile: all sections scrollable, drawers open
- [ ] Intro: scroll-reveal animations fire
- [ ] Login: form scrollable on small screens
- [ ] Offline: content scrolls, OfflineIndicator visible at top
- [ ] Desktop: app shell centered with shadow, background visible

## Rollback

```bash
git revert <commit-hash>
```

Single commit, single file, instant revert.
