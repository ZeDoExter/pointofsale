# 🏗️ Multi-Tenant POS System - New Schema Design

## 📊 System Architecture

```
Admin (Super User)
  └── Organizations (ร้าน)
       ├── Manager (ดูแลร้าน)
       └── Branches (สาขา)
            ├── Cashier (ดูแลสาขา)
            ├── Tables
            ├── QR Sessions
            └── Orders
```

## 🎯 User Roles & Permissions

| Role     | Scope              | Permissions |
|----------|-------------------|-------------|
| **Admin**    | ทุกอย่าง | สร้าง/แก้ไข Organizations, Managers, Branches, Cashiers, เห็นทุก report |
| **Manager**  | Organization ที่ได้รับมอบหมาย | สร้าง/แก้ไข Branches, Cashiers, Promotions, เห็น report ของร้านตัวเอง |
| **Cashier**  | Branch ที่ได้รับมอบหมาย | จัดการ Orders, Tables, เห็น report เฉพาะสาขา |

---

## 🗄️ New Database Schema (OLTP)

### 1. Organizations (ร้าน/องค์กร)
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,  -- for URL: abc-restaurant
  
  -- Contact info
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  
  -- Subscription/billing
  plan_type VARCHAR(50) DEFAULT 'FREE',  -- FREE, BASIC, PREMIUM
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_active ON organizations(is_active);
```

### 2. Branches (สาขา)
```sql
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,  -- "สาขาสยาม", "สาขาเซ็นทรัล"
  slug VARCHAR(100) NOT NULL,  -- "siam", "central"
  
  -- Address
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  
  -- Contact
  phone VARCHAR(50),
  email VARCHAR(255),
  
  -- Operating hours
  opening_time TIME,
  closing_time TIME,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(organization_id, slug)
);

CREATE INDEX idx_branches_org ON branches(organization_id);
CREATE INDEX idx_branches_active ON branches(is_active);
```

### 3. Users (Staff - แยกตาม role และ scope)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Profile
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  
  -- Role & Scope
  role VARCHAR(20) NOT NULL,  -- 'ADMIN', 'MANAGER', 'CASHIER'
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- NULL for ADMIN
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,             -- NULL for ADMIN/MANAGER
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_role CHECK (role IN ('ADMIN', 'MANAGER', 'CASHIER')),
  CONSTRAINT role_scope_check CHECK (
    (role = 'ADMIN' AND organization_id IS NULL AND branch_id IS NULL) OR
    (role = 'MANAGER' AND organization_id IS NOT NULL AND branch_id IS NULL) OR
    (role = 'CASHIER' AND organization_id IS NOT NULL AND branch_id IS NOT NULL)
  )
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_active ON users(is_active);
```

### 4. Tables (โต๊ะ - แยกตาม branch)
```sql
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  
  table_number INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  capacity INT NOT NULL DEFAULT 4,
  
  -- Location in restaurant
  zone VARCHAR(50),  -- 'indoor', 'outdoor', 'vip'
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(branch_id, table_number)
);

CREATE INDEX idx_tables_branch ON tables(branch_id);
CREATE INDEX idx_tables_active ON tables(branch_id, is_active);
```

### 5. QR Sessions
```sql
CREATE TABLE qr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  
  qr_token VARCHAR(100) NOT NULL UNIQUE,
  
  -- Session state
  is_active BOOLEAN NOT NULL DEFAULT true,
  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP,
  
  -- Linked order (when checkout)
  order_id UUID REFERENCES orders(id)
);

CREATE INDEX idx_qr_sessions_table ON qr_sessions(table_id);
CREATE INDEX idx_qr_sessions_branch ON qr_sessions(branch_id, is_active);
CREATE INDEX idx_qr_sessions_token ON qr_sessions(qr_token);
```

### 6. Orders (คำสั่งซื้อ)
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  
  order_number INT NOT NULL,  -- auto-increment per branch per day
  
  -- Source
  table_id UUID REFERENCES tables(id),
  qr_session_id UUID REFERENCES qr_sessions(id),
  order_type VARCHAR(20) NOT NULL DEFAULT 'DINE_IN',  -- DINE_IN, TAKEAWAY, DELIVERY
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  
  -- Totals (cached)
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  service_charge NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Staff
  created_by UUID REFERENCES users(id),  -- NULL for guest
  served_by UUID REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  completed_at TIMESTAMP,
  paid_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('OPEN', 'CONFIRMED', 'COMPLETED', 'PAID', 'CANCELLED')),
  CONSTRAINT valid_order_type CHECK (order_type IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY'))
);

CREATE INDEX idx_orders_branch ON orders(branch_id, created_at DESC);
CREATE INDEX idx_orders_org ON orders(organization_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(DATE(created_at), branch_id);
```

### 7. Order Items
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Menu item (snapshot)
  menu_item_id VARCHAR(50) NOT NULL,
  menu_item_name VARCHAR(255) NOT NULL,
  menu_category VARCHAR(100),
  
  -- Pricing
  quantity INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  item_total NUMERIC(10, 2) NOT NULL,
  
  -- Customization
  notes TEXT,
  modifiers JSONB,  -- [{name: "Extra cheese", price: 20}]
  
  -- Status
  item_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  
  -- Staff
  added_by UUID REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  prepared_at TIMESTAMP,
  served_at TIMESTAMP,
  
  CONSTRAINT valid_item_status CHECK (item_status IN ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'))
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_status ON order_items(item_status);
```

### 8. Promotions (โปรโมชั่น - แยกตาม branch)
```sql
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Discount
  discount_type VARCHAR(20) NOT NULL,  -- FIXED_AMOUNT, PERCENTAGE
  discount_value NUMERIC(10, 2) NOT NULL,
  max_discount NUMERIC(10, 2),
  min_order_total NUMERIC(10, 2),
  
  -- Scope: NULL = all branches, specific branch_id = only that branch
  branch_id UUID REFERENCES branches(id),
  
  -- Validity
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  
  -- Limits
  max_usage_count INT,
  current_usage_count INT DEFAULT 0,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(organization_id, code),
  CONSTRAINT valid_discount_type CHECK (discount_type IN ('FIXED_AMOUNT', 'PERCENTAGE'))
);

CREATE INDEX idx_promotions_org ON promotions(organization_id);
CREATE INDEX idx_promotions_branch ON promotions(branch_id);
CREATE INDEX idx_promotions_active ON promotions(is_active);
```

### 9. Payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  
  amount NUMERIC(12, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  
  external_payment_id VARCHAR(255) UNIQUE,
  failure_reason TEXT,
  
  processed_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  CONSTRAINT valid_payment_status CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'))
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
```

---

## 📈 Data Warehouse Schema (OLAP)

### Star Schema for Daily Reports

```sql
-- Fact Table: Order Facts
CREATE TABLE fact_orders (
  fact_id BIGSERIAL PRIMARY KEY,
  
  -- Foreign Keys (dimensions)
  date_key INT NOT NULL,           -- 20260203
  time_key INT NOT NULL,           -- 143000 (14:30:00)
  organization_key UUID NOT NULL,
  branch_key UUID NOT NULL,
  user_key UUID,
  
  -- Order info
  order_id UUID NOT NULL,
  order_number INT NOT NULL,
  order_type VARCHAR(20),
  
  -- Measures (metrics)
  subtotal NUMERIC(12, 2),
  tax NUMERIC(12, 2),
  discount_amount NUMERIC(12, 2),
  service_charge NUMERIC(12, 2),
  total_amount NUMERIC(12, 2),
  
  item_count INT,
  
  -- Timestamps
  order_created_at TIMESTAMP,
  order_paid_at TIMESTAMP,
  
  -- Duration (minutes)
  order_duration_minutes INT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fact_orders_date ON fact_orders(date_key, branch_key);
CREATE INDEX idx_fact_orders_branch ON fact_orders(branch_key, date_key);
CREATE INDEX idx_fact_orders_org ON fact_orders(organization_key, date_key);

-- Dimension: Date
CREATE TABLE dim_date (
  date_key INT PRIMARY KEY,        -- 20260203
  full_date DATE NOT NULL,
  day_of_week VARCHAR(10),
  day_of_month INT,
  day_of_year INT,
  week_of_year INT,
  month INT,
  month_name VARCHAR(10),
  quarter INT,
  year INT,
  is_weekend BOOLEAN,
  is_holiday BOOLEAN
);

-- Dimension: Time
CREATE TABLE dim_time (
  time_key INT PRIMARY KEY,        -- 143000
  time_value TIME NOT NULL,
  hour INT,
  minute INT,
  hour_name VARCHAR(10),           -- "14:00", "15:00"
  period VARCHAR(10)               -- "morning", "afternoon", "evening", "night"
);

-- Aggregate Tables (pre-calculated)
CREATE TABLE agg_daily_sales (
  date_key INT NOT NULL,
  branch_id UUID NOT NULL,
  
  order_count INT,
  total_revenue NUMERIC(12, 2),
  total_discount NUMERIC(12, 2),
  total_tax NUMERIC(12, 2),
  avg_order_value NUMERIC(12, 2),
  
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (date_key, branch_id)
);

CREATE TABLE agg_hourly_sales (
  date_key INT NOT NULL,
  time_key INT NOT NULL,
  branch_id UUID NOT NULL,
  
  order_count INT,
  total_revenue NUMERIC(12, 2),
  
  PRIMARY KEY (date_key, time_key, branch_id)
);
```

---

## 🔌 API Endpoints Redesign

### Authentication
- `POST /api/auth/login` - Login (ส่ง org/branch context กลับมาด้วย)
- `POST /api/auth/register-org` - Admin สร้าง organization ใหม่
- `GET /api/auth/me` - ดูข้อมูลตัวเอง + scope

### Organizations (Admin only)
- `GET /api/orgs` - List all organizations
- `POST /api/orgs` - Create organization
- `GET /api/orgs/:id` - Get organization details
- `PUT /api/orgs/:id` - Update organization
- `DELETE /api/orgs/:id` - Delete organization

### Branches (Admin, Manager)
- `GET /api/orgs/:orgId/branches` - List branches in organization
- `POST /api/orgs/:orgId/branches` - Create branch
- `GET /api/branches/:id` - Get branch details
- `PUT /api/branches/:id` - Update branch
- `DELETE /api/branches/:id` - Delete branch

### Users (Admin, Manager)
- `GET /api/orgs/:orgId/users` - List users in organization
- `POST /api/orgs/:orgId/users` - Create user (Manager/Cashier)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Orders (All roles, filtered by scope)
- `GET /api/branches/:branchId/orders` - List orders
- `POST /api/branches/:branchId/orders` - Create order
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id` - Update order
- `POST /api/orders/:id/items` - Add item
- `DELETE /api/orders/:id/items/:itemId` - Remove item
- `PUT /api/orders/:id/status` - Update status

### Tables (Branch level)
- `GET /api/branches/:branchId/tables` - List tables
- `POST /api/branches/:branchId/tables` - Create table
- `PUT /api/tables/:id` - Update table
- `DELETE /api/tables/:id` - Delete table

### Promotions (Org/Branch level)
- `GET /api/orgs/:orgId/promotions` - List promotions
- `POST /api/orgs/:orgId/promotions` - Create promotion
- `POST /api/branches/:branchId/promotions` - Create branch-specific promotion
- `GET /api/promotions/:id` - Get promotion
- `PUT /api/promotions/:id` - Update promotion

### Reports (Filtered by role scope)
- `GET /api/reports/daily-sales?date=2026-02-03&branchId=xxx`
- `GET /api/reports/hourly-sales?date=2026-02-03&branchId=xxx`
- `GET /api/reports/top-items?startDate=&endDate=&branchId=xxx`
- `GET /api/reports/cashier-performance?startDate=&endDate=&branchId=xxx`

---

## 🚀 Implementation Plan

### Phase 1: Core Schema (Week 1)
- [ ] Create new schema file
- [ ] Migration scripts
- [ ] Seed sample data (1 org, 2 branches, 3 users)

### Phase 2: Auth & RBAC (Week 1-2)
- [ ] Update auth service with new roles
- [ ] Implement scope checking middleware
- [ ] Add org/branch context to JWT

### Phase 3: Organizations & Branches (Week 2)
- [ ] Organization CRUD endpoints
- [ ] Branch CRUD endpoints
- [ ] User management with role assignment

### Phase 4: Orders with Multi-tenancy (Week 2-3)
- [ ] Update order service with branch context
- [ ] Update table management
- [ ] Update QR session management

### Phase 5: Promotions with Branch Scope (Week 3)
- [ ] Update promotion service
- [ ] Branch-specific promotions
- [ ] Promotion validation with branch check

### Phase 6: Data Warehouse & Reports (Week 3-4)
- [ ] ETL process (OLTP → OLAP)
- [ ] Star schema implementation
- [ ] Daily/hourly aggregation jobs
- [ ] Report APIs

### Phase 7: WebSocket for Real-time (Week 4)
- [ ] WebSocket service
- [ ] Branch-specific channels
- [ ] Real-time order updates
- [ ] Kitchen display updates

---

## 💡 Key Design Decisions

### 1. Multi-tenancy Strategy: **Row-level isolation**
- Pros: Simple, one database, good for small-medium scale
- Cons: Need careful query filtering

### 2. Normalization vs Performance
- **Normalized** (3NF): organizations → branches → tables → orders
- **Denormalized** (Star Schema): Pre-aggregated for reports
- Use both: OLTP (normalized) + OLAP (denormalized)

### 3. Promotions Scope
- Organization-wide: `branch_id IS NULL`
- Branch-specific: `branch_id = 'xxx'`
- Validation: Check both org-wide and branch-specific

### 4. Order Numbers
- Reset per branch per day
- Format: `B001-20260203-0001` (branch-date-number)

### 5. Performance Optimization
- Indexes on: `(branch_id, created_at DESC)`
- Partition orders table by month
- Materialized views for reports
- Cache frequently accessed data (Redis)

---

ต้องการให้ผมเริ่ม implement จากส่วนไหนก่อนครับ? 🎯
