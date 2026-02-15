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
  discovered_at TIMESTAMPTZ,
  storefront_photo_url TEXT,
  approval_status TEXT DEFAULT 'approved',
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
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
-- Daily Routes
-- ========================
CREATE TABLE daily_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  date DATE NOT NULL,
  waypoints JSONB NOT NULL DEFAULT '[]',
  total_distance_km DECIMAL(8, 2) NOT NULL DEFAULT 0,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 0,
  optimized BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- ========================
-- Notifications
-- ========================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  type TEXT NOT NULL CHECK (type IN ('revisit_reminder', 'oos_alert', 'route_ready', 'system', 'store_discovered')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  store_id UUID REFERENCES stores(id),
  schedule_id UUID REFERENCES revisit_schedule(id),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- Shelf Comparisons
-- ========================
CREATE TABLE shelf_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  current_photo_id UUID NOT NULL REFERENCES visit_photos(id),
  previous_photo_id UUID NOT NULL REFERENCES visit_photos(id),
  diff_result JSONB NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('positive', 'neutral', 'warning', 'critical')),
  confidence DECIMAL(3, 2) NOT NULL DEFAULT 0,
  reviewed BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- Checklist Templates
-- ========================
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  name_zh TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  assigned_tiers TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- Visit Checklist Results
-- ========================
CREATE TABLE visit_checklist_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id),
  template_id UUID NOT NULL REFERENCES checklist_templates(id),
  results JSONB NOT NULL DEFAULT '[]',
  completion_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- Monthly Goals
-- ========================
CREATE TABLE monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  month DATE NOT NULL,
  goals JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, month)
);

-- ========================
-- Goal Progress
-- ========================
CREATE TABLE goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES monthly_goals(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  progress JSONB NOT NULL DEFAULT '[]',
  verified_count INTEGER NOT NULL DEFAULT 0,
  flagged_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(goal_id, employee_id)
);

-- ========================
-- Visit Integrity Flags
-- ========================
CREATE TABLE visit_integrity_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id),
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  details JSONB NOT NULL DEFAULT '{}',
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES employees(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- Promotions
-- ========================
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  product_id UUID REFERENCES products(id),
  title TEXT NOT NULL,
  title_zh TEXT,
  description TEXT NOT NULL,
  description_zh TEXT,
  display_instructions TEXT,
  display_instructions_zh TEXT,
  target_tiers TEXT[] NOT NULL DEFAULT '{A,B,C}',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES employees(id),
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
CREATE INDEX idx_visit_photos_visit ON visit_photos(visit_id);
CREATE INDEX idx_visit_photos_ai_processed ON visit_photos(ai_processed_at);
CREATE INDEX idx_inventory_predictions_store_product ON inventory_predictions(store_id, product_id);
CREATE INDEX idx_checklist_templates_company ON checklist_templates(company_id);
CREATE INDEX idx_goal_progress_employee ON goal_progress(employee_id);
CREATE INDEX idx_integrity_flags_visit ON visit_integrity_flags(visit_id);
CREATE INDEX idx_integrity_flags_unresolved ON visit_integrity_flags(resolved) WHERE NOT resolved;
CREATE INDEX idx_monthly_goals_month ON monthly_goals(company_id, month);
CREATE INDEX idx_promotions_company ON promotions(company_id);
CREATE INDEX idx_promotions_active ON promotions(company_id, is_active, start_date, end_date);
CREATE INDEX idx_shelf_comparisons_store ON shelf_comparisons(store_id);
