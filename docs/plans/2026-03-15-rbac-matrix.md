# RBAC Matrix - J+SERVICES

Date: 2026-03-15

## Purpose

This document defines the target authorization model for the unified J+SERVICES platform.
It is the reference for frontend route protection, backend authorization checks, user provisioning,
and future Google Auth / Supabase Auth integration.

The platform is:

- multi-user
- multi-role
- centrally administered by an internal `admin`

## Canonical Roles

### `admin`

Internal central operator.

Responsibilities:

- creates and manages operational users
- supervises platform activity
- accesses monitoring and audit trails
- manages payouts, licenses, settings, and backend tools

Scope:

- global platform scope
- unrestricted internal control plane access

### `client`

Operational tenant user.

Responsibilities:

- voucher stock visibility
- transaction follow-up
- license and stock follow-up within assigned scope

Scope:

- restricted to own tenant / perimeter
- no global administration

### `reseller`

Commercial partner user.

Responsibilities:

- promo code usage
- commission tracking
- payout requests
- personal commercial history

Scope:

- restricted to own commercial account
- no internal operational access

## Role Model Summary

| Role | Internal / External | Global Scope | Can Manage Users | Can Access Monitoring | Can Access Settings |
|---|---|---:|---:|---:|---:|
| `admin` | Internal | Yes | Yes | Yes | Yes |
| `client` | Internal ops | No | No | Limited local | No |
| `reseller` | External/commercial | No | No | No | No |

## Permission Set

### Admin Permissions

- `admin.users.create`
- `admin.users.update`
- `admin.users.suspend`
- `admin.managers.create`
- `admin.managers.update`
- `admin.managers.suspend`
- `admin.resellers.create`
- `admin.resellers.update`
- `admin.resellers.suspend`
- `admin.transactions.read_all`
- `admin.licenses.read_all`
- `admin.licenses.generate`
- `admin.licenses.batches.read`
- `admin.payouts.read_all`
- `admin.payouts.process`
- `admin.audit.read`
- `admin.monitoring.read`
- `admin.settings.read`
- `admin.settings.update`
- `admin.exports.transactions`
- `admin.tools.backend`

### Client Permissions

- `client.dashboard.read`
- `client.transactions.read_own`
- `client.vouchers.read_own`
- `client.vouchers.sync`
- `client.licenses.read_own`
- `client.stock.read_own`
- `client.branding.update_own`

Explicitly forbidden:

- user management
- global payouts processing
- global monitoring
- global settings
- global audit logs

### Reseller Permissions

- `reseller.dashboard.read`
- `reseller.commissions.read_own`
- `reseller.promo_code.read_own`
- `reseller.promo_code.update_own`
- `reseller.payouts.read_own`
- `reseller.payouts.request`

Explicitly forbidden:

- client operations handled outside reseller scope
- license operations
- internal monitoring
- system settings
- user provisioning

## Frontend Route Matrix

### Public Routes

- `/`
- `/auth`
- `/auth/admin`
- `/auth/partners`

Access:

- unauthenticated users allowed

### Admin Routes

- `/admin`

Allowed roles:

- `admin`

Denied roles:

- `manager`
- `reseller`

### Client Routes

- `/client`

Allowed roles:

- `client`
- optionally `admin` for supervision mode

Denied roles:

- `reseller`

### Reseller Routes

- `/partners`

Allowed roles:

- `reseller`
- optionally `admin` for supervision mode

Denied roles:

- `manager`

## Backend Route Matrix

### Current Admin Backend

File:

- `/home/juste-dev/Documents/TiketMomo/src/routes/admin/adminRoutes.js`

Protected by:

- `requireAdminAuth`

Target role:

- `admin`

### Current Client APIs

Files:

- `/home/juste-dev/Documents/TiketMomo/src/routes/managerRoutes.js`
- `/home/juste-dev/Documents/TiketMomo/src/routes/salesRoutes.js`
- `/home/juste-dev/Documents/TiketMomo/src/routes/voucherRoutes.js`
- `/home/juste-dev/Documents/TiketMomo/src/routes/reportRoutes.js`

Protected by:

- `requireAuth`

Target role:

- `manager`

Gap:

- current middleware resolves identity but does not yet expose a normalized role policy layer

### Current Reseller APIs

File:

- `/home/juste-dev/Documents/TiketMomo/src/routes/partner/partnerRoutes.js`

Protected by:

- `requirePartnerAuth`

Target role:

- `reseller`

Gap:

- JWT currently stores `role: 'partner'`
- this should converge to `role: 'reseller'` or a documented alias mapping

## Canonical Naming Decision

Recommended canonical role names:

- `admin`
- `manager`
- `reseller`

UI labels may still use:

- `Partner`
- `Partenaire`
- `Reseller`

But backend policy should normalize to a single internal role value:

- `reseller`

## Identity and Auth Strategy

### Current State

- `admin`: server token via `ADMIN_DASHBOARD_TOKEN`
- `manager`: authenticated identity resolution via `requireAuth`
- `reseller`: internal JWT cookie via `partner_token`

### Target State

- one identity system
- one normalized user object
- one role field
- route guards and action checks based on permissions

Recommended target claims:

```json
{
  "sub": "user-or-identity-id",
  "role": "admin | manager | reseller",
  "scope_id": "tenant-or-user-id",
  "email": "user@example.com"
}
```

### Admin Login Evolution

Recommended migration path:

1. keep `ADMIN_DASHBOARD_TOKEN` as emergency fallback
2. add Google OAuth / Supabase Auth
3. restrict admin login with email allowlist
4. issue normalized admin session
5. progressively remove token-only admin login from normal flow

## Enforcement Rules

### Rule 1

No frontend route should be considered secure by itself.
Backend authorization must remain the source of truth.

### Rule 2

Managers can only act on their own manager scope.

### Rule 3

Resellers can only access their own reseller scope.

### Rule 4

Admin can supervise all scopes but destructive actions should still be auditable.

### Rule 5

Any action that changes money, licenses, or account state should generate an audit log.

## Audit Requirements

The following actions must be logged:

- admin login
- manager creation / update / suspension
- reseller creation / update / suspension
- payout approval / rejection
- license generation
- settings update
- promo code changes

Minimum audit fields:

- actor id
- actor role
- action
- target type
- target id
- timestamp
- metadata

## Implementation Phases

### Phase 1

Document and normalize role names.

Deliverables:

- this RBAC matrix
- internal agreement on `admin / manager / reseller`

### Phase 2

Introduce permission-aware auth context in backend middleware.

Deliverables:

- normalized `req.user.role`
- permission helpers
- route authorization checks

### Phase 3

Protect frontend routes according to normalized roles.

Deliverables:

- route guards in Next.js
- role-aware redirects

### Phase 4

Replace admin token flow with proper identity provider login.

Deliverables:

- Google / Supabase Auth for admin
- allowlist enforcement
- fallback token retained only for emergency access

## Immediate Technical Recommendation

The next implementation step should be:

1. normalize role vocabulary to `admin`, `manager`, `reseller`
2. add a backend authorization helper layer
3. keep the current auth mechanisms temporarily
4. only then migrate admin login to Google Auth

This order reduces product confusion and avoids building OAuth on top of an unclear role model.
