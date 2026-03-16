# Canonical Role Migration

Date: 2026-03-16

## Purpose

This document is the reference for the current role migration in the application layer.

It explains:

- canonical product names
- legacy names still accepted for compatibility
- what is already migrated
- what remains legacy at the storage level

## Canonical Product Roles

The platform now converges to 3 canonical workspaces:

1. `admin`
2. `client`
3. `reseller`

Canonical business meaning:

- `admin`: central control plane
- `client`: receives voucher stock from `Mikhmo AI`, monitors stock, license, distribution
- `reseller`: commercial actor for promo codes, commissions, payouts, license/product sales

## Legacy Compatibility Mapping

Application compatibility still accepts historical names:

| Legacy name | Canonical name | Notes |
|---|---|---|
| `manager` | `client` | kept in routes, cookies, repository aliases, DB columns |
| `partner` | `reseller` | kept in routes, controller aliases, UI compatibility exports |

## Current Compatibility Rules

### Routes

Canonical routes:

- `/client`
- `/reseller`
- `/api/v1/clients/*`
- `/resellers/*`

Legacy routes still accepted:

- `/manager`
- `/partners`
- `/api/v1/managers/*`
- `/api/v1/partners/*`

### Sessions and Identity

Canonical session cookie:

- `client_session`

Legacy session cookie still accepted:

- `manager_session`

Resolved identity now exposes:

- `client_id`
- `manager_id`

Reason:

- new code should read `client_id`
- old code can still read `manager_id`

### Services and Repositories

Canonical facades now exist for:

- `ClientRepository`
- `ClientOnboardingService`
- `sendPushToClient`
- `createClientAccount`
- `updateClientStatus`
- `getTransactionsByClient`

Legacy aliases are intentionally preserved to avoid breaking older controllers and flows.

## Storage Reality

The database schema is not fully renamed yet.

Storage still uses several historical columns/tables such as:

- `managers`
- `manager_id`
- `manager_apps`

This is acceptable for now because:

- application behavior has already been migrated toward canonical product language
- compatibility risk is lower than forcing a rushed SQL migration

## Product Truth

### Client stock flow

The client does not manually import voucher stock.

Real flow:

1. `Mikhmo AI` generates stock
2. `Mikhmo AI` sends stock to backend
3. backend stores and exposes stock
4. `client` monitors and uses received stock

So the client dashboard is:

- stock received from `Mikhmo AI`
- sync health
- license/subscription visibility
- distribution workspace

It is not:

- a stock generation tool
- a manual upload console

### Reseller commercial flow

The reseller dashboard is commercial and financial:

- promo code activity
- commissions
- payouts
- sales visibility

It is not a voucher stock ownership area.

## Contribution Rules

When writing new application code:

- prefer `client` over `manager`
- prefer `reseller` over `partner`
- prefer `client_id` in application objects
- keep `manager_id` only when interacting with current storage or legacy interfaces
- do not introduce new business-facing labels using `manager` or `partner`

When touching legacy code:

- migrate naming at the application/service layer first
- keep aliases if the change could break routes, sessions, or old integrations
- only rename storage structures after explicit migration planning

## Remaining Legacy Zones

The main remaining legacy surface is storage-oriented:

- SQL tables and columns using `manager_*`
- some historical HTML/admin views
- some old comments or helper names

The migration priority order is:

1. application language
2. API contracts
3. tests and documentation
4. storage/schema renaming later if needed
