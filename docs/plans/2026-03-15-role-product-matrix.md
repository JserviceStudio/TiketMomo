# TiketMomo Role Product Matrix

Date: 2026-03-15

## Canonical spaces

The product should converge to 3 isolated web apps:

1. `admin`
2. `reseller`
3. `client`

`manager` is no longer a canonical business role.

## Core rule

The entry page is not a shared dashboard.

It is an access-intro and routing layer:

- detect active session
- redirect to the right app
- otherwise let the user choose their workspace

Each workspace must have:

- its own navigation
- its own terminology
- its own feature scope
- no cross-role menu pollution

## Role matrix

### Admin

Purpose:

- global command center
- platform supervision
- account lifecycle
- monitoring
- license and billing control
- audit and backend operations

Main modules:

- monitoring / observability
- account management
- reseller management
- client management
- license batches and activations
- payout review
- audit logs
- system settings
- sync health

Must not behave like:

- a sales workspace
- a client self-service portal

### Reseller

Purpose:

- sell products
- sell licenses
- manage promo codes
- track sales and earnings

Main modules:

- sales dashboard
- promo code management
- product / license offers
- commissions or margins
- payout requests
- sales history

Must not include:

- voucher stock ownership
- platform settings
- global monitoring

### Client

Purpose:

- own received voucher stock
- manage boutique web
- manage active subscription or license
- renew subscription or license

Main modules:

- voucher stock
- voucher synchronization status
- distribution status
- boutique configuration
- active plan / subscription
- renewal and billing history
- account settings

Must not include:

- reseller sales tooling
- platform-wide operations

## Business truth

### Voucher ownership

Voucher stock belongs to the `client`.

`Mikhmo AI` generates stock and sends it to the backend.

The client manages and monitors the received stock from the client dashboard.

### Sales responsibility

License sales, product sales, and promo code activity belong to the `reseller`.

### Platform authority

`admin` remains the central authority for the SaaS and backend control plane.

## Reference models

These references are not copied visually. They are used as structural inspiration.

### Admin inspiration

- Vercel Usage dashboard
- Vercel Observability / Monitoring

Why:

- team-level control plane
- clear split between usage, observability, settings, and operations
- concise sidebar model for high-signal admin workflows

References:

- https://vercel.com/docs/platform/usage/
- https://vercel.com/docs/monitoring
- https://vercel.com/docs/observability

### RBAC inspiration

- Supabase custom claims and RBAC
- Clerk organizations roles and permissions

Why:

- permissions should be feature-based, not page-only
- active role/context must be explicit
- backend remains the enforcement point

References:

- https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
- https://clerk.com/docs/organizations/roles-permissions
- https://clerk.com/docs/how-to/organizations

### Client portal inspiration

- Stripe customer portal
- Stripe customer management
- Shopify customer accounts and subscription management

Why:

- self-service account model
- active subscription visibility
- renewal and billing actions
- customer autonomy without admin intervention

References:

- https://docs.stripe.com/no-code/customer-portal
- https://docs.stripe.com/customer-management
- https://docs.stripe.com/subscriptions
- https://help.shopify.com/en/manual/customers/customer-accounts/manage
- https://help.shopify.com/en/manual/products/purchase-options/subscriptions/shopify-subscriptions/customer-experience
- https://help.shopify.com/en/manual/products/purchase-options/subscriptions/manage-subscriptions/manage-customer-subscriptions

### Reseller inspiration

- role separation from Clerk organizations
- billing / access separation patterns from Stripe platform products

Why:

- reseller is a commercial actor
- reseller tooling should focus on sales, promo, payouts, and revenue

References:

- https://clerk.com/docs/organizations/roles-permissions
- https://docs.stripe.com/subscriptions

### Firebase usage constraint

Firebase custom claims should only be used for access control metadata, not business data.

Why:

- business state must remain in backend-managed storage
- claims are for access, not as the source of truth

References:

- https://firebase.google.com/docs/auth/admin/custom-claims
- https://firebase.google.com/docs/auth/admin/create-custom-tokens

## Architecture decision

### Frontend

Next.js should host isolated route groups:

- `/admin`
- `/reseller`
- `/client`
- `/auth`

### Backend

Express remains the orchestration layer:

- role enforcement
- domain logic
- sync coordination
- audit
- API composition

### Data and sync

Supabase should remain the primary web data source.

Firebase should be retained only for flows that still require it, mainly mobile/auth-related claims and compatibility paths.

The frontend should not coordinate multiple backends directly for business logic.

The frontend talks to Express.

Express coordinates:

- Supabase
- Firebase
- domain services

## Immediate refactor path

1. Replace `partners` UI label with `reseller`
2. Replace `manager` business role with `client`
3. Move voucher modules to `client`
4. Keep sales / promo / payout in `reseller`
5. Keep monitoring / settings / accounts in `admin`
6. Align RBAC and routes with `admin`, `reseller`, `client`

## Code implications

Areas already needing migration:

- current `partners` app should become `reseller`
- current `manager` app should become `client`
- voucher routes and UI must move under client-facing flows
- docs and RBAC matrix must stop treating `manager` as canonical

## Non-goals

- no universal sidebar across all roles
- no “public marketing home” as the main product shell
- no duplicate business ownership between reseller and client
