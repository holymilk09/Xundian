import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://xundian:xundian_dev@localhost:5434/xundian',
});

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Seeding XunDian demo data...');

    // 1. Create demo company
    const companyResult = await client.query(
      `INSERT INTO companies (id, name, name_zh, business_license, unified_credit_code, industry, company_code, tier_config)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [
        '00000000-0000-0000-0000-000000000001',
        'XunDian Demo Co',
        '巡店演示公司',
        'BL-2024-DEMO-001',
        '91110000MA00DEMO01',
        'fmcg',
        'DEMO',
        JSON.stringify({ A: { revisit_days: 7 }, B: { revisit_days: 14 }, C: { revisit_days: 30 } }),
      ],
    );

    const companyId = '00000000-0000-0000-0000-000000000001';
    console.log('  Company created: XunDian Demo Co');

    // 2. Create employees
    const passwordHash = await bcrypt.hash('demo123', 12);

    const employees = [
      { id: '00000000-0000-0000-0000-000000000101', name: 'Zhang Wei', phone: '13800000001', role: 'admin' },
      { id: '00000000-0000-0000-0000-000000000102', name: 'Li Na', phone: '13800000002', role: 'area_manager' },
      { id: '00000000-0000-0000-0000-000000000103', name: 'Wang Jun', phone: '13800000003', role: 'rep' },
      { id: '00000000-0000-0000-0000-000000000104', name: 'Chen Mei', phone: '13800000004', role: 'rep' },
    ];

    for (const emp of employees) {
      await client.query(
        `INSERT INTO employees (id, company_id, name, phone, password_hash, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [emp.id, companyId, emp.name, emp.phone, passwordHash, emp.role],
      );
      console.log(`  Employee created: ${emp.name} (${emp.role})`);
    }

    // Phase 2 tables
    await client.query(`
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
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
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
      )
    `);
    console.log('  Phase 2 tables created (daily_routes, notifications)');

    // Sprint 1 migration: add store onboarding columns
    await client.query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS discovered_at TIMESTAMPTZ`);
    await client.query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS storefront_photo_url TEXT`);
    await client.query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved'`);
    await client.query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES employees(id)`);
    await client.query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ`);
    await client.query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS notes TEXT`);
    // Also update notifications CHECK constraint to include store_discovered
    await client.query(`ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check`);
    await client.query(`ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('revisit_reminder', 'oos_alert', 'route_ready', 'system', 'store_discovered'))`);
    console.log('  Sprint 1 migration: store onboarding columns added');

    // 3. Create stores (Chengdu area — 6 districts)
    const stores = [
      {
        id: '00000000-0000-0000-0000-000000000201',
        name: 'Hongqi Supermarket Chunxi',
        name_zh: '红旗超市春熙路店',
        lat: 30.5728,
        lng: 104.0668,
        address: '锦江区春熙路128号',
        tier: 'A',
        store_type: 'supermarket',
      },
      {
        id: '00000000-0000-0000-0000-000000000202',
        name: 'Wudongfeng Convenience Wuhou',
        name_zh: '舞东风便利武侯店',
        lat: 30.5535,
        lng: 104.0520,
        address: '武侯区武侯祠大街66号',
        tier: 'B',
        store_type: 'convenience',
      },
      {
        id: '00000000-0000-0000-0000-000000000203',
        name: 'WOWO Convenience Qingyang',
        name_zh: 'WOWO便利青羊店',
        lat: 30.5732,
        lng: 104.0385,
        address: '青羊区金沙遗址路45号',
        tier: 'B',
        store_type: 'convenience',
      },
      {
        id: '00000000-0000-0000-0000-000000000204',
        name: 'Zhang Ma Small Shop',
        name_zh: '张妈小卖部',
        lat: 30.5610,
        lng: 104.0430,
        address: '金牛区抚琴西路12号',
        tier: 'C',
        store_type: 'small_shop',
      },
      {
        id: '00000000-0000-0000-0000-000000000205',
        name: 'Huhui Supermarket Gaoxin',
        name_zh: '互惠超市高新店',
        lat: 30.5460,
        lng: 104.0650,
        address: '高新区天府三街199号',
        tier: 'A',
        store_type: 'supermarket',
      },
      {
        id: '00000000-0000-0000-0000-000000000206',
        name: 'Hongqi Express Chenghua',
        name_zh: '红旗快便利成华店',
        lat: 30.5850,
        lng: 104.0830,
        address: '成华区建设路68号',
        tier: 'B',
        store_type: 'convenience',
      },
    ];

    for (const store of stores) {
      await client.query(
        `INSERT INTO stores (id, company_id, name, name_zh, location, address, tier, store_type, discovered_by, discovered_at, approval_status, approved_at)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($6, $5), 4326), $7, $8, $9, $10, NOW(), 'approved', NOW())
         ON CONFLICT (id) DO NOTHING`,
        [store.id, companyId, store.name, store.name_zh, store.lat, store.lng, store.address, store.tier, store.store_type, employees[2]!.id],
      );
      console.log(`  Store created: ${store.name}`);
    }

    // 3b. Create 2 pending stores for approval demo
    const pendingStores = [
      {
        id: '00000000-0000-0000-0000-000000000207',
        name: 'Liu Ji Grocery',
        name_zh: '刘记杂货铺',
        lat: 30.5680,
        lng: 104.0550,
        address: '锦江区东大街15号',
        tier: 'C',
        store_type: 'small_shop',
        discovered_by: employees[2]!.id,
        storefront_photo_url: 'https://oss.example.com/storefronts/liuji-grocery.jpg',
        notes: '街角杂货铺，老板说以前用过我们的酱油',
      },
      {
        id: '00000000-0000-0000-0000-000000000208',
        name: 'Tianfu Mini Mart',
        name_zh: '天府小超市',
        lat: 30.5520,
        lng: 104.0710,
        address: '高新区天府大道南段88号',
        tier: 'B',
        store_type: 'convenience',
        discovered_by: employees[3]!.id,
        storefront_photo_url: 'https://oss.example.com/storefronts/tianfu-minimart.jpg',
        notes: '新开业的便利店，附近小区住户多',
      },
    ];

    for (const store of pendingStores) {
      await client.query(
        `INSERT INTO stores (id, company_id, name, name_zh, location, address, tier, store_type, discovered_by, discovered_at, approval_status, storefront_photo_url, notes)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($6, $5), 4326), $7, $8, $9, $10, NOW(), 'pending', $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [store.id, companyId, store.name, store.name_zh, store.lat, store.lng, store.address, store.tier, store.store_type, store.discovered_by, store.storefront_photo_url, store.notes],
      );
      console.log(`  Pending store created: ${store.name}`);
    }

    // 4. Create sample visits
    const now = new Date();
    const visits = [
      {
        id: '00000000-0000-0000-0000-000000000301',
        store_id: stores[0]!.id,
        employee_id: employees[2]!.id,
        checked_in_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        gps_lat: stores[0]!.lat,
        gps_lng: stores[0]!.lng,
        gps_accuracy_m: 8.5,
        stock_status: 'in_stock',
        notes: '货架整齐，豆瓣酱促销展架已搭建。',
        duration_minutes: 25,
      },
      {
        id: '00000000-0000-0000-0000-000000000302',
        store_id: stores[1]!.id,
        employee_id: employees[2]!.id,
        checked_in_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        gps_lat: stores[1]!.lat,
        gps_lng: stores[1]!.lng,
        gps_accuracy_m: 12.0,
        stock_status: 'low_stock',
        notes: '花椒油库存偏低，本周需补货。',
        duration_minutes: 15,
      },
      {
        id: '00000000-0000-0000-0000-000000000303',
        store_id: stores[3]!.id,
        employee_id: employees[3]!.id,
        checked_in_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        gps_lat: stores[3]!.lat,
        gps_lng: stores[3]!.lng,
        gps_accuracy_m: 5.2,
        stock_status: 'out_of_stock',
        notes: '完全缺货，老板说供应商延迟了。',
        duration_minutes: 10,
      },
    ];

    for (const visit of visits) {
      await client.query(
        `INSERT INTO visits (id, company_id, store_id, employee_id, checked_in_at, gps_lat, gps_lng, gps_accuracy_m, stock_status, notes, duration_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [visit.id, companyId, visit.store_id, visit.employee_id, visit.checked_in_at, visit.gps_lat, visit.gps_lng, visit.gps_accuracy_m, visit.stock_status, visit.notes, visit.duration_minutes],
      );
    }
    console.log(`  Created ${visits.length} sample visits`);

    // 5. Create revisit schedules
    const schedules = [
      {
        store_id: stores[1]!.id,
        next_visit_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'high',
        reason: 'oos_detected',
        assigned_to: employees[2]!.id,
      },
      {
        store_id: stores[3]!.id,
        next_visit_date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'high',
        reason: 'oos_detected',
        assigned_to: employees[3]!.id,
      },
      {
        store_id: stores[0]!.id,
        next_visit_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'normal',
        reason: 'scheduled',
        assigned_to: employees[2]!.id,
      },
    ];

    for (const sched of schedules) {
      await client.query(
        `INSERT INTO revisit_schedule (company_id, store_id, next_visit_date, priority, reason, assigned_to)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [companyId, sched.store_id, sched.next_visit_date, sched.priority, sched.reason, sched.assigned_to],
      );
    }
    console.log(`  Created ${schedules.length} revisit schedules`);

    // 6. Create sample products (Sichuan condiments)
    const products = [
      { name: 'Doubanjiang 500g', name_zh: '豆瓣酱500克', sku: 'SKU-001', category: 'condiments' },
      { name: 'Sichuan Pepper Oil 250ml', name_zh: '花椒油250毫升', sku: 'SKU-002', category: 'condiments' },
      { name: 'Hotpot Base Spicy 200g', name_zh: '火锅底料麻辣200克', sku: 'SKU-003', category: 'condiments' },
      { name: 'Pickled Peppers 280g', name_zh: '泡椒280克', sku: 'SKU-004', category: 'condiments' },
      { name: 'Soy Sauce Premium 500ml', name_zh: '特级酱油500毫升', sku: 'SKU-005', category: 'condiments' },
      { name: 'Oyster Sauce 350ml', name_zh: '蚝油350毫升', sku: 'SKU-006', category: 'condiments' },
    ];

    for (const product of products) {
      await client.query(
        `INSERT INTO products (company_id, name, name_zh, sku, category)
         VALUES ($1, $2, $3, $4, $5)`,
        [companyId, product.name, product.name_zh, product.sku, product.category],
      );
    }
    console.log(`  Created ${products.length} products`);

    // 7. Phase 3: Create visit_photos with AI analysis (Sichuan condiments)
    const visitPhotos = [
      {
        visit_id: visits[0]!.id,
        photo_url: 'https://oss.example.com/photos/visit-301-shelf1.jpg',
        photo_type: 'shelf',
        ai_analysis: {
          our_products: [
            { name: 'Doubanjiang 500g', facing_count: 6, stock_level: 'high', shelf_position: 'eye' },
            { name: 'Soy Sauce Premium 500ml', facing_count: 4, stock_level: 'medium', shelf_position: 'middle' },
          ],
          total_category_facings: 30,
          share_of_shelf_percent: 33,
          competitors: [
            { name: '李锦记', facing_count: 8 },
            { name: '海天', facing_count: 5 },
          ],
          anomalies: [],
          confidence: 0.92,
        },
        ai_processed_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        visit_id: visits[1]!.id,
        photo_url: 'https://oss.example.com/photos/visit-302-shelf1.jpg',
        photo_type: 'shelf',
        ai_analysis: {
          our_products: [
            { name: 'Sichuan Pepper Oil 250ml', facing_count: 2, stock_level: 'low', shelf_position: 'bottom' },
            { name: 'Hotpot Base Spicy 200g', facing_count: 3, stock_level: 'medium', shelf_position: 'middle' },
          ],
          total_category_facings: 25,
          share_of_shelf_percent: 20,
          competitors: [
            { name: '厨邦', facing_count: 10 },
          ],
          anomalies: ['花椒油库存即将售罄'],
          confidence: 0.87,
        },
        ai_processed_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        visit_id: visits[2]!.id,
        photo_url: 'https://oss.example.com/photos/visit-303-shelf1.jpg',
        photo_type: 'shelf',
        ai_analysis: {
          our_products: [
            { name: 'Pickled Peppers 280g', facing_count: 0, stock_level: 'empty', shelf_position: 'eye' },
            { name: 'Oyster Sauce 350ml', facing_count: 1, stock_level: 'low', shelf_position: 'bottom' },
          ],
          total_category_facings: 18,
          share_of_shelf_percent: 6,
          competitors: [
            { name: '李锦记', facing_count: 7 },
            { name: '海天', facing_count: 4 },
          ],
          anomalies: ['泡椒完全缺货', '蚝油即将售罄'],
          confidence: 0.85,
        },
        ai_processed_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    for (const photo of visitPhotos) {
      await client.query(
        `INSERT INTO visit_photos (visit_id, photo_url, photo_type, ai_analysis, ai_processed_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [photo.visit_id, photo.photo_url, photo.photo_type, JSON.stringify(photo.ai_analysis), photo.ai_processed_at],
      );
    }
    console.log(`  Created ${visitPhotos.length} visit photos with AI analysis`);

    // 7b. Phase 3: Create inventory predictions
    const productRows = await client.query(
      `SELECT id, name FROM products WHERE company_id = $1 LIMIT 6`,
      [companyId],
    );
    const productIds = productRows.rows;

    if (productIds.length >= 2) {
      const inventoryPredictions = [
        {
          store_id: stores[1]!.id,
          product_id: productIds[0]!.id,
          predicted_stockout_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          confidence: 0.89,
          recommended_revisit_date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          model_version: 'xgb-v1.0',
        },
        {
          store_id: stores[3]!.id,
          product_id: productIds[3]?.id || productIds[1]!.id,
          predicted_stockout_date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          confidence: 0.94,
          recommended_revisit_date: new Date().toISOString().split('T')[0],
          model_version: 'xgb-v1.0',
        },
        {
          store_id: stores[0]!.id,
          product_id: productIds[1]!.id,
          predicted_stockout_date: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          confidence: 0.72,
          recommended_revisit_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          model_version: 'xgb-v1.0',
        },
      ];

      for (const pred of inventoryPredictions) {
        await client.query(
          `INSERT INTO inventory_predictions (store_id, product_id, predicted_stockout_date, confidence, recommended_revisit_date, model_version)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [pred.store_id, pred.product_id, pred.predicted_stockout_date, pred.confidence, pred.recommended_revisit_date, pred.model_version],
        );
      }
      console.log(`  Created ${inventoryPredictions.length} inventory predictions`);
    }

    // 8. Create additional visits for visit-trends chart (spread over 14 days)
    const additionalVisits = [];
    for (let daysAgo = 4; daysAgo <= 14; daysAgo++) {
      const visitDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const visitsPerDay = (daysAgo % 3) + 1;
      for (let v = 0; v < visitsPerDay; v++) {
        const storeIdx = (daysAgo + v) % stores.length;
        const empIdx = v % 2 === 0 ? 2 : 3;
        additionalVisits.push({
          store_id: stores[storeIdx]!.id,
          employee_id: employees[empIdx]!.id,
          checked_in_at: new Date(visitDate.getTime() + (9 + v) * 60 * 60 * 1000).toISOString(),
          gps_lat: stores[storeIdx]!.lat,
          gps_lng: stores[storeIdx]!.lng,
          gps_accuracy_m: 5 + Math.random() * 15,
          stock_status: ['in_stock', 'in_stock', 'low_stock', 'in_stock'][v % 4]!,
          notes: `日常巡检 day -${daysAgo}`,
          duration_minutes: 10 + Math.floor(Math.random() * 25),
        });
      }
    }

    for (const visit of additionalVisits) {
      await client.query(
        `INSERT INTO visits (company_id, store_id, employee_id, checked_in_at, gps_lat, gps_lng, gps_accuracy_m, stock_status, notes, duration_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [companyId, visit.store_id, visit.employee_id, visit.checked_in_at, visit.gps_lat, visit.gps_lng, visit.gps_accuracy_m, visit.stock_status, visit.notes, visit.duration_minutes],
      );
    }
    console.log(`  Created ${additionalVisits.length} additional visits for trends data`);

    // 9. Create sample notifications (Chengdu store names)
    const sampleNotifications = [
      {
        employee_id: employees[2]!.id,
        type: 'revisit_reminder',
        title: '复访提醒: 舞东风便利武侯店',
        message: '您有一个高优先级复访计划：明日巡检舞东风便利武侯店 (B级)。原因：缺货预警。',
        store_id: stores[1]!.id,
      },
      {
        employee_id: employees[2]!.id,
        type: 'oos_alert',
        title: '缺货预警: 张妈小卖部',
        message: '张妈小卖部检测到缺货，已安排复访。',
        store_id: stores[3]!.id,
      },
      {
        employee_id: employees[2]!.id,
        type: 'route_ready',
        title: '路线已优化',
        message: '今日优化路线已就绪。6家门店，预计3.5小时。',
      },
      {
        employee_id: employees[3]!.id,
        type: 'revisit_reminder',
        title: '复访提醒: 张妈小卖部',
        message: '您有一个高优先级复访计划：明日巡检张妈小卖部 (C级)。原因：缺货预警。',
        store_id: stores[3]!.id,
      },
      {
        employee_id: employees[2]!.id,
        type: 'system',
        title: '欢迎使用巡店',
        message: '您的账号已创建成功。开始生成您的第一条巡检路线吧！',
      },
    ];

    for (const notif of sampleNotifications) {
      await client.query(
        `INSERT INTO notifications (company_id, employee_id, type, title, message, store_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [companyId, notif.employee_id, notif.type, notif.title, notif.message, notif.store_id || null],
      );
    }
    console.log(`  Created ${sampleNotifications.length} sample notifications`);

    // 10. Add more revisit schedules for route optimization
    const additionalSchedules = [
      {
        store_id: stores[2]!.id,
        next_visit_date: new Date().toISOString().split('T')[0],
        priority: 'normal',
        reason: 'scheduled',
        assigned_to: employees[2]!.id,
      },
      {
        store_id: stores[4]!.id,
        next_visit_date: new Date().toISOString().split('T')[0],
        priority: 'normal',
        reason: 'scheduled',
        assigned_to: employees[2]!.id,
      },
      {
        store_id: stores[5]!.id,
        next_visit_date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'low',
        reason: 'scheduled',
        assigned_to: employees[3]!.id,
      },
    ];

    for (const sched of additionalSchedules) {
      await client.query(
        `INSERT INTO revisit_schedule (company_id, store_id, next_visit_date, priority, reason, assigned_to)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [companyId, sched.store_id, sched.next_visit_date, sched.priority, sched.reason, sched.assigned_to],
      );
    }
    console.log(`  Created ${additionalSchedules.length} additional revisit schedules`);

    await client.query('COMMIT');
    console.log('\nSeed completed successfully!');
    console.log('\nLogin credentials:');
    console.log('  Company code: DEMO');
    console.log('  Phone: 13800000001 (admin) / 13800000002 (manager) / 13800000003 (rep) / 13800000004 (rep)');
    console.log('  Password: demo123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
