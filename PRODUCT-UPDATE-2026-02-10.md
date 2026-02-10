# XúnDiàn Product Update — February 10, 2026

> **Purpose**: This file supplements the existing `CLAUDE.md`. Read `CLAUDE.md` first for architecture, DB schema, tech stack, and design system. This file contains customer feedback, competitive intelligence, revised feature priorities, and new feature specifications gathered from real customer conversations. Where this file conflicts with `CLAUDE.md`, this file takes precedence.

---

## 1. CUSTOMER CONTEXT — FIRST REAL PILOT

We have a warm customer ready to pilot XúnDiàn. Key details:

- **Location**: Sichuan Province, China (based in Chengdu / 成都)
- **Scope**: Single-province pilot before national expansion
- **Industry**: FMCG (condiments/food products)
- **Team size**: Has field reps covering Sichuan retail stores
- **Current pain**: Manual photo review, no structured data, reps gaming visit metrics
- **Budget context**: Was pitched Yonyou's solution at 1M RMB/year and declined (too expensive, too much bloat for unclear ROI)
- **Target price point**: ~150K–300K RMB/year (our opportunity)

This is a real customer with real requirements. Everything below reflects direct feedback from phone calls and in-person conversations.

---

## 2. COMPETITIVE INTELLIGENCE — YONYOU (用友)

### What they are
Yonyou is one of China's largest enterprise software companies. They offer a B2B ordering platform + SFA (Sales Force Automation) bolt-on module. Their 2024 pricing was **1,000,000 RMB/year** including custom app build and tech support.

### What they do well (features we DON'T need to replicate)
- **B2B ordering platform**: Product catalogs, pricing engines, multi-mode ordering (self-service, rep-assisted, specialist entry), order lifecycle tracking — this is ERP plumbing, not our fight
- **Logistics & fulfillment**: Route-based warehouse selection, shipment tracking, batch delivery — not in our scope
- **Expense/promotion management**: Campaign creation → field inspection → AI display verification → expense disbursement — comprehensive but not needed for pilot
- **Financial reconciliation**: Payment processing, account sync, invoicing — let existing finance tools handle
- **Van sales (车销)**: Route planning for mobile sales vehicles — niche use case, skip
- **HR/incentive system**: Star ratings, KPI scorecards, radar charts, DHR integration — nice-to-have, not pilot-critical

### Where XúnDiàn is categorically stronger
1. **AI shelf recognition is our core, their afterthought** — Yonyou mentions AI image recognition once, for display compliance checking during promo campaigns. XúnDiàn's AI is the entire nervous system: real-time SKU-level shelf analysis, SoS tracking over time, competitor detection, stockout prediction, inventory depletion forecasting
2. **Predictive analytics vs historical reporting** — Yonyou shows backward-looking dashboards. We do forward-looking AI insights: anomaly detection, OOS risk prediction with confidence intervals, competitor movement alerts, seasonal pattern recognition
3. **On-premise GPU architecture** — Yonyou's AI appears cloud-dependent. We run Qwen2.5-VL on-premise for data sovereignty, lower latency, and zero marginal cost at scale
4. **Store-level depth** — Our store detail modal has address, contact, owner, SoS trend chart, rich visit history with AI analysis per visit, competitor tracking, photo strips, tags, predictive restocking. Yonyou's is a check-in form with follow-up record fields
5. **Modern mobile-first UX** — Their UI is classic enterprise Chinese software (dense forms, red/white, desktop-first squeezed into mobile). Ours is dark-mode, mobile-first, modern

### Strategic positioning
- Yonyou sells a **horizontal ERP extension** — "you already use Yonyou for finance, now add ordering and field management"
- XúnDiàn is a **vertical intelligence weapon** — purpose-built for "what's happening on my shelves and what should my team do about it"
- They're actually **complementary** — Yonyou for transactional backbone, XúnDiàn as the field intelligence layer via API integration
- Our pitch: "You turned down a 1M RMB Swiss Army knife. Here's a scalpel for a fifth of the price that does the one thing that actually grows revenue"

---

## 3. REVISED FEATURE LIST — WHAT TO BUILD

Based on direct customer feedback. Organized by priority.

### ✅ CONFIRMED — Build These

| # | Feature | Priority | Customer quote/context |
|---|---------|----------|----------------------|
| 1 | **Store Onboarding Flow** | MUST HAVE | "In other parts of China many stores are not even listed online. Reps find them on their own and need to onboard that store, pin the address, write the name. Saved to the database. Grow store database organically over time." |
| 2 | **AI Photo Comparison / Shelf Diff** | MUST HAVE | "Managers need to manually view each photo before and after. January rep takes a picture, February same store same shelf, manager manually checks before/after. Wants solution to make it easier without sacrificing accuracy." |
| 3 | **Visit Task Checklists** | MUST HAVE | "Yes, but needs to be customizable by the manager." Manager defines checklist templates, assigns per store tier or individually |
| 4 | **Monthly Goal System** | MUST HAVE | "Managers add goals every month. Each goal is different from last month, usually based on what's currently happening. Track each rep's goal progress. Make sure there's no way to cheat. Winner gets bigger commission." |
| 5 | **Store Map (Growing Database)** | MUST HAVE | "Live maps of each store as it grows by the database." NOT live rep tracking — just a growing map of store locations as reps onboard new stores |
| 6 | **Weekly Report Generation** | HIGH | Exportable summary: visits vs target, SoS changes, OOS incidents, rep rankings, AI anomalies |
| 7 | **Route Optimization** | HIGH | Upgrade from static map to "here's your optimal route today" based on priority (overdue > due today > nearby high-value) |
| 8 | **Data Export** | HIGH | "Any data gathered can be curated and exported for further analysis." CSV/Excel exports from every module with date range filters |

### ❌ EXPLICITLY DROPPED — Do NOT build these

| Feature | Reason |
|---------|--------|
| Quick restock orders | "That's the distributor's part. His reps make sure it's stocked, proper items are there, and they visited." |
| Basic expense capture | Customer said not needed yet |
| Promotion tracker | Customer said not needed yet |
| Live rep tracking | "We don't need live tracking of where each rep is." Only store locations on map, not rep locations |
| B2B ordering platform | Yonyou territory, not our fight |
| Financial reconciliation | Let existing tools handle |
| Van sales module | Not relevant for this customer |

### ⏸️ DEFERRED — Build later after pilot proves value

| Feature | Notes |
|---------|-------|
| Distributor integration | Auto-trigger restock when AI detects low stock — holy grail but needs deep integration |
| Full expense management | Yonyou's strength, we can add lightweight version post-pilot |
| Promotion tracking | Add when customer asks |
| HR/performance radar charts | Nice-to-have gamification layer |

---

## 4. NEW FEATURE SPECIFICATIONS

### 4.1 Store Onboarding Flow

**The #1 must-have feature.** This is how the store database grows organically.

**Rep workflow:**
1. Rep is in the field, discovers a new store not in the system
2. Taps "Add Store" / "新增门店" button (prominent, always accessible)
3. **GPS auto-captures** current location (lat/lng/accuracy)
4. Rep takes a **photo of the storefront** (auto-watermarked with timestamp + GPS)
5. Fills in form fields:
   - Store name (手写 / free text) — REQUIRED
   - Store type (dropdown: supermarket/convenience/small shop/other)
   - Contact name (optional)
   - Contact phone (optional)
   - Estimated tier (A/B/C — optional, manager can adjust later)
   - Notes (optional)
6. **Pin drops on map** — rep can adjust GPS pin if standing outside and pin is slightly off
7. Taps "Submit" → store is saved to database immediately
8. Store appears on map for all reps in that territory going forward
9. Manager gets notification: "Zhang Wei discovered a new store: 李阿姨杂货店"

**Manager workflow:**
- New stores appear in a "Pending Review" queue
- Manager can: approve (goes live), edit (fix tier/name/type), reject (duplicate or invalid)
- Approved stores automatically get added to nearest rep's territory
- Store gets assigned a revisit schedule based on its tier

**Database additions:**
```sql
ALTER TABLE stores ADD COLUMN discovered_at TIMESTAMPTZ;
ALTER TABLE stores ADD COLUMN storefront_photo_url TEXT;
ALTER TABLE stores ADD COLUMN approval_status TEXT DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE stores ADD COLUMN approved_by UUID REFERENCES employees(id);
ALTER TABLE stores ADD COLUMN approved_at TIMESTAMPTZ;
```

**Anti-cheat:**
- GPS must be within reasonable accuracy (<100m)
- Storefront photo EXIF data must match reported GPS coordinates
- Duplicate detection: flag if a store with similar name exists within 200m radius
- Rate limit: flag if rep onboards >10 stores in a single day (suspicious)

---

### 4.2 AI Photo Comparison / Shelf Diff Engine

**This is the killer differentiator.** Solves the #1 manager pain point.

**The problem precisely stated:**
Manager receives hundreds of shelf photos per month across all reps. Currently must manually open January photo, memorize it, open February photo, squint to spot differences. Multiply by hundreds of stores. It's brutal, inaccurate, and the first thing managers stop doing when busy — meaning execution problems go undetected.

**What XúnDiàn does instead:**

**AI Shelf Diff Report** — When a rep takes a new shelf photo, the system automatically:
1. Pulls the most recent previous photo of the **same shelf section** in the **same store**
2. Runs both through Qwen2.5-VL with a diff-focused prompt
3. Generates a structured comparison:

```json
{
  "store_id": "SC-CD-00042",
  "current_photo_date": "2026-02-10",
  "previous_photo_date": "2026-01-15",
  "changes": {
    "sos_change": { "previous": 28, "current": 32, "delta": "+4%" },
    "facing_changes": [
      { "product": "生抽", "previous": 3, "current": 4, "change": "+1" },
      { "product": "蚝油", "previous": 2, "current": 2, "change": "0" },
      { "product": "老抽", "previous": 0, "current": 1, "change": "+1 (NEW)" }
    ],
    "competitor_changes": [
      { "brand": "李锦记", "change": "Gained eye-level placement, was bottom shelf" }
    ],
    "new_items_detected": ["Unknown SKU in position B3 — possible competitor new product"],
    "missing_items": [],
    "compliance": {
      "price_tag_present": true,
      "product_facing_forward": true,
      "shelf_clean": true
    }
  },
  "severity": "positive",
  "confidence": 0.91
}
```

**Manager dashboard view:**
- **Diff Dashboard** — list of all recent shelf comparisons, sorted by severity
- Red flags at top (lost facings, competitor gains, OOS)
- Green flags at bottom (improvements, new placements)
- Each card shows: store name, date range, SoS delta, key changes
- Tap any card → side-by-side photo view with highlighted regions
- Color overlay: green = gains, red = losses, yellow = moved
- 80% of the time the AI summary is enough — manager doesn't need to look at photos

**Impact:** Manager who spent 3 hours/day reviewing photos now spends 15 minutes scanning AI diffs. That's the pitch.

**Visual side-by-side comparison features:**
- Split-screen or overlay mode
- Bounding box highlights on changed regions
- SoS bar chart showing trend over time
- Toggle between "show changes only" and "show all"

---

### 4.3 Visit Task Checklists (Manager-Customizable)

**Manager creates checklist templates:**
- Can create multiple templates (e.g., "A-Tier Full Audit", "Quick Check", "New Store Initial")
- Each template has ordered task items
- Task types: photo required, yes/no toggle, numeric input, text note, dropdown selection
- Templates are assigned to store tiers or specific stores

**Example templates:**

**A-Tier Full Audit (12 items):**
1. 📷 Full shelf panorama photo (photo required)
2. 📷 Price tag close-up (photo required)
3. ✅ All SKUs present on shelf? (yes/no)
4. 🔢 Count our total facings (numeric)
5. 🔢 Count competitor facings (numeric)
6. 📷 Competitor shelf section photo (photo required)
7. ✅ Promo materials displayed? (yes/no)
8. ✅ Products facing forward? (yes/no)
9. ✅ Shelf clean and organized? (yes/no)
10. 📷 Endcap/special display photo (photo required, optional)
11. 📝 Store owner feedback (text)
12. ✅ Expiry dates checked? (yes/no)

**C-Tier Quick Check (4 items):**
1. 📷 Shelf photo (photo required)
2. ✅ Products in stock? (yes/no)
3. 🔢 Count facings (numeric)
4. 📝 Notes (text)

**Rep experience:**
- On check-in at a store, checklist auto-loads based on store's assigned template
- Rep works through items sequentially
- Required items cannot be skipped
- Progress bar shows completion (3/12 items)
- On completion, checklist data is attached to the visit record
- Manager sees completion rate per rep as a KPI

**Database additions:**
```sql
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  name_zh TEXT,
  items JSONB NOT NULL, -- Array of task items with type, label, required flag
  assigned_tiers TEXT[], -- Which store tiers use this template
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE visit_checklist_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id),
  template_id UUID REFERENCES checklist_templates(id),
  results JSONB NOT NULL, -- Array of {item_id, value, photo_url?, completed_at}
  completion_rate DECIMAL(3, 2), -- 0.00 to 1.00
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.4 Monthly Goal System (Anti-Cheat)

**Manager sets goals monthly:**
- Goals are per-company, applied to all reps (or per-territory)
- Each month's goals can be completely different based on current priorities
- Goal types: visit count, coverage %, new store discoveries, SoS improvement, checklist completion rate, specific store visits

**Example goals for February 2026:**
1. "Visit at least 15 A-tier stores this month" (visit count by tier)
2. "Achieve 85% territory coverage" (coverage %)
3. "Discover and onboard 3 new stores" (new store count)
4. "Average SoS improvement of +2% across all visited stores" (SoS delta)

**Rep view:**
- Goals dashboard showing each goal with progress bar
- Clear denominator: "12/15 A-tier visits completed"
- Days remaining in month
- Leaderboard: ranked against other reps (same goals)
- Commission multiplier visible: "Top performer gets 1.5x commission"

**Anti-cheat system (CRITICAL):**

The customer specifically said "make sure there's no way to cheat it." Here's the integrity layer:

1. **GPS + Timestamp + Photo metadata triangle**: Every visit must have all three matching. GPS within 100m of store, timestamp in working hours, photo EXIF matches GPS/time. Any leg breaks → visit flagged
2. **AI photo authenticity**: Detect recycled photos (same image submitted twice), stock photos, photos from wrong stores (background doesn't match store's historical photos), photos taken from unusual angles/distances
3. **Sequential logic validation**: If rep claims Store A at 9:00 and Store B at 9:05 but they're 15km apart → flagged. System computes realistic travel times between stores
4. **Minimum visit duration**: Visit must last >3 minutes to count. Check-in at 9:00 + check-out at 9:01 = flagged
5. **Checklist completion required**: Goal credit only given when visit has completed checklist (no empty drive-by check-ins)
6. **Goal evidence chain**: Each goal milestone must be backed by verified visit data. "Visit 15 A-tier stores" = 15 visits where GPS + photo + checklist all validated
7. **Manager review queue for edge cases**: Auto-approve clean visits, surface suspicious ones. Manager spends time on 5% that look wrong instead of manually verifying 100%
8. **Anomaly detection**: Flag patterns like all visits clustered in last 3 days of month, suspiciously uniform visit durations, visits only to nearest stores (gaming easy targets)

**Database additions:**
```sql
CREATE TABLE monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  month DATE NOT NULL, -- First day of month (e.g., 2026-02-01)
  goals JSONB NOT NULL, -- Array of goal definitions
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, month)
);

CREATE TABLE goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES monthly_goals(id),
  employee_id UUID REFERENCES employees(id),
  progress JSONB NOT NULL, -- Per-goal progress values
  verified_count INTEGER DEFAULT 0, -- Anti-cheat verified
  flagged_count INTEGER DEFAULT 0, -- Anti-cheat flagged
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE visit_integrity_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id),
  flag_type TEXT NOT NULL, -- 'gps_mismatch', 'photo_recycled', 'impossible_travel', 'too_short', etc.
  severity TEXT CHECK (severity IN ('warning', 'critical')),
  details JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.5 Weekly Report Generation

**Auto-generated weekly summary for managers. Exportable as PDF.**

Report sections:
1. **Executive summary**: Total visits, coverage %, SoS average, OOS incidents count
2. **Visit performance**: Per-rep table with visits completed vs target, compliance rate, avg duration
3. **SoS changes**: Stores with biggest gains and losses, trend chart
4. **OOS incidents**: Stores where products went out of stock, duration, resolution status
5. **New store discoveries**: Stores onboarded this week with details
6. **AI anomalies detected**: Flagged visits, integrity issues
7. **Goal progress**: Monthly goal progress snapshot
8. **Recommendations**: AI-generated suggestions (e.g., "Rep Zhang's coverage dropped 15% this week — recommend redistributing 3 stores to Rep Li")

**Export formats:** PDF (primary), Excel (data tables), CSV (raw data)

---

### 4.6 Data Export

Every data module must support export:

| Module | Export format | Columns/Fields |
|--------|--------------|----------------|
| Visit data | CSV/Excel | date, rep, store, duration, GPS, checklist results, photo links, AI analysis summary |
| Store database | CSV/Excel | name, address, GPS, tier, type, contact, onboarding date, visit count, latest SoS |
| Goal tracking | CSV/Excel | per-rep progress, completion rates, flagged anomalies |
| AI shelf analysis | CSV/Excel | per-store SoS history over time, competitor tracking, trend data |
| Weekly reports | PDF | formatted summary report |
| Photo comparisons | PDF | side-by-side diffs with AI annotations |

All exportable from manager dashboard with date range filters. Standard formats that drop into Excel or existing BI tools.

---

## 5. SICHUAN LOCALIZATION

For the pilot to feel real, all mock data and defaults should reflect Sichuan/Chengdu geography.

### Mock stores should use:
- **Chengdu districts**: 锦江区, 武侯区, 青羊区, 高新区, 金牛区, 成华区, 双流区, 温江区
- **Real Sichuan store brands**: 红旗超市 (Red Flag Supermarket), 舞东风, WOWO便利, 互惠超市, plus local 小卖部 (mom-and-pop shops)
- **Sichuan-relevant products**: If customer sells condiments — 豆瓣酱 (doubanjiang), 花椒油 (Sichuan pepper oil), 火锅底料 (hotpot base), 泡椒 (pickled peppers), plus standard 酱油/蚝油

### Map coordinates:
- Center on Chengdu: approximately 30.5728°N, 104.0668°E
- Store pins spread across Chengdu urban districts
- Territory boundaries based on actual district lines

---

## 6. CHINA MAPS API — USE GAODE (高德)

**Google Maps is blocked in China.** The three viable options:

| Provider | Recommendation | Notes |
|----------|---------------|-------|
| **高德地图 (Gaode/Amap)** | ✅ USE THIS | Alibaba-owned, dominant in B2B/logistics. Free tier: 300K calls/day. Commercial: 5K–20K RMB/year. Deepest store POI database in China. Industry standard for field sales tools (Qince, ShareCRM all use it) |
| 百度地图 (Baidu Maps) | ❌ Skip | Slightly better in Tier 3/4 cities but worse API pricing and developer experience |
| 腾讯地图 (Tencent Maps) | ❌ Skip | Best for WeChat Mini Programs but weaker standalone API |

**Gaode API provides:** Geocoding, reverse geocoding, route planning, geofencing, POI search, turn-by-turn navigation. SDK supports iOS and Android natively.

**Requirements:** Chinese business entity + real-name registration for commercial API. No ICP filing needed for API access alone.

**For development/prototype:** Simulate map behavior with realistic Chengdu geography. Switch to real Gaode JS API for production build.

---

## 7. PROTOTYPE STATUS — CURRENT STATE

The interactive prototype (`xundian-prototype.jsx`) currently has **1,968 lines** with the following working features:

### Already built in prototype:
- ✅ Login screen with rep/manager role selection
- ✅ Language toggle (EN/ZH) across all views
- ✅ Role toggle (rep ↔ manager)
- ✅ Bottom navigation routing (5 tabs per role)

**Rep mode tabs:**
1. ✅ Dashboard — stats cards, route card, nearby search, store list
2. ✅ Map — SVG territory map with color-coded store pins, route polyline, GPS pulse, filter chips
3. ✅ Visits — Schedule/History dual-tab with progress ring and timeline
4. ✅ Alerts — Notification center with severity filters, unread badges, tap-to-view-store
5. ✅ Profile — Avatar, lifetime metrics, performance bars, daily visits chart, settings

**Manager mode tabs:**
1. ✅ Dashboard — KPIs, AI insights, team performance, audit mode toggle
2. ✅ Live Map — Territory quadrants, rep avatars with online/offline, store dots, rep cards
3. ✅ Employees — Team summary cards, employee cards with coverage bars
4. ✅ AI Insights — Sparkline trend charts, AI recommendations, anomaly detection
5. ✅ Settings — Company/Products/System sub-tabs

**Store Detail Modal (enhanced):**
- ✅ Store name, tier badge, status badge, type, ID
- ✅ Full address (bilingual) with pin icon
- ✅ Phone number + store owner/contact
- ✅ Stat cards (SoS%, facings, last visit)
- ✅ Check-in flow with GPS confirmation
- ✅ AI Analysis panel with shelf recognition results
- ✅ Rich visit history with:
  - Visit stats summary (total visits, first visit date, avg SoS, OOS events)
  - SoS trend bar chart (6 weeks)
  - 5 detailed visit entries with date/time/rep/duration
  - Per-visit AI analysis inline
  - Color-coded tags (Full Stock, Placement Win, Competitor Alert, etc.)
  - Photo strip thumbnails with overflow count
  - Timeline connector visual

### NOT yet in prototype (need to add):
- ❌ Store Onboarding Flow
- ❌ AI Photo Comparison / Shelf Diff view
- ❌ Visit Task Checklists (manager-customizable)
- ❌ Monthly Goal System with anti-cheat
- ❌ Weekly Report Generation
- ❌ Data Export buttons/flows
- ❌ Route Optimization (currently just displays static route, no smart ordering)
- ❌ Sichuan localization (currently uses Shanghai mock data)

### Should be REMOVED/CHANGED in prototype:
- **Manager Live Map**: Currently shows live rep tracking (avatars with online/offline pulse). Customer said they DON'T want live rep tracking. Change to: store-only map that grows as database grows. No rep positions, no online/offline status. Just store pins with status colors and territory boundaries.
- **Manager Employees tab**: Remove "online" status indicators. Keep performance metrics.
- **Mock data geography**: Currently Shanghai (浦东/浦西). Switch to Chengdu (锦江/武侯/青羊/高新).
- **Mock store names**: Currently uses Yonghui, FamilyMart, Carrefour, Lawson. Switch to 红旗超市, WOWO便利, 舞东风, 互惠超市, plus local 小卖部.

---

## 8. DEVELOPMENT PRIORITIES — BUILD ORDER

For the Sichuan pilot, build in this exact order:

### Sprint 1: Foundation
1. **Sichuan localization** — Swap all mock data to Chengdu geography, local store brands, local products
2. **Fix Manager Live Map** — Remove rep tracking, make it store-only growing database map
3. **Store Onboarding Flow** — The #1 must-have. Full flow from discovery to database addition

### Sprint 2: Intelligence Layer
4. **AI Photo Comparison** — Side-by-side shelf diff view with structured change report
5. **Visit Task Checklists** — Manager creates templates, rep completes during visits

### Sprint 3: Accountability
6. **Monthly Goal System** — Manager sets goals, per-rep progress tracking, anti-cheat integrity layer
7. **Weekly Report Generation** — Auto-generated summaries, PDF/Excel export

### Sprint 4: Polish
8. **Route Optimization** — Smart route ordering based on priority scoring
9. **Data Export** — Export buttons across all modules
10. **Final QA pass** — Ensure all features work together, edge cases handled

---

## 9. DATABASE SCHEMA ADDITIONS

Add these tables to the existing schema in `CLAUDE.md`:

```sql
-- Store onboarding
ALTER TABLE stores ADD COLUMN discovered_at TIMESTAMPTZ;
ALTER TABLE stores ADD COLUMN storefront_photo_url TEXT;
ALTER TABLE stores ADD COLUMN approval_status TEXT DEFAULT 'approved'
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE stores ADD COLUMN approved_by UUID REFERENCES employees(id);
ALTER TABLE stores ADD COLUMN approved_at TIMESTAMPTZ;

-- Visit checklists
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  name_zh TEXT,
  items JSONB NOT NULL,
  assigned_tiers TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE visit_checklist_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id),
  template_id UUID REFERENCES checklist_templates(id),
  results JSONB NOT NULL,
  completion_rate DECIMAL(3, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly goals
CREATE TABLE monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  month DATE NOT NULL,
  goals JSONB NOT NULL,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, month)
);

CREATE TABLE goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES monthly_goals(id),
  employee_id UUID REFERENCES employees(id),
  progress JSONB NOT NULL,
  verified_count INTEGER DEFAULT 0,
  flagged_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anti-cheat integrity
CREATE TABLE visit_integrity_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id),
  flag_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('warning', 'critical')),
  details JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo comparisons
CREATE TABLE shelf_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  current_photo_id UUID REFERENCES visit_photos(id),
  previous_photo_id UUID REFERENCES visit_photos(id),
  diff_result JSONB NOT NULL,
  severity TEXT CHECK (severity IN ('positive', 'neutral', 'warning', 'critical')),
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 10. KEY DESIGN DECISIONS

1. **Map shows stores, not reps.** The customer explicitly said no live rep tracking. The map is a growing visualization of the store database. As reps onboard new stores, new pins appear. Color by status (visited/pending/overdue/discovered).

2. **Checklists are manager-configured, not hardcoded.** The manager must be able to create, edit, and assign checklist templates. Different templates for different store tiers. This is a settings/admin function.

3. **Goals change monthly.** Don't assume recurring goals. Each month the manager defines fresh goals based on current business conditions. The system should make it easy to create new goal sets and archive previous months.

4. **Anti-cheat is non-negotiable.** The customer specifically called this out. Every visit must pass the GPS + timestamp + photo triangle. Flagged visits go into a review queue. No silent passing of suspicious data.

5. **Export everything.** Every data view should have an export button. Default to Excel/CSV. Reports get PDF. Chinese business culture runs on Excel — this is table stakes.

6. **Reps don't handle restock orders.** Their job is: visit the store, verify products are stocked, take photos, complete checklist, onboard new stores. The ordering/restock workflow belongs to the distributor and is outside our scope.
