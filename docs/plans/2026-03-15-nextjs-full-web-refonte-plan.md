# Next.js Full Web Refonte Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a new unified `Next.js + React + Tailwind CSS + TypeScript` frontend for public, manager, partner, and admin interfaces while keeping the current Express backend as the active API.

**Architecture:** Create a dedicated frontend app inside the repository and migrate UI surface area in phases. Start with shared design foundations and the admin surface because the admin API already exists and provides the fastest path to a real, testable screen. Keep backend HTML routes alive during transition to avoid breaking workflows.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Express API, existing Supabase-backed backend

---

### Task 1: Create frontend workspace

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/eslint.config.mjs`
- Create: `apps/web/.gitignore`
- Modify: `package.json`

**Step 1: Create the workspace manifest**

Define scripts for `dev`, `build`, `start`, and `lint`.

**Step 2: Wire root scripts**

Add root scripts that delegate to the frontend app without breaking existing backend scripts.

**Step 3: Run install**

Run: `npm install`
Expected: lockfile updated with Next.js frontend dependencies

**Step 4: Verify package graph**

Run: `npm ls next react react-dom tailwindcss`
Expected: packages resolved without missing dependency errors

### Task 2: Add base Next.js app shell

**Files:**
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/(public)/page.tsx`
- Create: `apps/web/app/admin/page.tsx`
- Create: `apps/web/app/partners/page.tsx`
- Create: `apps/web/app/manager/page.tsx`

**Step 1: Create minimal routes**

Build placeholder routes for each major area with semantic structure.

**Step 2: Add global layout**

Add root HTML shell, metadata, and global font loading.

**Step 3: Add foundational global styles**

Implement design tokens, colors, typography, spacing, focus states, and background system.

**Step 4: Run dev server smoke test**

Run: `npm run web:build`
Expected: Next.js build succeeds with all initial routes

### Task 3: Create shared design system primitives

**Files:**
- Create: `apps/web/components/ui/app-shell.tsx`
- Create: `apps/web/components/ui/sidebar.tsx`
- Create: `apps/web/components/ui/topbar.tsx`
- Create: `apps/web/components/ui/stat-card.tsx`
- Create: `apps/web/components/ui/section-header.tsx`
- Create: `apps/web/components/ui/status-badge.tsx`
- Create: `apps/web/components/ui/data-table.tsx`
- Create: `apps/web/lib/cn.ts`

**Step 1: Implement shell primitives**

Build sidebar and topbar components that can be reused across private spaces.

**Step 2: Implement display primitives**

Create cards, badges, section headers, and a generic accessible table.

**Step 3: Use primitives in placeholder pages**

Replace simple route placeholders with structured layout usage.

**Step 4: Verify build**

Run: `npm run web:build`
Expected: reusable component layer compiles cleanly

### Task 4: Add typed backend client

**Files:**
- Create: `apps/web/lib/config.ts`
- Create: `apps/web/lib/api/types.ts`
- Create: `apps/web/lib/api/client.ts`
- Create: `apps/web/lib/api/admin.ts`

**Step 1: Define API types**

Model the existing admin payload returned by `/admin/api/stats`.

**Step 2: Create fetch wrapper**

Support server-side and client-side calls with base URL config.

**Step 3: Add admin-specific API helpers**

Expose typed helper functions for stats, payouts, settings, and license generation.

**Step 4: Verify type safety**

Run: `npm run web:build`
Expected: no TypeScript errors in API layer

### Task 5: Build first real admin dashboard

**Files:**
- Create: `apps/web/app/admin/page.tsx`
- Create: `apps/web/features/admin/components/admin-dashboard.tsx`
- Create: `apps/web/features/admin/components/operations-panel.tsx`
- Create: `apps/web/features/admin/components/license-table.tsx`
- Create: `apps/web/features/admin/components/partner-panel.tsx`
- Create: `apps/web/features/admin/components/audit-feed.tsx`

**Step 1: Fetch real admin data**

Load `/admin/api/stats` through the typed API client.

**Step 2: Compose dashboard sections**

Render overview, operations, licenses, partners, and audit views using the shared components.

**Step 3: Add empty and error states**

Ensure the page remains usable when backend data is missing or partial.

**Step 4: Verify runtime build**

Run: `npm run web:build`
Expected: admin page builds successfully against the real API contracts

### Task 6: Add frontend auth entry surfaces

**Files:**
- Create: `apps/web/app/auth/page.tsx`
- Create: `apps/web/app/auth/admin/page.tsx`
- Create: `apps/web/app/auth/partners/page.tsx`
- Create: `apps/web/app/auth/manager/page.tsx`
- Create: `apps/web/components/forms/token-login-form.tsx`

**Step 1: Build unified auth entry UX**

Create a modern access hub that routes users to the correct product area.

**Step 2: Implement admin token login UI**

Mirror the current backend auth behavior with a Next.js form that posts to the Express route.

**Step 3: Add partner and manager placeholders**

Prepare migration surfaces without changing backend business rules.

**Step 4: Verify build**

Run: `npm run web:build`
Expected: auth routes compile cleanly

### Task 7: Add public marketing shell

**Files:**
- Create: `apps/web/app/(public)/layout.tsx`
- Create: `apps/web/app/(public)/page.tsx`
- Create: `apps/web/features/public/components/hero.tsx`
- Create: `apps/web/features/public/components/space-picker.tsx`
- Create: `apps/web/features/public/components/value-grid.tsx`

**Step 1: Build public landing shell**

Create a polished homepage aligned with the shared visual language.

**Step 2: Link spaces clearly**

Expose clear routes to admin, partners, and manager areas.

**Step 3: Verify responsive rendering**

Run: `npm run web:build`
Expected: public routes compile successfully

### Task 8: Prepare partner and manager migration shells

**Files:**
- Create: `apps/web/features/partners/components/partner-shell.tsx`
- Create: `apps/web/features/manager/components/manager-shell.tsx`
- Modify: `apps/web/app/partners/page.tsx`
- Modify: `apps/web/app/manager/page.tsx`

**Step 1: Build shared private-area layout variants**

Adapt the global shell for partner and manager needs.

**Step 2: Add placeholder cards backed by route metadata**

Make these areas navigable even before full API connection.

**Step 3: Verify build**

Run: `npm run web:build`
Expected: all route groups render and compile

### Task 9: Add documentation for frontend runtime

**Files:**
- Modify: `README.md`

**Step 1: Document how to run backend and frontend together**

Explain ports, scripts, and migration intent.

**Step 2: Document environment variables**

List frontend base URL and backend API URL needs.

**Step 3: Verify docs consistency**

Re-read scripts and instructions line-by-line
Expected: README commands match package scripts exactly

### Task 10: Final verification

**Files:**
- Verify only

**Step 1: Run backend tests**

Run: `npm test`
Expected: existing backend test suite still passes

**Step 2: Run frontend build**

Run: `npm run web:build`
Expected: successful Next.js production build

**Step 3: Run backend analysis**

Run: `npm run analyze`
Expected: existing backend verification still passes

**Step 4: Manual smoke summary**

Check that:
- `/` frontend public page renders
- `/admin` frontend page renders
- `/partners` frontend page renders
- `/manager` frontend page renders
- backend admin APIs still respond

**Step 5: Commit**

```bash
git add package.json package-lock.json apps/web README.md docs/plans/2026-03-15-nextjs-full-web-refonte-design.md docs/plans/2026-03-15-nextjs-full-web-refonte-plan.md
git commit -m "feat: scaffold nextjs frontend shell"
```
