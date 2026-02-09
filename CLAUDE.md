# XúnDiàn (巡店) — Smart Field Retail Execution Platform

## Vision
XúnDiàn is a mobile-first B2B SaaS platform that optimizes FMCG field merchandising operations in China. It replaces blind store walks with AI-powered route optimization, automated shelf analysis, and smart revisit scheduling. Think "Salesforce Field Service meets Unusual Whales" — built natively for China's hyper-fragmented retail landscape.

## Core Principle
**Every decision should make the field rep's day easier and the manager's visibility clearer.** If a feature doesn't serve one of those two goals, it doesn't belong.

## Architecture Philosophy
- **Offline-first**: Rural China has patchy connectivity. The app must work fully offline with sync-when-connected.
- **China-native**: Gaode Maps (高德), Alibaba Cloud, WeChat integration. No Google dependencies.
- **Multi-tenant**: Each company is a fully isolated tenant. Same platform, different configurations.
- **AI at the edge**: Shelf recognition runs on-premise at customer HQ, not in the cloud. Cost-efficient at scale.
- **i18n from day one**: English + Simplified Chinese. Every string goes through the translation system.

## Tech Stack

### Mobile App (Primary Interface)
- **Framework**: React Native (or Flutter — decision TBD based on Gaode SDK support)
- **Maps**: Gaode Maps SDK (高德地图) — best POI data in China, turn-by-turn navigation
- **Local Storage**: SQLite via WatermelonDB (offline-first with sync)
- **Camera**: Custom camera module with timestamp watermarking
- **State Management**: Zustand (lightweight, works well offline)
- **Navigation**: React Navigation v7

### Backend API
- **Runtime**: Node.js with Fastify (or Go for performance-critical paths)
- **Database**: PostgreSQL 16 + PostGIS extension (geospatial queries)
- **Cache**: Redis (session management, rate limiting, hot data)
- **Queue**: RabbitMQ (photo upload queue, AI inference jobs)
- **Auth**: JWT + refresh tokens, company-scoped permissions
- **API Style**: REST with OpenAPI spec, consider tRPC for type safety

### AI Inference (Customer On-Premise)
- **Vision Model**: Qwen2.5-VL-32B (quantized for single RTX 4090)
- **Serving**: vLLM or Ollama
- **Container**: Docker with NVIDIA runtime
- **Queue Integration**: Watches Alibaba OSS bucket, processes photos, pushes results back via API
- **Fallback**: Cloud-hosted inference as premium managed service (¥0.5/photo)

### Infrastructure
- **Cloud**: Alibaba Cloud (China region — mandatory for data residency)
- **Object Storage**: Alibaba OSS (photo storage)
- **CDN**: Alibaba CDN for static assets
- **CI/CD**: GitHub Actions → deploy to Alibaba Cloud (or Gitee for China)
- **Monitoring**: Alibaba SLS (logging) + Prometheus + Grafana

### Inventory Prediction ML
- **Model**: XGBoost (proven best for retail demand forecasting)
- **Features**: Visit frequency, stock levels over time, store tier, seasonality, store type
- **Libraries**: scikit-learn, XGBoost, pandas, Prophet (for seasonal decomposition)
- **Training**: Batch retrain weekly on accumulated visit data
- **Serving**: FastAPI microservice alongside main backend

## Project Structure

```
xundian/
├── CLAUDE.md                    # This file — project brain
├── README.md                    # Public-facing project overview
├── docker-compose.yml           # Full local development environment
├── .env.example                 # Environment variable template
│
├── apps/
│   ├── mobile/                  # React Native mobile app
│   │   ├── src/
│   │   │   ├── screens/         # Screen components
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── DashboardScreen.tsx
│   │   │   │   ├── RouteScreen.tsx
│   │   │   │   ├── StoreDetailScreen.tsx
│   │   │   │   ├── CheckInScreen.tsx
│   │   │   │   ├── CameraScreen.tsx
│   │   │   │   ├── NearbyScreen.tsx
│   │   │   │   └── AlertsScreen.tsx
│   │   │   ├── components/      # Reusable UI components
│   │   │   │   ├── StoreCard.tsx
│   │   │   │   ├── StockStatusBadge.tsx
│   │   │   │   ├── TierBadge.tsx
│   │   │   │   ├── RouteMap.tsx
│   │   │   │   ├── ShelfPhotoCapture.tsx
│   │   │   │   ├── AIAnalysisCard.tsx
│   │   │   │   └── VisitTimeline.tsx
│   │   │   ├── services/        # API + business logic
│   │   │   │   ├── api.ts       # HTTP client (axios)
│   │   │   │   ├── auth.ts      # Authentication flows
│   │   │   │   ├── sync.ts      # Offline sync engine
│   │   │   │   ├── location.ts  # GPS + Gaode integration
│   │   │   │   ├── camera.ts    # Photo capture + watermark
│   │   │   │   └── routing.ts   # Route optimization client
│   │   │   ├── stores/          # Zustand state stores
│   │   │   │   ├── useAuthStore.ts
│   │   │   │   ├── useRouteStore.ts
│   │   │   │   ├── useStoreStore.ts  # Store (retail) data
│   │   │   │   └── useSyncStore.ts
│   │   │   ├── db/              # WatermelonDB schemas + models
│   │   │   │   ├── schema.ts
│   │   │   │   ├── models/
│   │   │   │   └── sync.ts
│   │   │   ├── i18n/            # Internationalization
│   │   │   │   ├── index.ts
│   │   │   │   ├── en.json
│   │   │   │   └── zh.json
│   │   │   └── utils/           # Helpers
│   │   │       ├── geo.ts       # Geospatial calculations
│   │   │       ├── format.ts    # Date, number formatting
│   │   │       └── constants.ts
│   │   ├── android/
│   │   ├── ios/
│   │   └── package.json
│   │
│   └── web/                     # Manager dashboard (web app)
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── LiveMap.tsx
│       │   │   ├── TeamPerformance.tsx
│       │   │   ├── StoreDatabase.tsx
│       │   │   ├── AIInsights.tsx
│       │   │   ├── AuditMode.tsx
│       │   │   ├── CompanySetup.tsx
│       │   │   └── EmployeeManagement.tsx
│       │   ├── components/
│       │   └── lib/
│       └── package.json
│
├── packages/
│   ├── api/                     # Backend API server
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts      # Login, JWT, company-scoped auth
│   │   │   │   ├── companies.ts # Company CRUD + onboarding
│   │   │   │   ├── employees.ts # Employee management
│   │   │   │   ├── stores.ts    # Store CRUD + geospatial queries
│   │   │   │   ├── visits.ts    # Visit logging + check-in
│   │   │   │   ├── photos.ts    # Photo upload + AI integration
│   │   │   │   ├── routes.ts    # Route optimization endpoint
│   │   │   │   ├── alerts.ts    # Revisit reminders + OOS alerts
│   │   │   │   └── analytics.ts # Dashboards + reporting
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts      # JWT verification
│   │   │   │   ├── tenant.ts    # Multi-tenant isolation
│   │   │   │   └── rateLimit.ts
│   │   │   ├── services/
│   │   │   │   ├── routing.ts   # TSP solver (nearest-neighbor + 2-opt)
│   │   │   │   ├── discovery.ts # Nearby store search via Gaode API
│   │   │   │   ├── scheduler.ts # Revisit scheduling engine
│   │   │   │   ├── aiProxy.ts   # Proxy to on-prem AI server
│   │   │   │   └── prediction.ts# Inventory prediction service
│   │   │   ├── db/
│   │   │   │   ├── schema.sql   # PostgreSQL + PostGIS schema
│   │   │   │   ├── migrations/
│   │   │   │   └── seed.ts      # Demo data seeding
│   │   │   └── utils/
│   │   └── package.json
│   │
│   ├── shared/                  # Shared types + utilities
│   │   ├── types/
│   │   │   ├── store.ts         # Store, Visit, Photo types
│   │   │   ├── company.ts       # Company, Employee types
│   │   │   ├── route.ts         # Route, Waypoint types
│   │   │   └── ai.ts            # AI analysis result types
│   │   └── constants/
│   │       ├── tiers.ts         # A/B/C tier definitions
│   │       └── status.ts        # Stock status enums
│   │
│   └── ai-kit/                  # AI inference toolkit (ships to customer)
│       ├── Dockerfile           # Pre-configured inference container
│       ├── docker-compose.yml
│       ├── src/
│       │   ├── watcher.py       # OSS bucket photo watcher
│       │   ├── inference.py     # Qwen2.5-VL inference pipeline
│       │   ├── prompts/         # Shelf analysis prompt templates
│       │   └── api.py           # Results push-back API
│       ├── setup.sh             # One-click setup script
│       └── README.md            # Customer-facing setup guide
│
├── ml/                          # Inventory prediction models
│   ├── notebooks/
│   │   ├── 01_eda.ipynb         # Exploratory data analysis
│   │   ├── 02_feature_eng.ipynb # Feature engineering
│   │   └── 03_model.ipynb       # XGBoost model training
│   ├── src/
│   │   ├── train.py             # Training pipeline
│   │   ├── predict.py           # Prediction service
│   │   └── features.py          # Feature extraction
│   └── requirements.txt
│
└── docs/
    ├── API.md                   # API documentation
    ├── DEPLOYMENT.md            # Deployment guide (Alibaba Cloud)
    ├── AI-SETUP.md              # On-premise AI setup guide
    ├── DATA-MODEL.md            # Database schema docs
    └── LEGAL.md                 # PIPL compliance checklist
```

## Database Schema (Core Tables)

```sql
-- Multi-tenant: every table has company_id
-- All geospatial columns use PostGIS geometry type

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_zh TEXT,
  business_license TEXT NOT NULL,        -- 营业执照号
  unified_credit_code TEXT UNIQUE,       -- 统一社会信用代码
  industry TEXT DEFAULT 'fmcg',
  tier_config JSONB DEFAULT '{"A": {"revisit_days": 7}, "B": {"revisit_days": 14}, "C": {"revisit_days": 30}}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('rep', 'area_manager', 'regional_director', 'admin')),
  territory_id UUID REFERENCES territories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  name_zh TEXT,
  boundary GEOMETRY(POLYGON, 4326),      -- PostGIS polygon
  manager_id UUID REFERENCES employees(id)
);

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  name_zh TEXT,
  location GEOMETRY(POINT, 4326) NOT NULL,
  address TEXT,
  tier TEXT CHECK (tier IN ('A', 'B', 'C')),
  store_type TEXT CHECK (store_type IN ('supermarket', 'convenience', 'small_shop', 'other')),
  contact_name TEXT,
  contact_phone TEXT,
  gaode_poi_id TEXT,                     -- 高德POI ID
  discovered_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  store_id UUID REFERENCES stores(id),
  employee_id UUID REFERENCES employees(id),
  checked_in_at TIMESTAMPTZ NOT NULL,
  gps_lat DECIMAL(10, 7),
  gps_lng DECIMAL(10, 7),
  gps_accuracy_m DECIMAL(6, 1),
  stock_status TEXT CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock', 'added_product')),
  notes TEXT,
  duration_minutes INTEGER,
  is_audit BOOLEAN DEFAULT false,        -- Audit mode flag
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE visit_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id),
  photo_url TEXT NOT NULL,               -- OSS URL
  photo_type TEXT DEFAULT 'shelf',       -- shelf, storefront, other
  ai_analysis JSONB,                     -- AI results when processed
  ai_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  name_zh TEXT,
  sku TEXT,
  category TEXT,
  reference_image_url TEXT,              -- For AI recognition
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE revisit_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  company_id UUID REFERENCES companies(id),
  next_visit_date DATE NOT NULL,
  priority TEXT CHECK (priority IN ('high', 'normal', 'low')),
  reason TEXT,                           -- 'scheduled', 'oos_detected', 'new_product'
  assigned_to UUID REFERENCES employees(id),
  completed BOOLEAN DEFAULT false
);

CREATE TABLE inventory_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  product_id UUID REFERENCES products(id),
  predicted_stockout_date DATE,
  confidence DECIMAL(3, 2),
  recommended_revisit_date DATE,
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stores_location ON stores USING GIST(location);
CREATE INDEX idx_stores_company ON stores(company_id);
CREATE INDEX idx_visits_store ON visits(store_id, checked_in_at DESC);
CREATE INDEX idx_visits_employee ON visits(employee_id, checked_in_at DESC);
CREATE INDEX idx_revisit_schedule_date ON revisit_schedule(next_visit_date) WHERE NOT completed;
```

## Route Optimization Algorithm

The TSP solver uses a **nearest-neighbor heuristic with 2-opt improvement**:

```
1. Input: Today's store list (revisits + new targets) + rep start location
2. Nearest-neighbor: Greedily build initial route by always going to closest unvisited store
3. 2-opt improvement: Iteratively remove two edges and reconnect in the other possible way
   - If new route is shorter, keep it
   - Repeat until no improvement found (typically 50-200 iterations)
4. Constraints: Store operating hours, time windows, rep break times
5. Output: Ordered list of stores with estimated arrival times
```

For <20 stops/day (typical), this runs in <100ms. No need for exotic solvers.

## Key Implementation Notes

### Offline Sync Strategy
- WatermelonDB on mobile handles local CRUD
- Sync protocol: push local changes → pull server changes → resolve conflicts
- Conflict resolution: last-write-wins for most fields, server-wins for AI analysis
- Photos queued locally → uploaded when connectivity returns → server confirms

### GPS Anti-Cheat
- Check-in requires GPS accuracy <50m
- Geofence: Must be within 200m of store's registered location
- Timestamp validation: server compares client timestamp vs server time (±5 min tolerance)
- Movement pattern analysis: flag if rep "visits" 5 stores in 2 minutes

### Photo Watermarking
- Overlay on photo: date, time, GPS coordinates, store name, rep name
- Applied client-side before upload (can't be removed)
- Standard practice in China field sales — required for proof-of-visit

### AI Prompt for Shelf Analysis
```
You are a retail shelf analyst. Analyze this shelf photo and return ONLY valid JSON:
{
  "our_products": [
    {"name": "product_name", "facing_count": N, "stock_level": "high|medium|low|empty", "shelf_position": "eye|middle|bottom|top"}
  ],
  "total_category_facings": N,
  "share_of_shelf_percent": N,
  "competitors": [{"name": "brand_name", "facing_count": N}],
  "anomalies": ["description of any issues"],
  "confidence": 0.0-1.0
}
Company products to identify: {product_catalog}
```

### i18n Pattern
- All user-facing strings in `/i18n/en.json` and `/i18n/zh.json`
- Use `useTranslation()` hook everywhere
- Date/number formatting locale-aware (e.g., 2月9日 vs Feb 9)
- Store names stored in both `name` (en) and `name_zh` columns

## Legal Compliance Checklist (PIPL)

- [ ] Privacy policy displayed on first launch (both languages)
- [ ] Explicit consent for GPS tracking with purpose explanation
- [ ] Explicit consent for camera/photo storage
- [ ] Data minimization: only collect what's needed
- [ ] Personal Information Protection Impact Assessment (PIA) documented
- [ ] Data stored exclusively on China mainland servers
- [ ] Employee right to access/correct/delete their data
- [ ] Data retention policy: auto-delete visit data after 3 years
- [ ] DPO (Data Protection Officer) appointed for customers >1M records
- [ ] Incident response plan documented and tested

## Audit Mode (Detailed)

Audit mode lets managers verify rep accuracy through surprise revisits:

### Random Spot Check
1. System randomly selects N stores from a rep's recent visits (last 7 days)
2. Assigns a different rep (or the manager) to revisit those stores
3. Auditor takes new shelf photos at the same stores
4. AI compares: original visit photos vs. audit photos
5. Flags discrepancies: "Rep reported in-stock, but audit shows empty shelf"

### Assigned Audit
1. Manager manually selects stores and assigns auditor
2. Auditor doesn't see the original rep's data until after their own check-in
3. Post-audit comparison dashboard shows side-by-side results

### Verification Metrics
- **Photo match rate**: Does the auditor's photo confirm the rep's report?
- **Timestamp plausibility**: Was the rep actually at the store long enough?
- **GPS accuracy**: Was the rep within the geofence?
- **Stock status agreement**: Rep said "in stock" — does audit confirm?

## Development Priorities (Build Order)

### Phase 1: MVP (4-6 weeks)
1. Auth + company onboarding (basic)
2. Store CRUD + map view with Gaode
3. Check-in flow (GPS + timestamp + photo)
4. Store profiles with visit history
5. Basic route display (no optimization yet)
6. i18n (EN + ZH)

### Phase 2: Core Intelligence (4-6 weeks)
1. Route optimization (nearest-neighbor + 2-opt)
2. Nearby store discovery (Gaode POI search)
3. Revisit scheduling engine
4. Push notification reminders
5. Manager dashboard (web) — basic KPIs

### Phase 3: AI & Analytics (4-6 weeks)
1. AI shelf recognition integration (on-prem kit)
2. AI analysis display in app
3. Inventory prediction ML model (XGBoost)
4. Out-of-stock alerts
5. Advanced manager dashboard with team performance

### Phase 4: Enterprise (4-6 weeks)
1. Territory management (draw on map)
2. Employee performance analytics
3. Audit mode
4. Data export (Excel/WeChat)
5. Multi-tenant billing system

## Design System

### Colors
- **Primary**: `#3B82F6` (Electric Blue)
- **Success**: `#10B981` (Signal Green)
- **Warning**: `#F59E0B` (Amber)
- **Danger**: `#EF4444` (Red)
- **Purple**: `#8B5CF6` (AI/Intelligence features)
- **Background**: `#0F172A` (Deep Navy — dark mode default)
- **Surface**: `rgba(255,255,255,0.04)` (Cards on dark)
- **Text Primary**: `#FFFFFF`
- **Text Secondary**: `#94A3B8`

### Store Tier Colors
- **A (Hypermarket)**: `#DC2626` Red
- **B (Convenience)**: `#F59E0B` Amber
- **C (Small Shop)**: `#6B7280` Gray

### Typography
- **Chinese**: PingFang SC / Microsoft YaHei
- **English**: SF Pro Display / Inter (as fallback)
- **Monospace**: SF Mono / Menlo (data displays)

### Component Patterns
- Cards: 12-16px border-radius, subtle border (`rgba(255,255,255,0.06)`), glass-morphism on dark bg
- Buttons: 12px radius, gradient fills for primary actions, outline for secondary
- Status badges: Pill shape, tinted background matching status color at 15% opacity
- Bottom sheet modals for store details (standard mobile pattern in China)
