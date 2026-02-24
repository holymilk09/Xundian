import pg from 'pg';
import bcrypt from 'bcryptjs';

// ============================================================
// XunDian Demo Seed — Rich data for customer demos
// Run: npm run seed:demo -w packages/api
// ============================================================

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('WARNING: DATABASE_URL not set, using local development default');
}
const pool = new pg.Pool({
  connectionString: connectionString || 'postgres://xundian:xundian_dev@localhost:5434/xundian',
});

// ── Helpers ──────────────────────────────────────────────────

function uuid(suffix: string): string {
  return `00000000-0000-0000-0000-${suffix.padStart(12, '0')}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 4): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function jitter(base: number, range: number): number {
  return base + (Math.random() - 0.5) * 2 * range;
}

function workHourTimestamp(date: Date, minHour = 9, maxHour = 17): string {
  const d = new Date(date);
  d.setHours(randomInt(minHour, maxHour), randomInt(0, 59), randomInt(0, 59), 0);
  return d.toISOString();
}

// ── Constants ───────────────────────────────────────────────

const COMPANY_ID = uuid('1');

// Chengdu district center coordinates
const DISTRICTS: Record<string, { lat: number; lng: number; name_zh: string }> = {
  jinjiang:  { lat: 30.5728, lng: 104.0668, name_zh: '锦江区' },
  wuhou:     { lat: 30.5535, lng: 104.0520, name_zh: '武侯区' },
  qingyang:  { lat: 30.5732, lng: 104.0385, name_zh: '青羊区' },
  gaoxin:    { lat: 30.5460, lng: 104.0650, name_zh: '高新区' },
  jinniu:    { lat: 30.5920, lng: 104.0430, name_zh: '金牛区' },
  chenghua:  { lat: 30.5850, lng: 104.0830, name_zh: '成华区' },
};

// Store name templates — real Chengdu chains + family shops
const CHAIN_STORES = [
  { chain: '红旗连锁', chain_en: 'Hongqi Chain', type: 'supermarket' as const },
  { chain: '永辉超市', chain_en: 'Yonghui Supermarket', type: 'supermarket' as const },
  { chain: '舞东风', chain_en: 'Wudongfeng', type: 'convenience' as const },
  { chain: 'WOWO便利', chain_en: 'WOWO Convenience', type: 'convenience' as const },
  { chain: '互惠超市', chain_en: 'Huhui Supermarket', type: 'supermarket' as const },
  { chain: '7-Eleven', chain_en: '7-Eleven', type: 'convenience' as const },
  { chain: '全家便利', chain_en: 'FamilyMart', type: 'convenience' as const },
  { chain: '罗森', chain_en: 'Lawson', type: 'convenience' as const },
];

const FAMILY_SHOPS = [
  { name_zh: '张妈小卖部', name_en: 'Zhang Ma Shop' },
  { name_zh: '李记杂货铺', name_en: 'Li Ji Grocery' },
  { name_zh: '王姐便利店', name_en: 'Wang Jie Store' },
  { name_zh: '刘哥小超市', name_en: 'Liu Ge Mini Mart' },
  { name_zh: '陈家副食店', name_en: 'Chen Family Grocery' },
  { name_zh: '赵婆食品店', name_en: 'Zhao Po Food Shop' },
  { name_zh: '周氏百货', name_en: 'Zhou Shi General Store' },
  { name_zh: '吴大叔小卖部', name_en: 'Wu Dashu Shop' },
  { name_zh: '孙记杂货', name_en: 'Sun Ji Grocery' },
  { name_zh: '黄家便利', name_en: 'Huang Family Store' },
];

const STREET_NAMES: Record<string, string[]> = {
  jinjiang:  ['春熙路', '东大街', '红星路', '盐市口', '水井坊'],
  wuhou:     ['武侯祠大街', '科华北路', '高升桥路', '桐梓林路', '紫荆路'],
  qingyang:  ['金沙遗址路', '青羊大道', '长顺街', '光华村街', '贝森路'],
  gaoxin:    ['天府三街', '天府大道南段', '剑南大道', '益州大道', '世纪城路'],
  jinniu:    ['抚琴西路', '蜀汉路', '一品天下大街', '沙湾路', '人民北路'],
  chenghua:  ['建设路', '二仙桥路', '双桥路', '猛追湾街', '万年场'],
};

const VISIT_NOTES_ZH = [
  '货架整齐，陈列面充足',
  '豆瓣酱促销展架已搭建',
  '花椒油库存偏低，建议补货',
  '竞品占据眼平位置，需协调调整',
  '老板反馈顾客对新品火锅底料评价不错',
  '价签缺失，已提醒店员补上',
  '发现竞品新品上架，已拍照记录',
  '端架陈列位置被其他品牌占据',
  '库存充足，陈列整洁',
  '促销活动执行到位，POP已张贴',
  '店内客流量较大，建议增加SKU',
  '酱油类缺货严重，需紧急补货',
  '新品试推效果良好，店主愿意加大订货',
  '货架清洁度较差，已建议店员整理',
  '竞品做买赠活动，我方需跟进',
  '门头照片已更新，品牌形象提升',
  '冷柜温度正常，产品保存良好',
  '店主询问下月促销计划',
  '补货及时，库存恢复正常水平',
  '发现过期产品1件，已下架处理',
];

const COMPETITOR_BRANDS = ['李锦记', '海天', '厨邦', '老干妈', '太太乐', '恒顺', '千禾', '欣和'];

const ANOMALIES_ZH = [
  '花椒油库存即将售罄',
  '价签信息与实际售价不符',
  '竞品占据主要端架位置',
  '产品未正面朝外陈列',
  '泡椒完全缺货',
  '蚝油即将售罄',
  '促销POP缺失',
  '货架有灰尘需清洁',
  '产品被其他品类遮挡',
  '陈列面数低于合同要求',
];

// ── Employees ───────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  phone: string;
  role: 'admin' | 'area_manager' | 'rep';
  district?: string;
}

const EMPLOYEES: Employee[] = [
  { id: uuid('101'), name: 'Zhang Wei',   phone: '13800000001', role: 'admin' },
  { id: uuid('102'), name: 'Li Na',       phone: '13800000002', role: 'area_manager' },
  { id: uuid('110'), name: 'Zhao Peng',   phone: '13800000010', role: 'area_manager' },
  { id: uuid('103'), name: 'Wang Jun',    phone: '13800000003', role: 'rep', district: 'jinjiang' },
  { id: uuid('104'), name: 'Chen Mei',    phone: '13800000004', role: 'rep', district: 'wuhou' },
  { id: uuid('105'), name: 'Liu Tao',     phone: '13800000005', role: 'rep', district: 'qingyang' },
  { id: uuid('106'), name: 'Yang Fang',   phone: '13800000006', role: 'rep', district: 'gaoxin' },
  { id: uuid('107'), name: 'Huang Lei',   phone: '13800000007', role: 'rep', district: 'jinniu' },
  { id: uuid('108'), name: 'Wu Xia',      phone: '13800000008', role: 'rep', district: 'chenghua' },
  { id: uuid('109'), name: 'Sun Qiang',   phone: '13800000009', role: 'rep', district: 'jinjiang' },
];

const REPS = EMPLOYEES.filter(e => e.role === 'rep');
const MANAGERS = EMPLOYEES.filter(e => e.role === 'area_manager');

// ── Products ────────────────────────────────────────────────

const PRODUCTS = [
  { id: uuid('P01'), name: 'Doubanjiang 500g',       name_zh: '豆瓣酱500克',       sku: 'SKU-001', category: 'condiments' },
  { id: uuid('P02'), name: 'Sichuan Pepper Oil 250ml', name_zh: '花椒油250毫升',   sku: 'SKU-002', category: 'condiments' },
  { id: uuid('P03'), name: 'Hotpot Base Spicy 200g', name_zh: '火锅底料麻辣200克', sku: 'SKU-003', category: 'condiments' },
  { id: uuid('P04'), name: 'Pickled Peppers 280g',   name_zh: '泡椒280克',         sku: 'SKU-004', category: 'condiments' },
  { id: uuid('P05'), name: 'Soy Sauce Premium 500ml', name_zh: '特级酱油500毫升',  sku: 'SKU-005', category: 'condiments' },
  { id: uuid('P06'), name: 'Oyster Sauce 350ml',     name_zh: '蚝油350毫升',       sku: 'SKU-006', category: 'condiments' },
  { id: uuid('P07'), name: 'Chili Bean Paste 250g',  name_zh: '辣豆瓣酱250克',     sku: 'SKU-007', category: 'condiments' },
  { id: uuid('P08'), name: 'Sesame Oil 200ml',       name_zh: '芝麻油200毫升',     sku: 'SKU-008', category: 'condiments' },
  { id: uuid('P09'), name: 'Vinegar Aged 500ml',     name_zh: '陈醋500毫升',       sku: 'SKU-009', category: 'condiments' },
  { id: uuid('P10'), name: 'Hotpot Dip Sauce 120g',  name_zh: '火锅蘸料120克',     sku: 'SKU-010', category: 'condiments' },
];

// ── Store Generation ────────────────────────────────────────

interface StoreData {
  id: string;
  name: string;
  name_zh: string;
  lat: number;
  lng: number;
  address: string;
  tier: 'A' | 'B' | 'C';
  store_type: 'supermarket' | 'convenience' | 'small_shop';
  district: string;
  approval_status: 'approved' | 'pending';
}

function generateStores(): StoreData[] {
  const stores: StoreData[] = [];
  let storeNum = 201;
  const districtKeys = Object.keys(DISTRICTS);

  // 8 stores per district from chains = 48
  for (const dk of districtKeys) {
    const dist = DISTRICTS[dk]!;
    const streets = STREET_NAMES[dk]!;

    for (let i = 0; i < 8; i++) {
      const chain = CHAIN_STORES[i % CHAIN_STORES.length]!;
      const street = streets[i % streets.length]!;
      const streetNum = randomInt(1, 200);
      const tier: 'A' | 'B' | 'C' = i < 2 ? 'A' : i < 5 ? 'B' : 'C';

      stores.push({
        id: uuid(`${storeNum}`),
        name: `${chain.chain_en} ${dist.name_zh.replace('区', '')}`,
        name_zh: `${chain.chain}${dist.name_zh.replace('区', '')}${street.slice(0, 2)}店`,
        lat: jitter(dist.lat, 0.015),
        lng: jitter(dist.lng, 0.015),
        address: `${dist.name_zh}${street}${streetNum}号`,
        tier,
        store_type: chain.type,
        district: dk,
        approval_status: 'approved',
      });
      storeNum++;
    }
  }

  // 12 family shops spread across districts
  for (let i = 0; i < FAMILY_SHOPS.length; i++) {
    const shop = FAMILY_SHOPS[i]!;
    const dk = districtKeys[i % districtKeys.length]!;
    const dist = DISTRICTS[dk]!;
    const streets = STREET_NAMES[dk]!;
    const street = streets[randomInt(0, streets.length - 1)]!;

    stores.push({
      id: uuid(`${storeNum}`),
      name: shop.name_en,
      name_zh: shop.name_zh,
      lat: jitter(dist.lat, 0.012),
      lng: jitter(dist.lng, 0.012),
      address: `${dist.name_zh}${street}${randomInt(1, 100)}号`,
      tier: 'C',
      store_type: 'small_shop',
      district: dk,
      approval_status: 'approved',
    });
    storeNum++;
  }

  // 2 pending stores for approval demo
  const pendingDistricts = ['jinjiang', 'gaoxin'];
  for (let i = 0; i < 2; i++) {
    const dk = pendingDistricts[i]!;
    const dist = DISTRICTS[dk]!;
    const streets = STREET_NAMES[dk]!;
    stores.push({
      id: uuid(`${storeNum}`),
      name: i === 0 ? 'New Corner Store' : 'Tianfu Fresh Mart',
      name_zh: i === 0 ? '街角新发现杂货铺' : '天府生鲜超市',
      lat: jitter(dist.lat, 0.008),
      lng: jitter(dist.lng, 0.008),
      address: `${dist.name_zh}${streets[0]}${randomInt(50, 150)}号`,
      tier: i === 0 ? 'C' : 'B',
      store_type: i === 0 ? 'small_shop' : 'convenience',
      district: dk,
      approval_status: 'pending',
    });
    storeNum++;
  }

  return stores;
}

// ── Visit Generation ────────────────────────────────────────

interface VisitData {
  id: string;
  store_id: string;
  employee_id: string;
  checked_in_at: string;
  gps_lat: number;
  gps_lng: number;
  gps_accuracy_m: number;
  stock_status: string;
  notes: string;
  duration_minutes: number;
}

function generateVisits(stores: StoreData[]): VisitData[] {
  const visits: VisitData[] = [];
  let visitNum = 301;
  const approvedStores = stores.filter(s => s.approval_status === 'approved');

  // 30 days of visit history
  for (let day = 0; day < 30; day++) {
    const date = daysAgo(day);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (isWeekend && Math.random() > 0.2) continue; // Mostly skip weekends

    for (const rep of REPS) {
      // Each rep visits 3-6 stores per day
      const dailyCount = randomInt(3, 6);
      // Prefer stores in rep's assigned district
      const districtStores = approvedStores.filter(s => s.district === rep.district);
      const otherStores = approvedStores.filter(s => s.district !== rep.district);
      const pool = [...districtStores, ...districtStores, ...otherStores]; // weight local stores

      const visitedToday = new Set<string>();
      for (let v = 0; v < dailyCount; v++) {
        let store: StoreData;
        let attempts = 0;
        do {
          store = randomPick(pool);
          attempts++;
        } while (visitedToday.has(store.id) && attempts < 20);
        if (visitedToday.has(store.id)) continue;
        visitedToday.add(store.id);

        // A-tier stores visited more → higher probability of being picked
        if (store.tier === 'C' && Math.random() < 0.3) continue;

        const statusRoll = Math.random();
        const stock_status = statusRoll < 0.65 ? 'in_stock'
          : statusRoll < 0.85 ? 'low_stock'
          : statusRoll < 0.95 ? 'out_of_stock'
          : 'added_product';

        const duration = store.tier === 'A' ? randomInt(20, 40)
          : store.tier === 'B' ? randomInt(12, 25)
          : randomInt(5, 15);

        visits.push({
          id: uuid(`${visitNum}`),
          store_id: store.id,
          employee_id: rep.id,
          checked_in_at: workHourTimestamp(date, 9 + v, 10 + v),
          gps_lat: jitter(store.lat, 0.0002),
          gps_lng: jitter(store.lng, 0.0002),
          gps_accuracy_m: randomFloat(3, 25, 1),
          stock_status,
          notes: randomPick(VISIT_NOTES_ZH),
          duration_minutes: duration,
        });
        visitNum++;
      }
    }
  }

  return visits;
}

// ── Visit Photos with AI Analysis ───────────────────────────

interface PhotoData {
  visit_id: string;
  photo_url: string;
  photo_type: string;
  ai_analysis: object;
  ai_processed_at: string;
}

function generatePhotos(visits: VisitData[]): PhotoData[] {
  const photos: PhotoData[] = [];
  // Pick ~50 visits spread over the month to have photos
  const selected = visits
    .filter(() => Math.random() < 0.12)
    .slice(0, 50);

  for (let i = 0; i < selected.length; i++) {
    const v = selected[i]!;
    const sos = randomInt(12, 48);
    const ourCount = randomInt(2, 5);
    const our_products = [];
    const usedProducts = new Set<number>();

    for (let p = 0; p < ourCount; p++) {
      let idx: number;
      do { idx = randomInt(0, PRODUCTS.length - 1); } while (usedProducts.has(idx));
      usedProducts.add(idx);
      const prod = PRODUCTS[idx]!;
      const levels = ['high', 'medium', 'low', 'empty'] as const;
      const positions = ['eye', 'middle', 'bottom', 'top'] as const;
      our_products.push({
        name: prod.name_zh,
        facing_count: randomInt(0, 8),
        stock_level: randomPick([...levels]),
        shelf_position: randomPick([...positions]),
      });
    }

    const compCount = randomInt(1, 4);
    const competitors = [];
    const usedComps = new Set<number>();
    for (let c = 0; c < compCount; c++) {
      let idx: number;
      do { idx = randomInt(0, COMPETITOR_BRANDS.length - 1); } while (usedComps.has(idx));
      usedComps.add(idx);
      competitors.push({ name: COMPETITOR_BRANDS[idx], facing_count: randomInt(2, 12) });
    }

    const anomalyCount = Math.random() < 0.4 ? randomInt(1, 3) : 0;
    const anomalies: string[] = [];
    for (let a = 0; a < anomalyCount; a++) {
      const anom = randomPick(ANOMALIES_ZH);
      if (!anomalies.includes(anom)) anomalies.push(anom);
    }

    photos.push({
      visit_id: v.id,
      photo_url: `https://oss.example.com/photos/visit-${v.id.slice(-4)}-shelf${i + 1}.jpg`,
      photo_type: 'shelf',
      ai_analysis: {
        our_products,
        total_category_facings: randomInt(18, 45),
        share_of_shelf_percent: sos,
        competitors,
        anomalies,
        confidence: randomFloat(0.78, 0.96, 2),
      },
      ai_processed_at: v.checked_in_at,
    });
  }

  return photos;
}

// ── Main Seed Function ──────────────────────────────────────

async function seedDemo() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🌱 Seeding XunDian DEMO data (rich)...\n');

    // ── Clean existing data ──
    console.log('Cleaning existing data...');
    const tables = [
      'visit_integrity_flags', 'goal_progress', 'monthly_goals',
      'visit_checklist_results', 'checklist_templates',
      'shelf_comparisons', 'inventory_predictions', 'visit_photos',
      'daily_routes', 'notifications', 'revisit_schedule', 'promotions',
      'visits', 'stores', 'products', 'refresh_tokens', 'employees',
      'territories', 'companies',
    ];
    for (const t of tables) {
      await client.query(`DELETE FROM ${t}`);
    }
    console.log('  Cleaned all tables.\n');

    // ── 1. Company ──
    await client.query(
      `INSERT INTO companies (id, name, name_zh, business_license, unified_credit_code, industry, company_code, tier_config)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [COMPANY_ID, 'XunDian Demo Co', '巡店演示公司', 'BL-2024-DEMO-001', '91110000MA00DEMO01', 'fmcg', 'DEMO',
       JSON.stringify({ A: { revisit_days: 7 }, B: { revisit_days: 14 }, C: { revisit_days: 30 } })],
    );
    console.log('✓ Company: XunDian Demo Co');

    // ── 2. Employees ──
    const passwordHash = await bcrypt.hash('demo123', 12);
    for (const emp of EMPLOYEES) {
      await client.query(
        `INSERT INTO employees (id, company_id, name, phone, password_hash, role)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [emp.id, COMPANY_ID, emp.name, emp.phone, passwordHash, emp.role],
      );
    }
    console.log(`✓ Employees: ${EMPLOYEES.length} (1 admin, 2 managers, 7 reps)`);

    // ── 3. Products ──
    for (const p of PRODUCTS) {
      await client.query(
        `INSERT INTO products (id, company_id, name, name_zh, sku, category)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [p.id, COMPANY_ID, p.name, p.name_zh, p.sku, p.category],
      );
    }
    console.log(`✓ Products: ${PRODUCTS.length}`);

    // ── 4. Stores ──
    const stores = generateStores();
    for (const s of stores) {
      if (s.approval_status === 'approved') {
        await client.query(
          `INSERT INTO stores (id, company_id, name, name_zh, location, address, tier, store_type, discovered_by, discovered_at, approval_status, approved_by, approved_at)
           VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($6, $5), 4326), $7, $8, $9, $10, $11, 'approved', $12, $11)`,
          [s.id, COMPANY_ID, s.name, s.name_zh, s.lat, s.lng, s.address, s.tier, s.store_type,
           randomPick(REPS).id, daysAgo(randomInt(30, 90)).toISOString(), MANAGERS[0]!.id],
        );
      } else {
        await client.query(
          `INSERT INTO stores (id, company_id, name, name_zh, location, address, tier, store_type, discovered_by, discovered_at, approval_status, storefront_photo_url, notes)
           VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($6, $5), 4326), $7, $8, $9, $10, NOW(), 'pending', $11, $12)`,
          [s.id, COMPANY_ID, s.name, s.name_zh, s.lat, s.lng, s.address, s.tier, s.store_type,
           randomPick(REPS).id, `https://oss.example.com/storefronts/store-${s.id.slice(-4)}.jpg`,
           '新发现门店，待审批'],
        );
      }
    }
    const approvedCount = stores.filter(s => s.approval_status === 'approved').length;
    const pendingCount = stores.filter(s => s.approval_status === 'pending').length;
    console.log(`✓ Stores: ${stores.length} (${approvedCount} approved, ${pendingCount} pending)`);

    // ── 5. Visits ──
    const visits = generateVisits(stores);
    for (const v of visits) {
      await client.query(
        `INSERT INTO visits (id, company_id, store_id, employee_id, checked_in_at, gps_lat, gps_lng, gps_accuracy_m, stock_status, notes, duration_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [v.id, COMPANY_ID, v.store_id, v.employee_id, v.checked_in_at, v.gps_lat, v.gps_lng,
         v.gps_accuracy_m, v.stock_status, v.notes, v.duration_minutes],
      );
    }
    console.log(`✓ Visits: ${visits.length}`);

    // ── 6. Visit Photos with AI Analysis ──
    const photos = generatePhotos(visits);
    // We need the DB-generated IDs for shelf comparisons, so collect them
    const photoDbIds: { id: string; visit_id: string; store_id: string }[] = [];
    for (const p of photos) {
      const res = await client.query(
        `INSERT INTO visit_photos (visit_id, photo_url, photo_type, ai_analysis, ai_processed_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [p.visit_id, p.photo_url, p.photo_type, JSON.stringify(p.ai_analysis), p.ai_processed_at],
      );
      const visit = visits.find(v => v.id === p.visit_id)!;
      photoDbIds.push({ id: res.rows[0].id, visit_id: p.visit_id, store_id: visit.store_id });
    }
    console.log(`✓ Visit Photos + AI: ${photos.length}`);

    // ── 7. Shelf Comparisons ──
    // Group photos by store, create comparisons for stores with 2+ photos
    const photosByStore = new Map<string, string[]>();
    for (const p of photoDbIds) {
      if (!photosByStore.has(p.store_id)) photosByStore.set(p.store_id, []);
      photosByStore.get(p.store_id)!.push(p.id);
    }

    let shelfCompCount = 0;
    const severities = ['positive', 'neutral', 'warning', 'critical'] as const;
    for (const [storeId, photoIds] of photosByStore) {
      if (photoIds.length < 2) continue;
      if (shelfCompCount >= 15) break;

      const prevSos = randomInt(15, 35);
      const currSos = prevSos + randomInt(-10, 10);
      const sev = currSos > prevSos ? 'positive' : currSos < prevSos - 5 ? 'warning' : 'neutral';

      await client.query(
        `INSERT INTO shelf_comparisons (store_id, current_photo_id, previous_photo_id, diff_result, severity, confidence)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [storeId, photoIds[1], photoIds[0],
         JSON.stringify({
           sos_change: { previous: prevSos, current: currSos, delta: `${currSos >= prevSos ? '+' : ''}${currSos - prevSos}%` },
           facing_changes: [
             { product: randomPick(PRODUCTS).name_zh, previous: randomInt(2, 6), current: randomInt(2, 8), change: `${randomInt(-2, 3)}` },
             { product: randomPick(PRODUCTS).name_zh, previous: randomInt(1, 4), current: randomInt(1, 4), change: '0' },
           ],
           competitor_changes: [
             { brand: randomPick(COMPETITOR_BRANDS), change: `${randomInt(-3, 3)} facing${Math.abs(randomInt(-3, 3)) !== 1 ? 's' : ''}` },
           ],
           new_items_detected: Math.random() < 0.3 ? [`${randomPick(COMPETITOR_BRANDS)}新品`] : [],
           missing_items: Math.random() < 0.3 ? [`${randomPick(PRODUCTS).name_zh} (低库存)`] : [],
           compliance: {
             price_tag_present: Math.random() > 0.2,
             product_facing_forward: Math.random() > 0.15,
             shelf_clean: Math.random() > 0.25,
           },
         }),
         sev, randomFloat(0.82, 0.95, 2)],
      );
      shelfCompCount++;
    }
    console.log(`✓ Shelf Comparisons: ${shelfCompCount}`);

    // ── 8. Inventory Predictions ──
    const predStores = stores.filter(s => s.approval_status === 'approved').slice(0, 25);
    let predCount = 0;
    for (const s of predStores) {
      const prod = PRODUCTS[predCount % PRODUCTS.length]!;
      const daysToStockout = randomInt(1, 14);
      await client.query(
        `INSERT INTO inventory_predictions (store_id, product_id, predicted_stockout_date, confidence, recommended_revisit_date, model_version)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [s.id, prod.id, dateStr(daysFromNow(daysToStockout)),
         randomFloat(0.65, 0.97, 2),
         dateStr(daysFromNow(Math.max(1, daysToStockout - 2))),
         'xgb-v1.2'],
      );
      predCount++;
    }
    console.log(`✓ Inventory Predictions: ${predCount}`);

    // ── 9. Revisit Schedule ──
    const revisitReasons = ['scheduled', 'oos_detected', 'new_product', 'scheduled', 'scheduled'];
    const revisitPriorities = ['high', 'normal', 'normal', 'low'];
    let revisitCount = 0;
    for (let i = 0; i < 20; i++) {
      const s = stores[i % approvedCount]!;
      const rep = randomPick(REPS);
      await client.query(
        `INSERT INTO revisit_schedule (company_id, store_id, next_visit_date, priority, reason, assigned_to, completed)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [COMPANY_ID, s.id, dateStr(daysFromNow(randomInt(-2, 7))),
         randomPick(revisitPriorities), randomPick(revisitReasons), rep.id,
         i < 5], // 5 already completed
      );
      revisitCount++;
    }
    console.log(`✓ Revisit Schedule: ${revisitCount}`);

    // ── 10. Promotions ──
    const promotions = [
      {
        product_id: PRODUCTS[0]!.id, title: 'Spring Festival Doubanjiang Promo', title_zh: '春节豆瓣酱促销',
        desc: 'Buy 2 get 1 free on all Doubanjiang 500g', desc_zh: '豆瓣酱500克 买二送一',
        display: '3 facings at eye level, red Spring Festival banner', display_zh: '眼平位置3个陈列面，需挂春节红色横幅',
        tiers: ['A', 'B', 'C'], start: -7, end: 14,
      },
      {
        product_id: PRODUCTS[2]!.id, title: 'Hotpot Season Bundle', title_zh: '火锅季组合优惠',
        desc: '30% off hotpot base with pepper oil', desc_zh: '火锅底料搭配花椒油享7折优惠',
        display: 'End-cap with hotpot+pepper oil bundle', display_zh: '端架陈列火锅底料+花椒油组合装',
        tiers: ['A', 'B'], start: -3, end: 21,
      },
      {
        product_id: PRODUCTS[4]!.id, title: 'Premium Soy Sauce Tasting', title_zh: '特级酱油试饮活动',
        desc: 'Free tasting sample at selected stores', desc_zh: '特级酱油500毫升免费试用装',
        display: 'Tasting station at entrance', display_zh: '门店入口设试饮台，至少2个陈列面',
        tiers: ['A'], start: 10, end: 24,
      },
      {
        product_id: PRODUCTS[1]!.id, title: 'Pepper Oil New Packaging Launch', title_zh: '花椒油新包装上市',
        desc: 'New 250ml bottle design with 10% extra', desc_zh: '新瓶装花椒油加量10%不加价',
        display: 'Eye-level display with new packaging POP', display_zh: '眼平位置陈列，张贴新包装宣传海报',
        tiers: ['A', 'B', 'C'], start: -14, end: -1,
      },
      {
        product_id: PRODUCTS[5]!.id, title: 'Oyster Sauce Family Pack', title_zh: '蚝油家庭装优惠',
        desc: 'Buy 3 bottles get 15% off', desc_zh: '蚝油3瓶装享85折',
        display: '2 facings minimum, yellow price tag', display_zh: '至少2个陈列面，使用黄色特价签',
        tiers: ['A', 'B'], start: -5, end: 10,
      },
      {
        product_id: PRODUCTS[6]!.id, title: 'Chili Paste Weekend Flash', title_zh: '辣豆瓣酱周末特惠',
        desc: 'Weekend only: 20% off chili bean paste', desc_zh: '周末限定：辣豆瓣酱8折',
        display: 'Checkout counter display', display_zh: '收银台旁促销堆头',
        tiers: ['A', 'B', 'C'], start: 1, end: 3,
      },
      {
        product_id: PRODUCTS[7]!.id, title: 'Sesame Oil Gift Set CNY', title_zh: '芝麻油春节礼盒',
        desc: 'Limited edition gift set with ceramic bottle', desc_zh: '限量陶瓷瓶芝麻油礼盒装',
        display: 'Premium display near entrance', display_zh: '入口处精品展架陈列',
        tiers: ['A'], start: -21, end: -5,
      },
      {
        product_id: PRODUCTS[8]!.id, title: 'Aged Vinegar Health Campaign', title_zh: '陈醋养生推广',
        desc: 'Health-focused marketing for aged vinegar', desc_zh: '陈醋养生概念推广活动',
        display: 'Health food section, green POP materials', display_zh: '健康食品区域，使用绿色宣传物料',
        tiers: ['A', 'B'], start: 3, end: 17,
      },
      {
        product_id: PRODUCTS[9]!.id, title: 'Dip Sauce New Flavor Launch', title_zh: '火锅蘸料新口味上市',
        desc: 'New garlic sesame flavor launch', desc_zh: '蒜蓉芝麻新口味火锅蘸料上市',
        display: 'Next to hotpot base section', display_zh: '火锅底料旁边陈列',
        tiers: ['A', 'B', 'C'], start: -1, end: 28,
      },
      {
        product_id: PRODUCTS[3]!.id, title: 'Pickled Peppers BOGO', title_zh: '泡椒买一送一',
        desc: 'Buy one get one free on 280g packs', desc_zh: '泡椒280克买一送一',
        display: 'Shelf talker + floor sticker', display_zh: '货架插卡+地贴',
        tiers: ['B', 'C'], start: -10, end: 5,
      },
      {
        product_id: PRODUCTS[0]!.id, title: 'Doubanjiang Cooking Class', title_zh: '豆瓣酱烹饪教学活动',
        desc: 'In-store cooking demo with our doubanjiang', desc_zh: '门店内豆瓣酱烹饪教学演示',
        display: 'Demo table near condiment aisle', display_zh: '调味品过道旁设演示台',
        tiers: ['A'], start: 7, end: 14,
      },
      {
        product_id: PRODUCTS[2]!.id, title: 'Hotpot Base Multi-buy', title_zh: '火锅底料多买优惠',
        desc: 'Buy 5+ units for wholesale pricing', desc_zh: '5件及以上享批发价',
        display: 'Pallet display at store front', display_zh: '门店前端托盘堆头陈列',
        tiers: ['A', 'B'], start: -2, end: 12,
      },
    ];

    for (const promo of promotions) {
      await client.query(
        `INSERT INTO promotions (company_id, product_id, title, title_zh, description, description_zh, display_instructions, display_instructions_zh, target_tiers, start_date, end_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [COMPANY_ID, promo.product_id, promo.title, promo.title_zh, promo.desc, promo.desc_zh,
         promo.display, promo.display_zh, promo.tiers,
         dateStr(daysFromNow(promo.start)), dateStr(daysFromNow(promo.end)), MANAGERS[0]!.id],
      );
    }
    console.log(`✓ Promotions: ${promotions.length}`);

    // ── 11. Checklist Templates ──
    const checklists = [
      {
        id: uuid('501'), name: 'Standard Visit Checklist', name_zh: '标准巡检清单',
        items: [
          { id: 'chk-1', label: 'Shelf photo taken', label_zh: '已拍货架照片', type: 'photo', required: true },
          { id: 'chk-2', label: 'Price tags visible', label_zh: '价签清晰可见', type: 'yes_no', required: true },
          { id: 'chk-3', label: 'Products facing forward', label_zh: '产品正面朝外', type: 'yes_no', required: true },
          { id: 'chk-4', label: 'Shelf clean', label_zh: '货架整洁有序', type: 'yes_no', required: false },
          { id: 'chk-5', label: 'Competitor count', label_zh: '竞品数量', type: 'numeric', required: false },
          { id: 'chk-6', label: 'Store manager feedback', label_zh: '店主反馈', type: 'text', required: false },
        ],
        tiers: ['A', 'B', 'C'],
      },
      {
        id: uuid('502'), name: 'Premium Store Checklist', name_zh: 'A级门店专用清单',
        items: [
          { id: 'chk-p1', label: 'Shelf photo taken', label_zh: '已拍货架照片', type: 'photo', required: true },
          { id: 'chk-p2', label: 'Promotion display set up', label_zh: '促销展架已搭建', type: 'yes_no', required: true },
          { id: 'chk-p3', label: 'Stock level', label_zh: '库存水平', type: 'dropdown', required: true, options: ['Full', 'Adequate', 'Low', 'Empty'] },
          { id: 'chk-p4', label: 'Storefront photo', label_zh: '门头照片', type: 'photo', required: true },
          { id: 'chk-p5', label: 'Our facings count', label_zh: '我方陈列面数', type: 'numeric', required: true },
          { id: 'chk-p6', label: 'Notes', label_zh: '备注', type: 'text', required: false },
        ],
        tiers: ['A'],
      },
      {
        id: uuid('503'), name: 'Quick C-Tier Check', name_zh: 'C级门店快速检查',
        items: [
          { id: 'chk-c1', label: 'Shelf photo', label_zh: '货架照片', type: 'photo', required: true },
          { id: 'chk-c2', label: 'Product in stock', label_zh: '产品有货', type: 'yes_no', required: true },
          { id: 'chk-c3', label: 'Notes', label_zh: '备注', type: 'text', required: false },
        ],
        tiers: ['C'],
      },
      {
        id: uuid('504'), name: 'New Store Audit', name_zh: '新门店审核清单',
        items: [
          { id: 'chk-n1', label: 'Storefront photo', label_zh: '门头照片', type: 'photo', required: true },
          { id: 'chk-n2', label: 'Store size estimate (sqm)', label_zh: '门店面积估算(平方米)', type: 'numeric', required: true },
          { id: 'chk-n3', label: 'Has condiment section', label_zh: '有调味品区域', type: 'yes_no', required: true },
          { id: 'chk-n4', label: 'Competitor products present', label_zh: '是否有竞品', type: 'yes_no', required: true },
          { id: 'chk-n5', label: 'Owner contact obtained', label_zh: '已获取店主联系方式', type: 'yes_no', required: true },
          { id: 'chk-n6', label: 'Recommended tier', label_zh: '建议等级', type: 'dropdown', required: true, options: ['A', 'B', 'C'] },
          { id: 'chk-n7', label: 'Additional notes', label_zh: '补充说明', type: 'text', required: false },
        ],
        tiers: ['A', 'B', 'C'],
      },
    ];

    for (const tmpl of checklists) {
      await client.query(
        `INSERT INTO checklist_templates (id, company_id, name, name_zh, items, assigned_tiers, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tmpl.id, COMPANY_ID, tmpl.name, tmpl.name_zh, JSON.stringify(tmpl.items), tmpl.tiers, MANAGERS[0]!.id],
      );
    }
    console.log(`✓ Checklist Templates: ${checklists.length}`);

    // ── 12. Monthly Goals + Progress ──
    const currentMonth = dateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const goalId = uuid('601');

    await client.query(
      `INSERT INTO monthly_goals (id, company_id, month, goals, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [goalId, COMPANY_ID, currentMonth,
       JSON.stringify([
         { id: 'g1', metric: 'visits_target', target: 25, label: 'Complete 25 store visits', label_zh: '完成25次巡店' },
         { id: 'g2', metric: 'stores_target', target: 10, label: 'Visit 10 unique stores', label_zh: '巡访10家不同门店' },
         { id: 'g3', metric: 'coverage_percent', target: 90, label: 'Achieve 90% territory coverage', label_zh: '达到90%区域覆盖率' },
         { id: 'g4', metric: 'new_stores_target', target: 3, label: 'Discover 3 new stores', label_zh: '发现3家新门店' },
       ]),
       MANAGERS[0]!.id],
    );

    for (const rep of REPS) {
      const repVisits = randomInt(10, 22);
      const repStores = randomInt(5, 10);
      const coverage = randomInt(55, 92);
      const newStores = randomInt(0, 3);
      await client.query(
        `INSERT INTO goal_progress (goal_id, employee_id, progress, verified_count, flagged_count)
         VALUES ($1, $2, $3, $4, $5)`,
        [goalId, rep.id,
         JSON.stringify([
           { goal_id: 'g1', metric: 'visits_target', target: 25, current: repVisits, verified: repVisits - randomInt(0, 2), flagged: randomInt(0, 2), percent: Math.round((repVisits / 25) * 100) },
           { goal_id: 'g2', metric: 'stores_target', target: 10, current: repStores, verified: repStores, flagged: 0, percent: Math.round((repStores / 10) * 100) },
           { goal_id: 'g3', metric: 'coverage_percent', target: 90, current: coverage, verified: coverage, flagged: 0, percent: Math.round((coverage / 90) * 100) },
           { goal_id: 'g4', metric: 'new_stores_target', target: 3, current: newStores, verified: newStores, flagged: 0, percent: Math.round((newStores / 3) * 100) },
         ]),
         repVisits - randomInt(0, 2), randomInt(0, 2)],
      );
    }
    console.log(`✓ Monthly Goals: 1 goal set + progress for ${REPS.length} reps`);

    // ── 13. Visit Integrity Flags ──
    const flagTypes = [
      { type: 'visit_too_short', sev: 'warning' as const, detail: (v: VisitData) => ({ actual_duration_minutes: randomInt(1, 3), minimum_required: 5, message: `Visit lasted only ${randomInt(1, 3)} minutes` }) },
      { type: 'gps_accuracy_low', sev: 'warning' as const, detail: (v: VisitData) => ({ accuracy_m: randomInt(55, 120), threshold_m: 50, message: `GPS accuracy was ${randomInt(55, 120)}m, threshold is 50m` }) },
      { type: 'gps_drift', sev: 'critical' as const, detail: (v: VisitData) => ({ distance_from_store_m: randomInt(250, 800), threshold_m: 200, message: `Rep was ${randomInt(250, 800)}m from store location` }) },
      { type: 'impossible_travel', sev: 'critical' as const, detail: (v: VisitData) => ({ prev_store_distance_km: randomFloat(15, 40, 1), time_gap_minutes: randomInt(3, 8), message: `Traveled ${randomFloat(15, 40, 1)}km in ${randomInt(3, 8)} minutes` }) },
      { type: 'burst_visits', sev: 'warning' as const, detail: (v: VisitData) => ({ visits_in_30min: randomInt(4, 7), threshold: 3, message: `${randomInt(4, 7)} visits within 30 minutes` }) },
    ];

    let flagCount = 0;
    // Flag ~5% of visits
    const flaggedVisits = visits.filter(() => Math.random() < 0.05).slice(0, 20);
    for (const v of flaggedVisits) {
      const ft = randomPick(flagTypes);
      await client.query(
        `INSERT INTO visit_integrity_flags (visit_id, flag_type, severity, details, resolved, resolved_by, resolved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [v.id, ft.type, ft.sev, JSON.stringify(ft.detail(v)),
         Math.random() < 0.3, // 30% resolved
         Math.random() < 0.3 ? MANAGERS[0]!.id : null,
         Math.random() < 0.3 ? daysAgo(randomInt(0, 3)).toISOString() : null],
      );
      flagCount++;
    }
    console.log(`✓ Integrity Flags: ${flagCount}`);

    // ── 14. Daily Routes (today) ──
    const today = dateStr(new Date());
    let routeCount = 0;
    for (const rep of REPS) {
      const repStores = stores
        .filter(s => s.district === rep.district && s.approval_status === 'approved')
        .slice(0, randomInt(4, 7));

      const waypoints = repStores.map((s, i) => ({
        store_id: s.id,
        store_name: s.name_zh,
        sequence: i + 1,
        latitude: s.lat,
        longitude: s.lng,
        estimated_arrival: `${9 + i}:${randomInt(0, 5)}0`,
        estimated_duration_minutes: randomInt(15, 40),
        visited: i < 2, // first 2 done
      }));

      const totalDist = randomFloat(5, 18, 1);
      await client.query(
        `INSERT INTO daily_routes (company_id, employee_id, date, waypoints, total_distance_km, estimated_duration_minutes, optimized)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [COMPANY_ID, rep.id, today, JSON.stringify(waypoints), totalDist, randomInt(180, 360)],
      );
      routeCount++;
    }
    console.log(`✓ Daily Routes: ${routeCount} (today)`);

    // ── 15. Notifications ──
    const notifications = [
      // For reps
      ...REPS.slice(0, 4).map(rep => ({
        emp: rep.id, type: 'revisit_reminder', title: '复访提醒',
        message: `您有一个高优先级复访计划：今日巡检${randomPick(stores.filter(s => s.approval_status === 'approved')).name_zh}。原因：缺货预警。`,
        store_id: randomPick(stores.filter(s => s.approval_status === 'approved')).id,
      })),
      ...REPS.slice(0, 3).map(rep => ({
        emp: rep.id, type: 'oos_alert', title: '缺货预警',
        message: `${randomPick(stores.filter(s => s.approval_status === 'approved')).name_zh}检测到${randomPick(PRODUCTS).name_zh}缺货，已安排复访。`,
        store_id: randomPick(stores.filter(s => s.approval_status === 'approved')).id,
      })),
      ...REPS.map(rep => ({
        emp: rep.id, type: 'route_ready', title: '路线已优化',
        message: `今日优化路线已就绪。${randomInt(4, 7)}家门店，预计${randomFloat(2.5, 5, 1)}小时。`,
        store_id: null as string | null,
      })),
      // Manager notifications
      { emp: MANAGERS[0]!.id, type: 'system', title: '新门店待审批', message: '有2家新发现门店等待您的审批。', store_id: null as string | null },
      { emp: MANAGERS[0]!.id, type: 'system', title: '周报已生成', message: '上周巡检周报已生成，请查看团队表现数据。', store_id: null as string | null },
    ];

    for (const n of notifications) {
      await client.query(
        `INSERT INTO notifications (company_id, employee_id, type, title, message, store_id, read)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [COMPANY_ID, n.emp, n.type, n.title, n.message, n.store_id, Math.random() < 0.3],
      );
    }
    console.log(`✓ Notifications: ${notifications.length}`);

    // ── Done ──
    await client.query('COMMIT');

    console.log('\n========================================');
    console.log('  DEMO SEED COMPLETE');
    console.log('========================================');
    console.log(`  Company:      XunDian Demo Co (DEMO)`);
    console.log(`  Employees:    ${EMPLOYEES.length}`);
    console.log(`  Products:     ${PRODUCTS.length}`);
    console.log(`  Stores:       ${stores.length}`);
    console.log(`  Visits:       ${visits.length}`);
    console.log(`  Photos+AI:    ${photos.length}`);
    console.log(`  Shelf Diffs:  ${shelfCompCount}`);
    console.log(`  Predictions:  ${predCount}`);
    console.log(`  Revisits:     ${revisitCount}`);
    console.log(`  Promotions:   ${promotions.length}`);
    console.log(`  Checklists:   ${checklists.length}`);
    console.log(`  Goals:        1 + ${REPS.length} rep progress`);
    console.log(`  Flags:        ${flagCount}`);
    console.log(`  Routes:       ${routeCount}`);
    console.log(`  Notifications:${notifications.length}`);
    console.log('========================================');
    console.log('\nLogin credentials:');
    console.log('  Company code: DEMO');
    console.log('  Admin:    13800000001 / demo123 (Zhang Wei)');
    console.log('  Manager:  13800000002 / demo123 (Li Na)');
    console.log('  Manager:  13800000010 / demo123 (Zhao Peng)');
    console.log('  Rep:      13800000003 / demo123 (Wang Jun - Jinjiang)');
    console.log('  Rep:      13800000004 / demo123 (Chen Mei - Wuhou)');
    console.log('  Rep:      13800000005 / demo123 (Liu Tao - Qingyang)');
    console.log('  Rep:      13800000006 / demo123 (Yang Fang - Gaoxin)');
    console.log('  Rep:      13800000007 / demo123 (Huang Lei - Jinniu)');
    console.log('  Rep:      13800000008 / demo123 (Wu Xia - Chenghua)');
    console.log('  Rep:      13800000009 / demo123 (Sun Qiang - Jinjiang)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemo().catch(() => process.exit(1));
