# Schema Gap Notes

## Confirmed mismatches between code and schema

- `src/services/cronService.js` used `vouchers.updated_at`, but the previous `vouchers` table did not define it.
- `src/models/voucherModel.js` wrote `site_id`, but the previous `vouchers` table did not define it.
- `scripts/analyze.js` still imported `src/config/db.js`, which no longer exists after the Supabase migration.
- `src/controllers/admin/adminController.js` depended on RPCs that were absent from the master schema:
  - `get_admin_tx_stats`
  - `get_revenue_history_7d`
  - `get_license_type_stats`
  - `get_low_stock_managers`
  - `get_total_commissions_30d`
  - `refund_reseller_balance`
- The platform needed multi-app entities that were not yet present in the schema:
  - `apps`
  - `manager_apps`
  - `auth_identities`
  - `licenses`
  - `license_entitlements`
  - `operational_events`
  - `sync_jobs`
  - `analytics_daily_facts`

## Applied direction

- The master schema is now the single contract for the current runtime and the next platform phase.
- Existing runtime tables remain compatible.
- Missing admin/reporting RPCs are now first-class schema objects.
- Platform tables were added additively to support multi-app evolution.
