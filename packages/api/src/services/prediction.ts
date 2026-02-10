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

  const predictions: Array<{
    store_id: string;
    product_id: string;
    predicted_stockout_date: string;
    confidence: number;
    recommended_revisit_date: string;
  }> = [];

  for (const store of storesResult.rows) {
    const storeId = store.id as string;

    // Get last 5 visits with stock_status for this store
    const visitsResult = await pool.query(
      `SELECT stock_status, checked_in_at
       FROM visits
       WHERE store_id = $1 AND company_id = $2 AND stock_status IS NOT NULL
       ORDER BY checked_in_at DESC
       LIMIT 5`,
      [storeId, companyId],
    );

    // Get AI analysis data from visit photos
    const aiResult = await pool.query(
      `SELECT vp.ai_analysis, vp.created_at
       FROM visit_photos vp
       JOIN visits v ON v.id = vp.visit_id
       WHERE v.store_id = $1 AND v.company_id = $2
         AND vp.ai_analysis IS NOT NULL
       ORDER BY vp.created_at DESC
       LIMIT 5`,
      [storeId, companyId],
    );

    const visitStatuses = visitsResult.rows.map((r) => r.stock_status as string);
    let dataPoints = visitStatuses.length + aiResult.rows.length;

    // Compute transitions from visit stock_status history (oldest to newest)
    const chronological = [...visitStatuses].reverse();
    const transitions: StockTransition[] = [];
    for (let i = 0; i < chronological.length - 1; i++) {
      transitions.push({ from: chronological[i]!, to: chronological[i + 1]! });
    }

    // Also check AI analysis for product-level stock_level trends
    const aiAnalyses = aiResult.rows
      .map((r) => r.ai_analysis as Record<string, unknown> | null)
      .filter(Boolean);

    // Extract product-level stock levels from AI analysis
    const aiStockLevels: string[] = [];
    for (const analysis of aiAnalyses) {
      const ourProducts = analysis!.our_products as Array<{ stock_level?: string }> | undefined;
      if (ourProducts && Array.isArray(ourProducts)) {
        for (const p of ourProducts) {
          if (p.stock_level) {
            // Map AI stock levels to visit-like statuses
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
    if (riskScore <= 0) continue; // No declining trend detected

    const confidence = computeConfidence(dataPoints);
    const stockoutDays = predictStockoutDays(riskScore);
    const today = new Date();
    const stockoutDate = new Date(today);
    stockoutDate.setDate(today.getDate() + stockoutDays);
    // Recommended revisit: 1-2 days before predicted stockout
    const revisitDate = new Date(stockoutDate);
    revisitDate.setDate(stockoutDate.getDate() - Math.min(2, stockoutDays - 1));

    const stockoutStr = stockoutDate.toISOString().split('T')[0]!;
    const revisitStr = revisitDate.toISOString().split('T')[0]!;

    // Create a prediction for each product
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

  // Insert new predictions
  let predictionsCreated = 0;
  for (const pred of predictions) {
    await pool.query(
      `INSERT INTO inventory_predictions
         (store_id, product_id, predicted_stockout_date, confidence, recommended_revisit_date, model_version)
       VALUES ($1, $2, $3, $4, $5, 'heuristic-v1')`,
      [pred.store_id, pred.product_id, pred.predicted_stockout_date, pred.confidence, pred.recommended_revisit_date],
    );
    predictionsCreated++;
  }

  // Create oos_alert notifications for high-confidence near-term predictions
  let alertsCreated = 0;
  const highRiskPredictions = predictions.filter(
    (p) => p.confidence > 0.7 && daysFromNow(p.predicted_stockout_date) <= 7,
  );

  for (const pred of highRiskPredictions) {
    // Find assigned rep: check revisit_schedule first, fall back to stores.discovered_by
    const assigneeResult = await pool.query(
      `SELECT COALESCE(
         (SELECT assigned_to FROM revisit_schedule
          WHERE store_id = $1 AND company_id = $2 AND NOT completed AND assigned_to IS NOT NULL
          ORDER BY next_visit_date ASC LIMIT 1),
         (SELECT discovered_by FROM stores WHERE id = $1 AND company_id = $2)
       ) as employee_id`,
      [pred.store_id, companyId],
    );

    const employeeId = assigneeResult.rows[0]?.employee_id as string | null;
    if (!employeeId) continue;

    // Get store and product names for the notification message
    const infoResult = await pool.query(
      `SELECT s.name as store_name, s.name_zh as store_name_zh, s.tier,
              p.name as product_name, p.name_zh as product_name_zh
       FROM stores s, products p
       WHERE s.id = $1 AND p.id = $2`,
      [pred.store_id, pred.product_id],
    );

    if (infoResult.rows.length === 0) continue;

    const info = infoResult.rows[0]!;
    const storeName = (info.store_name_zh as string) || (info.store_name as string);
    const productName = (info.product_name_zh as string) || (info.product_name as string);

    await createNotification({
      company_id: companyId,
      employee_id: employeeId,
      type: 'oos_alert',
      title: `Stockout Risk: ${storeName}`,
      message: `${productName} at ${storeName} (Tier ${info.tier}) is predicted to stock out by ${pred.predicted_stockout_date}. Confidence: ${Math.round(pred.confidence * 100)}%. Please plan a revisit.`,
      store_id: pred.store_id,
    });

    alertsCreated++;
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
