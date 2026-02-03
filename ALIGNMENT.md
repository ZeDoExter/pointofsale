# Alignment Snapshot

Date: 2026-02-03

## Backend (auth-service)
- Endpoints in use: `/api/organizations` (GET/POST/DELETE), `/api/organizations/{orgId}/branches`, `/api/users/managers` (GET + POST + DELETE), `/api/auth/login`, `/api/auth/me`.
- Manager directory: optional `organization_id` filter no longer causes uuid/text errors.
- Manager creation: POST `/api/users/managers` (admin only) with `{username, password, name, organization_id?, branch_id?}`; stores a dev password placeholder.
- Manager deletion: DELETE `/api/users/managers/{id}` (admin only, hard delete).
- Authorization headers expected: `X-User-Role`, `X-Organization-ID`, `X-Branch-ID` for org/branch reads.

## Frontend (AdminDashboard)
- Flow: create manager account first (username/name/password), then optionally create org/branch; unassigned managers are shown in a separate list; managers can be deleted from either list.
- Data pulls: organizations → branches per expanded org via `/api/organizations/{orgId}/branches`; managers per org via `/api/users/managers?organization_id=...`; global managers via `/api/users/managers` (no filter).
- UI: header focuses on “Add Manager Account”; org form toggles inside the Organizations section. Each org row has Add Branch + Delete Org buttons.
- Logout clears local storage auth context and returns to `/admin/login`.

## Database
- Schema tables in play: organizations, branches, users, tables, qr_sessions, orders, order_items, promotions, promotion_usage, order_discounts, payments, payment_methods (see database/schema.sql).
- Seed reset (`database/seed_v2.sh`): truncates all tenant data and inserts a single admin user only; no organizations/branches/orders/managers/cashiers remain.
- Test credential: admin / anypassword (password not enforced yet).

## Notes / Gaps
- Adding managers still needs a backend endpoint plus UI flow.
- If new org/branch rows are needed, use the compact forms on Manager Accounts page; consider automating seed run on cluster when ready.
