-- XunDian Database Schema
-- PostgreSQL 16 + PostGIS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ========================
-- Companies
-- ========================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_zh TEXT,
  business_license TEXT NOT NULL,
  unified_credit_code TEXT UNIQUE,
  industry TEXT DEFAULT 'fmcg',
  company_code TEXT UNIQUE NOT NULL,
  tier_config JSONB DEFAULT '{"A": {"revisit_days": 7}, "B": {"revisit_days": 14}, "C": {"revisit_days": 30}}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- Territories
-- ========================
CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_zh TEXT,
  boundary GEOMETRY(POLYGON, 4326),
  manager_id UUID, -- forward reference, added FK after employees
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- Employees
-- ========================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('rep', 'area_manager', 'regional_director', 'admin')),
  territory_id UUID REFERENCES territories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from territories.manager_id -> employees.id
ALTER TABLE territories ADD CONSTRAINT fk_territories_manager
  FOREIGN KEY (manager_id) REFERENCES employees(id);

-- ========================
-- Refresh Tokens
-- ========================
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- Stores
-- ========================
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_zh TEXT,
  location GEOMETRY(POINT, 4326) NOT NULL,
  address TEXT,
  tier TEXT CHECK (tier IN ('A', 'B', 'C')),
  store_type TEXT CHECK (store_type IN ('supermarket', 'convenience', 'small_shop', 'other')),
  contact_name TEXT,
  contact_phone TEXT,
  gaode_poi_id TEXT,
  discovered_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- Visits
-- ========================
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id),
  checked_in_at TIMESTAMPTZ NOT NULL,
  gps_lat DECIMAL(10, 7),
  gps_lng DECIMAL(10, 7),
  gps_accuracy_m DECIMAL(6, 1),
  stock_status TEXT CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock', 'added_product')),
  notes TEXT,
  duration_minutes INTEGER,
  is_audit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- Visit Photos
-- ========================
CREATE TABLE visit_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT DEFAULT 'shelf',
  ai_analysis JSONB,
  ai_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- Products
-- ========================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_zh TEXT,
  sku TEXT,
  category TEXT,
  reference_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- Revisit Schedule
-- ========================
CREATE TABLE revisit_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  next_visit_date DATE NOT NULL,
  priority TEXT CHECK (priority IN ('high', 'normal', 'low')),
  reason TEXT,
  assigned_to UUID REFERENCES employees(id),
  completed BOOLEAN DEFAULT false
);

-- ========================
-- Inventory Predictions
-- ========================
CREATE TABLE inventory_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  predicted_stockout_date DATE,
  confidence DECIMAL(3, 2),
  recommended_revisit_date DATE,
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- Indexes
-- ========================
CREATE INDEX idx_stores_location ON stores USING GIST(location);
CREATE INDEX idx_stores_company ON stores(company_id);
CREATE INDEX idx_visits_store ON visits(store_id, checked_in_at DESC);
CREATE INDEX idx_visits_employee ON visits(employee_id, checked_in_at DESC);
CREATE INDEX idx_visits_company ON visits(company_id);
CREATE INDEX idx_revisit_schedule_date ON revisit_schedule(next_visit_date) WHERE NOT completed;
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_employee ON refresh_tokens(employee_id);
CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_phone ON employees(phone);
