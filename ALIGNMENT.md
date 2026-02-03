# Alignment Snapshot

Date: 2026-02-03

## Backend (auth-service)
- Endpoints in use: `/api/organizations`, `/api/organizations/{orgId}/branches`, `/api/users/managers`, `/api/auth/login`, `/api/auth/me`.
- Manager directory: now handles optional `organization_id` filter without uuid/text errors; no manager creation endpoint exists yet.
- Authorization headers expected: `X-User-Role`, `X-Organization-ID`, `X-Branch-ID` for org/branch reads.

## Frontend (AdminDashboard)
- Screen shows only **Manager Accounts** with bullet list of organizations and nested branches + managers.
- Data pulls: organizations → branches per expanded org via `/api/organizations/{orgId}/branches`; managers per org via `/api/users/managers?organization_id=...`.
- Add buttons: top-level toggles compact organization form; inside an expanded org, `Add Branch` toggles a short branch form; no manager creation UI (API not available).
- Logout clears local storage auth context and returns to `/admin/login`.

## Database
- Schema tables in play: organizations, branches, users, tables, qr_sessions, orders, order_items, promotions, promotion_usage, order_discounts, payments, payment_methods (see database/schema.sql).
- Seed reset (`database/seed_v2.sh`): truncates all tenant data and inserts a single admin user only; no organizations/branches/orders/managers/cashiers remain.
- Test credential: admin / anypassword (password not enforced yet).

## Notes / Gaps
- Adding managers still needs a backend endpoint plus UI flow.
- If new org/branch rows are needed, use the compact forms on Manager Accounts page; consider automating seed run on cluster when ready.
