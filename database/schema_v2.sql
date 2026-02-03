-- ============================================================================
-- RESTAURANT POS - Multi-Tenant Schema V2
-- ============================================================================
-- Design priorities:
-- 1. Multi-tenancy (Organization → Branch isolation)
-- 2. Role-based access control (ADMIN → MANAGER → CASHIER)
-- 3. Real-time reporting (OLTP + OLAP)
-- 4. High performance (proper indexing, partitioning ready)
-- 5. Audit trail (who did what when)
-- ============================================================================

-- ============================================================================
-- CORE TABLES (Multi-tenancy)
-- ============================================================================

-- 1. ORGANIZATIONS (ร้าน/กลุ่มธุรกิจ)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  
  -- Contact info
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  
  -- Subscription
  plan_type VARCHAR(50) DEFAULT 'FREE',
  subscription_expires_at TIMESTAMP,
  
  -- Settings (JSONB for flexibility)
  settings JSONB DEFAULT '{}',
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_active ON organizations(is_active);

-- 2. BRANCHES (สาขา)
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  
  -- Address
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Thailand',
  
  -- Contact
  phone VARCHAR(50),
  email VARCHAR(255),
  
  -- Operating hours
  opening_time TIME,
  closing_time TIME,
  
  -- Settings
  timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
  tax_rate NUMERIC(5, 2) DEFAULT 7.00,
  service_charge_rate NUMERIC(5, 2) DEFAULT 0.00,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(organization_id, slug)
);

CREATE INDEX idx_branches_org ON branches(organization_id);
CREATE INDEX idx_branches_active ON branches(organization_id, is_active);

-- 3. USERS (Staff with role-based access)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Profile
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  avatar_url TEXT,
  
  -- Role & Scope
  role VARCHAR(20) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  
  -- Security
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_role CHECK (role IN ('ADMIN', 'MANAGER', 'CASHIER')),
  CONSTRAINT role_scope_check CHECK (
    (role = 'ADMIN' AND organization_id IS NULL AND branch_id IS NULL) OR
    (role = 'MANAGER' AND organization_id IS NOT NULL AND branch_id IS NULL) OR
    (role = 'CASHIER' AND organization_id IS NOT NULL AND branch_id IS NOT NULL)
  )
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================================================
-- OPERATIONAL TABLES
-- ============================================================================

-- 4. TABLES (โต๊ะในร้าน)
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  
  table_number INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  capacity INT NOT NULL DEFAULT 4,
  
  -- Location
  zone VARCHAR(50),
  floor INT DEFAULT 1,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(branch_id, table_number)
);

CREATE INDEX idx_tables_branch ON tables(branch_id);
CREATE INDEX idx_tables_active ON tables(branch_id, is_active);

-- 5. QR SESSIONS (สำหรับ QR code ordering)
CREATE TABLE qr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  
  qr_token VARCHAR(100) NOT NULL UNIQUE,
  
  -- Session state
  is_active BOOLEAN NOT NULL DEFAULT true,
  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP,
  
  -- Linked order
  order_id UUID
);

CREATE INDEX idx_qr_sessions_table ON qr_sessions(table_id);
CREATE INDEX idx_qr_sessions_branch ON qr_sessions(branch_id, is_active);
CREATE INDEX idx_qr_sessions_token ON qr_sessions(qr_token);

-- 6. ORDERS (คำสั่งซื้อ)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  
  order_number VARCHAR(50) NOT NULL,
  
  -- Source
  table_id UUID REFERENCES tables(id),
  qr_session_id UUID REFERENCES qr_sessions(id),
  order_type VARCHAR(20) NOT NULL DEFAULT 'DINE_IN',
  
  -- Customer info (optional)
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  
  -- Totals (cached for performance)
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  service_charge NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  -- Staff
  created_by UUID REFERENCES users(id),
  served_by UUID REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  completed_at TIMESTAMP,
  paid_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(branch_id, order_number),
  CONSTRAINT valid_status CHECK (status IN ('OPEN', 'CONFIRMED', 'COMPLETED', 'PAID', 'CANCELLED')),
  CONSTRAINT valid_order_type CHECK (order_type IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY'))
);

CREATE INDEX idx_orders_branch ON orders(branch_id, created_at DESC);
CREATE INDEX idx_orders_org ON orders(organization_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(branch_id, status);
CREATE INDEX idx_orders_date ON orders(branch_id, DATE(created_at));
CREATE INDEX idx_orders_table ON orders(table_id);

-- Add foreign key for qr_sessions
ALTER TABLE qr_sessions ADD CONSTRAINT fk_qr_sessions_order FOREIGN KEY (order_id) REFERENCES orders(id);

-- 7. ORDER_ITEMS (รายการอาหาร)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Menu item (snapshot at order time)
  menu_item_id VARCHAR(50) NOT NULL,
  menu_item_name VARCHAR(255) NOT NULL,
  menu_category VARCHAR(100),
  
  -- Pricing
  quantity INT NOT NULL CHECK (quantity <> 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  item_total NUMERIC(10, 2) NOT NULL,
  
  -- Customization
  notes TEXT,
  modifiers JSONB,
  
  -- Status
  item_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  
  -- Staff
  added_by UUID REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  prepared_at TIMESTAMP,
  served_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  CONSTRAINT valid_item_status CHECK (item_status IN ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'))
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_status ON order_items(item_status) WHERE item_status IN ('PENDING', 'PREPARING');

-- ============================================================================
-- PROMOTIONS & DISCOUNTS
-- ============================================================================

-- 8. PROMOTIONS (โปรโมชั่น)
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Discount
  discount_type VARCHAR(20) NOT NULL,
  discount_value NUMERIC(10, 2) NOT NULL,
  max_discount NUMERIC(10, 2),
  min_order_total NUMERIC(10, 2),
  
  -- Applicability
  applicable_order_types VARCHAR(20)[],
  applicable_days_of_week INT[],
  
  -- Validity
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  
  -- Limits
  max_usage_count INT,
  current_usage_count INT DEFAULT 0,
  max_usage_per_customer INT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_discount_type CHECK (discount_type IN ('FIXED_AMOUNT', 'PERCENTAGE'))
);

CREATE INDEX idx_promotions_org ON promotions(organization_id, is_active);
CREATE INDEX idx_promotions_branch ON promotions(branch_id, is_active);
CREATE INDEX idx_promotions_code ON promotions(code);
CREATE INDEX idx_promotions_active ON promotions(is_active, valid_from, valid_until);

-- 9. PROMOTION_USAGE (การใช้โปรโมชั่น)
CREATE TABLE promotion_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  discount_amount NUMERIC(10, 2) NOT NULL,
  
  used_by UUID REFERENCES users(id),
  used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  UNIQUE(order_id, promotion_id)
);

CREATE INDEX idx_promotion_usage_promo ON promotion_usage(promotion_id);
CREATE INDEX idx_promotion_usage_order ON promotion_usage(order_id);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

-- 10. PAYMENTS (การชำระเงิน)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  amount NUMERIC(12, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  
  -- External reference
  external_payment_id VARCHAR(255) UNIQUE,
  external_data JSONB,
  
  -- Error handling
  failure_reason TEXT,
  retry_count INT DEFAULT 0,
  
  -- Staff
  processed_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  CONSTRAINT valid_payment_status CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'))
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_date ON payments(DATE(created_at));

-- ============================================================================
-- AUDIT & LOGGING
-- ============================================================================

-- 11. AUDIT_LOGS (บันทึกการเปลี่ยนแปลง)
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  
  -- Who
  user_id UUID REFERENCES users(id),
  user_role VARCHAR(20),
  
  -- What
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  
  -- Context
  organization_id UUID REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id),
  
  -- Details
  old_data JSONB,
  new_data JSONB,
  
  -- When & Where
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at DESC);

-- ============================================================================
-- DATA WAREHOUSE TABLES (OLAP)
-- ============================================================================

-- 12. FACT_ORDERS (Fact table for reporting)
CREATE TABLE fact_orders (
  fact_id BIGSERIAL PRIMARY KEY,
  
  -- Dimensions
  date_key INT NOT NULL,
  time_key INT NOT NULL,
  organization_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  user_id UUID,
  
  -- Order info
  order_id UUID NOT NULL,
  order_number VARCHAR(50),
  order_type VARCHAR(20),
  
  -- Measures
  subtotal NUMERIC(12, 2),
  tax NUMERIC(12, 2),
  discount_amount NUMERIC(12, 2),
  service_charge NUMERIC(12, 2),
  total_amount NUMERIC(12, 2),
  item_count INT,
  
  -- Timestamps
  order_created_at TIMESTAMP,
  order_paid_at TIMESTAMP,
  order_duration_minutes INT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fact_orders_date ON fact_orders(date_key, branch_id);
CREATE INDEX idx_fact_orders_branch ON fact_orders(branch_id, date_key DESC);
CREATE INDEX idx_fact_orders_org ON fact_orders(organization_id, date_key DESC);

-- 13. DIM_DATE (Date dimension)
CREATE TABLE dim_date (
  date_key INT PRIMARY KEY,
  full_date DATE NOT NULL UNIQUE,
  day_of_week VARCHAR(10),
  day_of_week_num INT,
  day_of_month INT,
  day_of_year INT,
  week_of_year INT,
  month INT,
  month_name VARCHAR(20),
  quarter INT,
  year INT,
  is_weekend BOOLEAN,
  is_holiday BOOLEAN,
  holiday_name VARCHAR(255)
);

-- 14. DIM_TIME (Time dimension)
CREATE TABLE dim_time (
  time_key INT PRIMARY KEY,
  time_value TIME NOT NULL UNIQUE,
  hour INT,
  minute INT,
  hour_12 INT,
  am_pm VARCHAR(2),
  hour_name VARCHAR(10),
  period VARCHAR(20)
);

-- 15. AGG_DAILY_SALES (Pre-aggregated daily sales)
CREATE TABLE agg_daily_sales (
  date_key INT NOT NULL,
  branch_id UUID NOT NULL,
  
  order_count INT DEFAULT 0,
  customer_count INT DEFAULT 0,
  total_revenue NUMERIC(12, 2) DEFAULT 0,
  total_discount NUMERIC(12, 2) DEFAULT 0,
  total_tax NUMERIC(12, 2) DEFAULT 0,
  avg_order_value NUMERIC(12, 2) DEFAULT 0,
  
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (date_key, branch_id)
);

-- 16. AGG_HOURLY_SALES (Pre-aggregated hourly sales)
CREATE TABLE agg_hourly_sales (
  date_key INT NOT NULL,
  hour INT NOT NULL,
  branch_id UUID NOT NULL,
  
  order_count INT DEFAULT 0,
  total_revenue NUMERIC(12, 2) DEFAULT 0,
  
  PRIMARY KEY (date_key, hour, branch_id)
);

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- View: Active tables with current orders
CREATE VIEW v_active_tables AS
SELECT 
  t.id AS table_id,
  t.branch_id,
  t.table_number,
  t.name AS table_name,
  t.zone,
  o.id AS order_id,
  o.order_number,
  o.status AS order_status,
  o.total_amount,
  o.created_at AS order_started_at,
  COUNT(oi.id) AS item_count
FROM tables t
LEFT JOIN orders o ON t.id = o.table_id AND o.status IN ('OPEN', 'CONFIRMED')
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE t.is_active = true
GROUP BY t.id, o.id;

-- View: Kitchen display
CREATE VIEW v_kitchen_display AS
SELECT 
  o.id AS order_id,
  o.order_number,
  o.order_type,
  b.name AS branch_name,
  t.table_number,
  oi.id AS item_id,
  oi.menu_item_name,
  oi.quantity,
  oi.notes,
  oi.modifiers,
  oi.item_status,
  oi.created_at,
  EXTRACT(EPOCH FROM (NOW() - oi.created_at))/60 AS minutes_waiting
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN branches b ON o.branch_id = b.id
LEFT JOIN tables t ON o.table_id = t.id
WHERE o.status IN ('OPEN', 'CONFIRMED')
  AND oi.item_status IN ('PENDING', 'PREPARING')
ORDER BY oi.created_at ASC;

-- View: Today's sales summary
CREATE VIEW v_today_sales AS
SELECT 
  b.id AS branch_id,
  b.name AS branch_name,
  COUNT(DISTINCT o.id) AS order_count,
  SUM(o.total_amount) AS total_revenue,
  SUM(o.discount_amount) AS total_discount,
  AVG(o.total_amount) AS avg_order_value
FROM branches b
LEFT JOIN orders o ON b.id = o.branch_id 
  AND DATE(o.created_at) = CURRENT_DATE
  AND o.status = 'PAID'
GROUP BY b.id;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Update order totals
CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders
  SET 
    subtotal = (
      SELECT COALESCE(SUM(item_total), 0)
      FROM order_items
      WHERE order_id = NEW.order_id
        AND item_status != 'CANCELLED'
    ),
    updated_at = NOW()
  WHERE id = NEW.order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update order totals when items change
CREATE TRIGGER trigger_update_order_totals
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_totals();

-- Function: Generate order number
CREATE OR REPLACE FUNCTION generate_order_number(p_branch_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_date_key VARCHAR(8);
  v_sequence INT;
  v_order_number VARCHAR(50);
BEGIN
  v_date_key := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 10) AS INT)), 0) + 1
  INTO v_sequence
  FROM orders
  WHERE branch_id = p_branch_id
    AND order_number LIKE v_date_key || '-%';
  
  v_order_number := v_date_key || '-' || LPAD(v_sequence::TEXT, 4, '0');
  
  RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DIMENSION TABLES
-- ============================================================================

-- Seed dim_date (2026 only for now)
INSERT INTO dim_date (date_key, full_date, day_of_week, day_of_week_num, day_of_month, 
                       day_of_year, week_of_year, month, month_name, quarter, year, 
                       is_weekend, is_holiday)
SELECT 
  TO_CHAR(d, 'YYYYMMDD')::INT,
  d::DATE,
  TO_CHAR(d, 'Day'),
  EXTRACT(DOW FROM d)::INT,
  EXTRACT(DAY FROM d)::INT,
  EXTRACT(DOY FROM d)::INT,
  EXTRACT(WEEK FROM d)::INT,
  EXTRACT(MONTH FROM d)::INT,
  TO_CHAR(d, 'Month'),
  EXTRACT(QUARTER FROM d)::INT,
  EXTRACT(YEAR FROM d)::INT,
  EXTRACT(DOW FROM d) IN (0, 6),
  false
FROM generate_series('2026-01-01'::DATE, '2026-12-31'::DATE, '1 day'::INTERVAL) AS d;

-- Seed dim_time
INSERT INTO dim_time (time_key, time_value, hour, minute, hour_12, am_pm, hour_name, period)
SELECT 
  EXTRACT(HOUR FROM t)::INT * 10000 + EXTRACT(MINUTE FROM t)::INT * 100,
  t::TIME,
  EXTRACT(HOUR FROM t)::INT,
  EXTRACT(MINUTE FROM t)::INT,
  CASE WHEN EXTRACT(HOUR FROM t)::INT = 0 THEN 12
       WHEN EXTRACT(HOUR FROM t)::INT > 12 THEN EXTRACT(HOUR FROM t)::INT - 12
       ELSE EXTRACT(HOUR FROM t)::INT END,
  CASE WHEN EXTRACT(HOUR FROM t)::INT < 12 THEN 'AM' ELSE 'PM' END,
  TO_CHAR(t, 'HH24:MI'),
  CASE 
    WHEN EXTRACT(HOUR FROM t)::INT < 6 THEN 'Night'
    WHEN EXTRACT(HOUR FROM t)::INT < 12 THEN 'Morning'
    WHEN EXTRACT(HOUR FROM t)::INT < 18 THEN 'Afternoon'
    ELSE 'Evening'
  END
FROM generate_series('00:00'::TIME, '23:59'::TIME, '1 minute'::INTERVAL) AS t;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE organizations IS 'Top-level tenant - restaurant group/company';
COMMENT ON TABLE branches IS 'Physical locations/outlets of an organization';
COMMENT ON TABLE users IS 'Staff members with role-based access control';
COMMENT ON TABLE orders IS 'Customer orders - core transactional table';
COMMENT ON TABLE promotions IS 'Discount/promotion codes - can be org-wide or branch-specific';
COMMENT ON TABLE fact_orders IS 'OLAP fact table for reporting and analytics';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
