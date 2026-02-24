import pool from '../db/pool.js';
import { createNotification } from '../services/notifications.js';

interface StockTransition {
  from: string;
  to: string;
}

const TRANSITION_SCORES: Record<string, number> = {
  'in_stock->low_stock': 0.3,
  'low_stock->out_of_stock': 0.5,
  'in_stock->out_of_stock': 0.8,
};

function computeRiskScore(transitions: StockTransition[]): number {
  let score = 0;
  for (const t of transitions) {
    const key = `${t.from}->${t.to}`;
    score += TRANSITION_SCORES[key] ?? 0;
  }
  return Math.min(score, 1.0);
}

function computeConfidence(dataPoints: number): number {
  // More data points = higher confidence, clamped to 0.3-0.95
  if (dataPoints <= 1) return 0.3;
  if (dataPoints >= 8) return 0.95;
  // Linear interpolation from 0.3 (1 point) to 0.95 (8+ points)
  return 0.3 + ((dataPoints - 1) / 7) * 0.65;
}

function predictStockoutDays(riskScore: number): number {
  // Higher risk = sooner stockout. Risk 1.0 => 2 days, Risk 0 => 30 days
  if (riskScore <= 0) return 30;
  return Math.max(2, Math.round(30 * (1 - riskScore)));
}

/**
 * Generate heuristic-based inventory predictions for all store+product combos in a company.
 * Deletes old predictions and inserts new ones.
 * Creates oos_alert notifications for high-confidence near-term predictions.
 */
export async function generatePredictions(companyId: string): Promise<{
  predictions_created: number;
  alerts_created: number;
}> {
  // Get all stores for the company
  const storesResult = await pool.query(
    `SELECT id FROM stores WHERE company_id = $1`,
    [companyId],
  );

  // Get all products for the company
  const productsResult = await pool.query(
    `SELECT id, name, name_zh FROM products WHERE company_id = $1`,
    [companyId],
  );

  if (storesResult.rows.length === 0 || productsResult.rows.length === 0) {
    return { predictions_created: 0, alerts_created: 0 };
  }

  // Batch query: last 5 visits with stock_status per store, using window function
  const visitsResult = await pool.query(
    `SELECT store_id, stock_status, checked_in_at
     FROM (
       SELECT store_id, stock_status, checked_in_at,
              ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY checked_in_at DESC) as rn
       FROM visits
       WHERE company_id = $1 AND stock_status IS NOT NULL
     ) ranked
     WHERE rn <= 5
     ORDER BY store_id, checked_in_at ASC`,
    [companyId],
  );

  // Batch query: last 5 AI analyses per store, using window function
  const aiResult = await pool.query(
    `SELECT store_id, ai_analysis, created_at
     FROM (
       SELECT v.store_id, vp.ai_analysis, vp.created_at,
              ROW_NUMBER() OVER (PARTITION BY v.store_id ORDER BY vp.created_at DESC) as rn
       FROM visit_photos vp
       JOIN visits v ON v.id = vp.visit_id
       WHERE v.company_id = $1 AND vp.ai_analysis IS NOT NULL
     ) ranked
     WHERE rn <= 5
     ORDER BY store_id, created_at DESC`,
    [companyId],
  );

  // Build maps: store_id -> visit rows, store_id -> AI rows
  const visitsByStore = new Map<string, Array<{ stock_status: string; checked_in_at: string }>>();
  for (const row of visitsResult.rows) {
    const storeId = row.store_id as string;
    if (!visitsByStore.has(storeId)) visitsByStore.set(storeId, []);
    visitsByStore.get(storeId)!.push({
      stock_status: row.stock_status as string,
      checked_in_at: row.checked_in_at as string,
    });
  }

  const aiByStore = new Map<string, Array<Record<string, unknown>>>();
  for (const row of aiResult.rows) {
    const storeId = row.store_id as string;
    if (!aiByStore.has(storeId)) aiByStore.set(storeId, []);
    aiByStore.get(storeId)!.push(row.ai_analysis as Record<string, unknown>);
  }

  const predictions: Array<{
    store_id: string;
    product_id: string;
    predicted_stockout_date: string;
    confidence: number;
    recommended_revisit_date: string;
  }> = [];

  for (const store of storesResult.rows) {
    const storeId = store.id as string;
    const storeVisits = visitsByStore.get(storeId) || [];
    const storeAi = aiByStore.get(storeId) || [];

    const visitStatuses = storeVisits.map((r) => r.stock_status);
    let dataPoints = visitStatuses.length + storeAi.length;

    // Compute transitions from visit stock_status history (already ordered chronologically)
    const transitions: StockTransition[] = [];
    for (let i = 0; i < visitStatuses.length - 1; i++) {
      transitions.push({ from: visitStatuses[i]!, to: visitStatuses[i + 1]! });
    }

    // Extract product-level stock levels from AI analysis
    const aiStockLevels: string[] = [];
    for (const analysis of storeAi) {
      const ourProducts = analysis.our_products as Array<{ stock_level?: string }> | undefined;
      if (ourProducts && Array.isArray(ourProducts)) {
        for (const p of ourProducts) {
          if (p.stock_level) {
            const mapped =
              p.stock_level === 'high' ? 'in_stock' :
              p.stock_level === 'medium' ? 'in_stock' :
              p.stock_level === 'low' ? 'low_stock' :
              p.stock_level === 'empty' ? 'out_of_stock' : null;
            if (mapped) aiStockLevels.push(mapped);
          }
        }
      }
    }

    // Add AI-derived transitions
    for (let i = 0; i < aiStockLevels.length - 1; i++) {
      transitions.push({ from: aiStockLevels[i]!, to: aiStockLevels[i + 1]! });
    }

    if (dataPoints === 0) continue;

    const riskScore = computeRiskScore(transitions);
    if (riskScore <= 0) continue;

    const confidence = computeConfidence(dataPoints);
    const stockoutDays = predictStockoutDays(riskScore);
    const today = new Date();
    const stockoutDate = new Date(today);
    stockoutDate.setDate(today.getDate() + stockoutDays);
    const revisitDate = new Date(stockoutDate);
    revisitDate.setDate(stockoutDate.getDate() - Math.min(2, stockoutDays - 1));

    const stockoutStr = stockoutDate.toISOString().split('T')[0]!;
    const revisitStr = revisitDate.toISOString().split('T')[0]!;

    for (const product of productsResult.rows) {
      predictions.push({
        store_id: storeId,
        product_id: product.id as string,
        predicted_stockout_date: stockoutStr,
        confidence,
        recommended_revisit_date: revisitStr,
      });
    }
  }

  // Delete old predictions for this company
  await pool.query(
    `DELETE FROM inventory_predictions
     WHERE store_id IN (SELECT id FROM stores WHERE company_id = $1)`,
    [companyId],
  );

  // Bulk insert all predictions in a single query
  let predictionsCreated = 0;
  if (predictions.length > 0) {
    const valuesClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    for (const pred of predictions) {
      valuesClauses.push(
        `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, 'heuristic-v1')`,
      );
      params.push(pred.store_id, pred.product_id, pred.predicted_stockout_date, pred.confidence, pred.recommended_revisit_date);
      paramIdx += 5;
    }

    await pool.query(
      `INSERT INTO inventory_predictions
         (store_id, product_id, predicted_stockout_date, confidence, recommended_revisit_date, model_version)
       VALUES ${valuesClauses.join(', ')}`,
      params,
    );
    predictionsCreated = predictions.length;
  }

  // Create oos_alert notifications for high-confidence near-term predictions
  let alertsCreated = 0;
  const highRiskPredictions = predictions.filter(
    (p) => p.confidence > 0.7 && daysFromNow(p.predicted_stockout_date) <= 7,
  );

  if (highRiskPredictions.length > 0) {
    // Batch fetch assignees for all high-risk stores
    const highRiskStoreIds = [...new Set(highRiskPredictions.map((p) => p.store_id))];
    const assigneeResult = await pool.query(
      `SELECT s.id as store_id,
              COALESCE(
                (SELECT rs.assigned_to FROM revisit_schedule rs
                 WHERE rs.store_id = s.id AND rs.company_id = $1 AND NOT rs.completed AND rs.assigned_to IS NOT NULL
                 ORDER BY rs.next_visit_date ASC LIMIT 1),
                s.discovered_by
              ) as employee_id
       FROM stores s
       WHERE s.id = ANY($2) AND s.company_id = $1`,
      [companyId, highRiskStoreIds],
    );

    const assigneeByStore = new Map<string, string>();
    for (const row of assigneeResult.rows) {
      if (row.employee_id) {
        assigneeByStore.set(row.store_id as string, row.employee_id as string);
      }
    }

    // Batch fetch store + product names
    const highRiskProductIds = [...new Set(highRiskPredictions.map((p) => p.product_id))];
    const [storeInfoResult, productInfoResult] = await Promise.all([
      pool.query(
        `SELECT id, name, name_zh, tier FROM stores WHERE id = ANY($1) AND company_id = $2`,
        [highRiskStoreIds, companyId],
      ),
      pool.query(
        `SELECT id, name, name_zh FROM products WHERE id = ANY($1) AND company_id = $2`,
        [highRiskProductIds, companyId],
      ),
    ]);

    const storeInfo = new Map<string, { name: string; name_zh: string | null; tier: string }>();
    for (const row of storeInfoResult.rows) {
      storeInfo.set(row.id as string, {
        name: row.name as string,
        name_zh: row.name_zh as string | null,
        tier: row.tier as string,
      });
    }

    const productInfo = new Map<string, { name: string; name_zh: string | null }>();
    for (const row of productInfoResult.rows) {
      productInfo.set(row.id as string, {
        name: row.name as string,
        name_zh: row.name_zh as string | null,
      });
    }

    // Create notifications (these each do an INSERT, but only for high-risk subset)
    const notificationPromises: Promise<void>[] = [];
    for (const pred of highRiskPredictions) {
      const employeeId = assigneeByStore.get(pred.store_id);
      if (!employeeId) continue;

      const store = storeInfo.get(pred.store_id);
      const product = productInfo.get(pred.product_id);
      if (!store || !product) continue;

      const storeName = store.name_zh || store.name;
      const productName = product.name_zh || product.name;

      notificationPromises.push(
        createNotification({
          company_id: companyId,
          employee_id: employeeId,
          type: 'oos_alert',
          title: `Stockout Risk: ${storeName}`,
          message: `${productName} at ${storeName} (Tier ${store.tier}) is predicted to stock out by ${pred.predicted_stockout_date}. Confidence: ${Math.round(pred.confidence * 100)}%. Please plan a revisit.`,
          store_id: pred.store_id,
        }).then(() => { alertsCreated++; }),
      );
    }

    await Promise.all(notificationPromises);
  }

  return { predictions_created: predictionsCreated, alerts_created: alertsCreated };
}

function daysFromNow(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get predictions for a specific store, joined with product names.
 */
export async function getPredictionsForStore(
  storeId: string,
  companyId: string,
): Promise<Record<string, unknown>[]> {
  const result = await pool.query(
    `SELECT ip.id, ip.store_id, ip.product_id,
            ip.predicted_stockout_date, ip.confidence,
            ip.recommended_revisit_date, ip.model_version, ip.created_at,
            p.name as product_name, p.name_zh as product_name_zh, p.sku, p.category
     FROM inventory_predictions ip
     JOIN products p ON p.id = ip.product_id
     WHERE ip.store_id = $1
       AND p.company_id = $2
     ORDER BY ip.predicted_stockout_date ASC`,
    [storeId, companyId],
  );

  return result.rows as Record<string, unknown>[];
}
