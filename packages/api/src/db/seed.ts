import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://xundian:xundian_dev@localhost:5432/xundian',
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

    // 3. Create stores (Shanghai area)
    const stores = [
      {
        id: '00000000-0000-0000-0000-000000000201',
        name: 'Family Mart Nanjing Rd',
        name_zh: '全家南京路店',
        lat: 31.2304,
        lng: 121.4737,
        address: '123 Nanjing East Road, Huangpu District',
        tier: 'A',
        store_type: 'convenience',
      },
      {
        id: '00000000-0000-0000-0000-000000000202',
        name: 'Lawson Xujiahui',
        name_zh: '罗森徐家汇店',
        lat: 31.1956,
        lng: 121.4375,
        address: '456 Zhaojiabang Road, Xuhui District',
        tier: 'B',
        store_type: 'convenience',
      },
      {
        id: '00000000-0000-0000-0000-000000000203',
        name: 'RT-Mart Pudong',
        name_zh: '大润发浦东店',
        lat: 31.2353,
        lng: 121.5440,
        address: '789 Century Avenue, Pudong New District',
        tier: 'A',
        store_type: 'supermarket',
      },
      {
        id: '00000000-0000-0000-0000-000000000204',
        name: 'Uncle Wang\'s Shop',
        name_zh: '王叔小卖部',
        lat: 31.2100,
        lng: 121.4580,
        address: '12 Huaihai Middle Road Lane 88',
        tier: 'C',
        store_type: 'small_shop',
      },
      {
        id: '00000000-0000-0000-0000-000000000205',
        name: 'Carrefour Jinqiao',
        name_zh: '家乐福金桥店',
        lat: 31.2450,
        lng: 121.5680,
        address: '1000 Jinqiao Road, Pudong New District',
        tier: 'A',
        store_type: 'supermarket',
      },
      {
        id: '00000000-0000-0000-0000-000000000206',
        name: 'Mini Stop Hongkou',
        name_zh: '美你停虹口店',
        lat: 31.2600,
        lng: 121.4900,
        address: '55 Sichuan North Road, Hongkou District',
        tier: 'B',
        store_type: 'convenience',
      },
    ];

    for (const store of stores) {
      await client.query(
        `INSERT INTO stores (id, company_id, name, name_zh, location, address, tier, store_type, discovered_by)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($6, $5), 4326), $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [store.id, companyId, store.name, store.name_zh, store.lat, store.lng, store.address, store.tier, store.store_type, employees[2]!.id],
      );
      console.log(`  Store created: ${store.name}`);
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
        notes: 'Shelves well stocked. New promo display set up.',
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
        notes: 'Running low on SKU-001. Restock needed this week.',
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
        notes: 'Completely out. Owner says supplier delayed.',
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

    // 6. Create sample products
    const products = [
      { name: 'Green Tea 500ml', name_zh: '绿茶500毫升', sku: 'SKU-001', category: 'beverages' },
      { name: 'Cola 330ml', name_zh: '可乐330毫升', sku: 'SKU-002', category: 'beverages' },
      { name: 'Instant Noodles Beef', name_zh: '红烧牛肉面', sku: 'SKU-003', category: 'food' },
      { name: 'Potato Chips Original', name_zh: '原味薯片', sku: 'SKU-004', category: 'snacks' },
    ];

    for (const product of products) {
      await client.query(
        `INSERT INTO products (company_id, name, name_zh, sku, category)
         VALUES ($1, $2, $3, $4, $5)`,
        [companyId, product.name, product.name_zh, product.sku, product.category],
      );
    }
    console.log(`  Created ${products.length} products`);

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
