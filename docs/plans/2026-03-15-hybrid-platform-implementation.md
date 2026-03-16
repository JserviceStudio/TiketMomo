# Hybrid Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refondre progressivement le backend vers une plateforme hybride Supabase/Firebase orientee multi-app, analytics et control plane.

**Architecture:** On conserve un backend Node unique mais on restructure le modele de donnees, puis les frontieres metier, puis les flux asynchrones. Supabase reste le noyau business et analytique; Firebase reste mobile/auth/push.

**Tech Stack:** Node.js, Express, Supabase/Postgres, Firebase Admin, SQL RPC/Triggers, Realtime, Docker.

---

### Task 1: Audit and freeze the current schema contract

**Files:**
- Review: `database/supabase_master_schema.sql`
- Create: `docs/plans/schema-gap-notes.md`

**Step 1: Inventory current tables, RPC, policies and triggers**

List every current object and classify it as:
- keep
- fix
- deprecate
- replace

**Step 2: Identify schema/code mismatches**

Capture:
- missing RPCs referenced by backend
- columns referenced by code but absent from schema
- documentation mismatches

**Step 3: Save audit notes**

Write a concise gap document in `docs/plans/schema-gap-notes.md`.

**Step 4: Manual verification**

Check that every mismatch in the notes references an exact file and object.

### Task 2: Design the multi-app data model

**Files:**
- Modify: `docs/plans/2026-03-15-supabase-firebase-hybrid-platform-design.md`
- Create: `docs/plans/target-data-model.md`

**Step 1: Define target entities**

Specify:
- `apps`
- `manager_apps`
- `licenses`
- `license_entitlements`
- `auth_identities`
- `operational_events`
- `sync_jobs`
- `analytics_daily_facts`

**Step 2: Define relationships**

Document primary keys, foreign keys, lifecycle rules and ownership boundaries.

**Step 3: Define migration compatibility**

Map current tables to future ones.

**Step 4: Review for YAGNI**

Remove any table that does not directly support multi-app control plane, licensing or analytics.

### Task 3: Prepare schema migration set

**Files:**
- Create: `database/migrations/2026-03-15_platform_core.sql`
- Create: `database/migrations/2026-03-15_platform_analytics.sql`
- Create: `database/migrations/2026-03-15_platform_policies.sql`

**Step 1: Write additive migrations only**

Do not break existing runtime paths yet.

**Step 2: Add new tables**

Create the new platform tables with constraints and indexes.

**Step 3: Add policies and helper functions**

Align RLS with the chosen identity model.

**Step 4: Dry review**

Review SQL for dependency order and rollback feasibility.

### Task 4: Introduce backend domain boundaries

**Files:**
- Create: `src/modules/identity-access/`
- Create: `src/modules/tenant-management/`
- Create: `src/modules/voucher-operations/`
- Create: `src/modules/payment-billing/`
- Create: `src/modules/license-saas/`
- Create: `src/modules/partner-marketing/`
- Create: `src/modules/reporting-analytics/`
- Create: `src/modules/notifications-realtime/`

**Step 1: Define module folders and ownership**

Each module gets:
- route entry
- service layer
- repository layer
- validation

**Step 2: Move shared infrastructure**

Create dedicated infra wrappers for:
- Supabase
- Firebase
- FedaPay
- logging

**Step 3: Keep compatibility adapters**

Old controllers should delegate to new services during transition.

**Step 4: Verify no route contract breaks**

Document every unchanged public endpoint.

### Task 5: Rebuild the identity strategy

**Files:**
- Modify: `src/middlewares/authMiddleware.js`
- Create: `src/modules/identity-access/services/identityResolver.js`
- Create: `src/modules/identity-access/repositories/authIdentityRepository.js`

**Step 1: Separate authentication from identity mapping**

Auth verification and tenant resolution must become different concerns.

**Step 2: Support both Supabase and Firebase explicitly**

Resolve to a canonical internal manager/tenant identity.

**Step 3: Add logging and failure reasons**

Differentiate:
- invalid token
- provider unavailable
- identity not linked

**Step 4: Verify manager resolution invariants**

Every private request must resolve to exactly one internal tenant.

### Task 6: Move heavy processing out of controllers

**Files:**
- Modify: `src/controllers/webhookController.js`
- Modify: `src/services/cronService.js`
- Create: `src/workers/`
- Create: `src/modules/payment-billing/jobs/`
- Create: `src/modules/license-saas/jobs/`

**Step 1: Define async job model**

Use a DB-backed queue first if no dedicated queue is introduced immediately.

**Step 2: Convert webhook flow**

Webhook should:
- validate
- reserve
- enqueue
- acknowledge

**Step 3: Convert recurring jobs**

License checks, alerting and analytics consolidation should become dedicated jobs.

**Step 4: Verify idempotency**

Every replayable flow must remain safe.

### Task 7: Build analytics-grade read models

**Files:**
- Create: `database/migrations/2026-03-15_analytics_views.sql`
- Create: `src/modules/reporting-analytics/repositories/analyticsRepository.js`
- Modify: `src/controllers/admin/adminController.js`

**Step 1: Replace slow ad hoc dashboard reads**

Move to:
- facts tables
- views
- stable RPCs

**Step 2: Standardize KPI definitions**

Document definitions for:
- sales volume
- license revenue
- active managers
- active apps
- low stock events
- payout status

**Step 3: Align admin controller**

The dashboard should consume only supported views/RPCs.

**Step 4: Verify dashboard parity**

Ensure the panel still exposes all required management insights.

### Task 8: Documentation and operational hardening

**Files:**
- Modify: `README.md`
- Modify: `README_JSERVICE.md`
- Create: `docs/architecture/overview.md`
- Create: `docs/architecture/data-model.md`
- Create: `docs/architecture/operations.md`

**Step 1: Rewrite architecture docs**

Make the hybrid strategy explicit.

**Step 2: Document operational responsibilities**

Clarify what lives in:
- Supabase
- Firebase
- backend Node

**Step 3: Add recovery/runbook notes**

Cover webhook failures, queue backlog, auth provider degradation, and reporting lag.

**Step 4: Final verification**

Cross-check docs against schema and backend code.
