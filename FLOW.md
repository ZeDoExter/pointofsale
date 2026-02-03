# POS Flow & Next Steps (Feb 3, 2026)

## Flows to Keep in Mind
- Admin: manages organizations/branches, views manager accounts (last login, org, branch). No kitchen link.
- Manager: builds catalog (product types/options, availability, price delta); needs persistence + availability flags; eventually exposed to cashier/user menu.
- Cashier: opens table sessions, shares QR link, creates orders tied to active session/table; monitors orders, updates status; no kitchen link.
- User (QR): opens `/user?session=token&table=X`, table prefilled/locked; creates orders tagged with session token and table id; polls order status.

## Backend Work Targets (proposed order)
1) **Table sessions API**: `POST /api/qr-sessions` (create/open), `PUT /api/qr-sessions/{id}/close`, `GET /api/qr-sessions?status=OPEN` per branch; store token, table_id, branch/org; reuse in order creation.
2) **Order-service hookup**: accept `qr_session_token`, resolve `qr_sessions.qr_code_token` → set `qr_session_id` + `table_id` + branch/org; emit websocket events (notification-service) scoped by branch/org.
3) **Catalog persistence**: add product types/options endpoints (manager-only) with availability, required flags, price delta; cache snapshot into orders.
4) **Menu source of truth**: user menu pulls catalog; cashier order form uses same catalog; enforce availability flags.
5) **Payments/billing**: finalize order totals; integrate payment-service for checkout and closing sessions (one bill per session/table).

## Frontend Follow-ups
- Replace cashier local sessions with real API; render QR link from backend token.
- Manager catalog UI: wire to new endpoints; sync availability/price data into user menu.
- User menu: show option groups, required flags, price adjustments; push session token on order create.

## Testing Checklist
- Create/close session, open QR link, place order → order is scoped to branch/org and appears on cashier list.
- Manager marks product unavailable → disappears/disabled in user menu; cashier cannot order it.
- Order lifecycle: OPEN → CONFIRMED → PAID; totals match catalog + options; websocket updates broadcast.
