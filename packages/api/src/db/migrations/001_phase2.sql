-- Phase 2: Core Intelligence tables

-- Daily optimized routes per employee
CREATE TABLE IF NOT EXISTS daily_routes (
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

CREATE INDEX IF NOT EXISTS idx_daily_routes_employee_date ON daily_routes(employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_routes_company ON daily_routes(company_id);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  type TEXT NOT NULL CHECK (type IN ('revisit_reminder', 'oos_alert', 'route_ready', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  store_id UUID REFERENCES stores(id),
  schedule_id UUID REFERENCES revisit_schedule(id),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(employee_id) WHERE NOT read;
