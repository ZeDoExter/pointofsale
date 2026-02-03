# POS Flow & Status (Feb 3, 2026)

## Current Status
- ✅ **Manager Dashboard**: Works with Settings tab to create/manage Cashier accounts
- ✅ **Cashier Dashboard**: 3-column layout with table sessions, orders, stats
- ✅ **Admin Dashboard**: Create/manage Organizations, Managers
- 🚧 **Catalog Management**: Needs implementation
- 🚧 **User Menu (QR)**: Basic structure, needs catalog integration
- 🚧 **Payments**: Not integrated yet

## Tested Flows
- Admin creates Organization + Branch
- Admin creates Manager account, assigns to Organization (Branch is optional for managers)
- Manager logs in → gets Organization context via JWT
- Manager can see their branches via `/api/manager/branches` → auto-selects single branch
- Manager creates Cashier accounts for their branches
- Cashier can login and manage table sessions

## Backend Endpoints (Implemented)
### Auth Service
- `POST /api/auth/login` - User login (returns JWT with org_id, branch_id, role)
- `GET /api/manager/branches` - Manager's branches (filtered by org_id from JWT)
- `GET /api/users/cashiers` - List cashiers (optional branch_id filter)
- `POST /api/users/cashiers` - Create cashier (manager-only, validates branch in org)
- `DELETE /api/users/cashiers/{id}` - Delete cashier (manager-only, scoped to org)
- `POST /api/users/managers` - Create manager account (admin-only)
- `DELETE /api/users/managers/{id}` - Delete manager (admin-only)
- `PUT /api/users/managers/{id}` - Assign organization to manager

## Frontend Components (Implemented)
- `ManagerDashboard.jsx` - 3 tabs: Overview (stats), Orders (table), Settings (add cashier)
- `CashierDashboard.jsx` - 3 columns: Sessions, Orders, Stats
- `AdminDashboard.jsx` - 2 tabs: Managers, Organizations
- `UserMenu.jsx` - Customer menu for QR flow (basic)

## Next Work Targets
1. **Catalog Management** - Manager builds product types/options, availability flags, prices
   - Backend: Product, ProductType, ProductOption tables + API endpoints
   - Frontend: Manager catalog UI with live availability toggle
   
2. **User Menu Enhancement** - Wire to catalog, show option groups, required flags
   - Parse product options in order items
   - Validate required options before checkout
   
3. **Table Session API** - Real backend sessions (currently on cashier frontend only)
   - `POST /api/qr-sessions` - Create session with table_id, branch_id, generate token
   - `GET /api/qr-sessions?status=OPEN` - List open sessions by branch
   - `PUT /api/qr-sessions/{id}/close` - Close session (settle bill)
   
4. **Order Service Integration** - Accept session_token, tie orders to tables
   - Capture `qr_session_token` and `table_id` in order
   - Broadcast order updates via WebSocket by branch/org
   
5. **Payments** - Payment-service integration for checkout
   - Finalize order total (catalog price + options + promotions)
   - Accept payment method, mark order PAID
   
6. **Notifications** - Real-time updates for kitchen/cashier
   - Order created → kitchen staff sees on screen
   - Order ready → cashier notified, customer can collect

## Known Issues & TODOs
- [ ] Password hashing (currently plain text with "dev:" prefix)
- [ ] QR sessions not persisted to database yet
- [ ] Cashier dashboard uses client-side sessions (needs API integration)
- [ ] User menu doesn't show real catalog products
- [ ] Permissions/RBAC not fully enforced per endpoint
- [ ] WebSocket for real-time updates not implemented
- [ ] Promotion-service not integrated

## Testing Checklist (WIP)
- [x] Create/list organizations
- [x] Create/list branches for organization
- [x] Admin can create manager accounts
- [x] Manager sees their branches
- [x] Manager can create cashier accounts
- [x] Cashier can login
- [ ] Manager edits product catalog
- [ ] User sees catalog in QR menu
- [ ] Cashier opens table session, gets QR link
- [ ] Customer orders via QR link
- [ ] Order appears on cashier dashboard
- [ ] Kitchen sees order status changes
- [ ] Payment processes successfully
