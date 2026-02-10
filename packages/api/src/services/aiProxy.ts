import pool from '../db/pool.js';
import { createNotification } from '../services/notifications.js';
import { scheduleNextRevisit } from '../services/scheduler.js';
import type { AIShelfAnalysis, StockLevel, ShelfPosition, StockStatus } from '@xundian/shared';

const COMPETITOR_NAMES = ['Mengniu', 'Wahaha', 'Nongfu Spring', 'Yili', 'Master Kong', 'Tingyi'];

const STOCK_LEVELS: StockLevel[] = ['high', 'medium', 'low', 'empty'];
const SHELF_POSITIONS: ShelfPosition[] = ['eye', 'middle', 'bottom', 'top'];

const ANOMALIES = [
  'Product placed behind competitor items',
  'Price tag missing',
  'Shelf label does not match product',
  'Damaged packaging visible',
  'Products not facing forward',
  'Expired product detected',
  'Promotional display not set up',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)]!;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  const val = Math.random() * (max - min) + min;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Generate a mock AI shelf analysis using real product names from the company's catalog.
 */
export async function generateMockAnalysis(companyId: string): Promise<AIShelfAnalysis> {
  const productsResult = await pool.query(
    'SELECT name FROM products WHERE company_id = $1 LIMIT 10',
    [companyId],
  );

  const productNames = productsResult.rows.length > 0
    ? productsResult.rows.map((r: Record<string, unknown>) => r.name as string)
    : ['Green Tea 500ml', 'Jasmine Tea 350ml', 'Oolong Tea 600ml'];

  const ourProducts = productNames.map((name) => ({
    name,
    facing_count: randomInt(1, 8),
    stock_level: randomElement(STOCK_LEVELS),
    shelf_position: randomElement(SHELF_POSITIONS),
  }));

  const totalOurFacings = ourProducts.reduce((sum, p) => sum + p.facing_count, 0);

  const competitorCount = randomInt(1, 3);
  const competitors = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < competitorCount; i++) {
    let name: string;
    do {
      name = randomElement(COMPETITOR_NAMES);
    } while (usedNames.has(name));
    usedNames.add(name);
    competitors.push({ name, facing_count: randomInt(2, 10) });
  }

  const totalCompetitorFacings = competitors.reduce((sum, c) => sum + c.facing_count, 0);
  const totalCategoryFacings = totalOurFacings + totalCompetitorFacings;
  const shareOfShelf = totalCategoryFacings > 0
    ? Math.round((totalOurFacings / totalCategoryFacings) * 100)
    : 0;

  const anomalyCount = randomInt(0, 2);
  const anomalies: string[] = [];
  const usedAnomalies = new Set<string>();
  for (let i = 0; i < anomalyCount; i++) {
    let anomaly: string;
    do {
      anomaly = randomElement(ANOMALIES);
    } while (usedAnomalies.has(anomaly));
    usedAnomalies.add(anomaly);
    anomalies.push(anomaly);
  }

  return {
    our_products: ourProducts,
    total_category_facings: totalCategoryFacings,
    share_of_shelf_percent: shareOfShelf,
    competitors,
    anomalies,
    confidence: randomFloat(0.75, 0.95),
  };
}

/**
 * Process a photo with AI — either real AI server or mock.
 * After storing analysis, checks for OOS/low stock and creates alerts + schedules revisits.
 */
export async function processPhotoWithAI(
  photoId: string,
  companyId: string,
  forceMock = false,
): Promise<AIShelfAnalysis> {
  let analysis: AIShelfAnalysis;

  if (!forceMock && process.env.AI_SERVER_URL) {
    // Real AI server
    const photoResult = await pool.query(
      'SELECT photo_url FROM visit_photos WHERE id = $1',
      [photoId],
    );
    if (photoResult.rows.length === 0) {
      throw new Error('Photo not found');
    }
    const photoUrl = photoResult.rows[0]!.photo_url as string;

    const response = await fetch(process.env.AI_SERVER_URL + '/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.AI_SERVER_API_KEY ? { 'X-API-Key': process.env.AI_SERVER_API_KEY } : {}),
      },
      body: JSON.stringify({ photo_url: photoUrl, company_id: companyId }),
    });

    if (!response.ok) {
      throw new Error(`AI server error: ${response.status} ${response.statusText}`);
    }

    analysis = (await response.json()) as AIShelfAnalysis;
  } else {
    // Mock analysis
    analysis = await generateMockAnalysis(companyId);
  }

  // Store analysis in visit_photos
  await pool.query(
    `UPDATE visit_photos SET ai_analysis = $1, ai_processed_at = NOW() WHERE id = $2`,
    [JSON.stringify(analysis), photoId],
  );

  // Check for OOS / low stock and create alerts
  await handleAnalysisAlerts(photoId, companyId, analysis);

  return analysis;
}

/**
 * Inspect analysis for OOS/low stock products and create notifications + schedule revisits.
 */
async function handleAnalysisAlerts(
  photoId: string,
  companyId: string,
  analysis: AIShelfAnalysis,
): Promise<void> {
  const hasOos = analysis.our_products.some((p) => p.stock_level === 'empty');
  const hasLowStock = analysis.our_products.some((p) => p.stock_level === 'low');

  if (!hasOos && !hasLowStock) return;

  // Get visit info for this photo (employee_id, store_id, store name)
  const visitInfo = await pool.query(
    `SELECT v.employee_id, v.store_id, s.name as store_name
     FROM visit_photos vp
     JOIN visits v ON v.id = vp.visit_id
     JOIN stores s ON s.id = v.store_id
     WHERE vp.id = $1`,
    [photoId],
  );

  if (visitInfo.rows.length === 0) return;

  const { employee_id, store_id, store_name } = visitInfo.rows[0] as {
    employee_id: string;
    store_id: string;
    store_name: string;
  };

  const affectedProducts = analysis.our_products
    .filter((p) => p.stock_level === 'empty' || p.stock_level === 'low')
    .map((p) => `${p.name} (${p.stock_level})`)
    .join(', ');

  const alertType = hasOos ? 'out_of_stock' : 'low_stock';
  const title = hasOos
    ? `Out of Stock Alert: ${store_name}`
    : `Low Stock Alert: ${store_name}`;

  await createNotification({
    company_id: companyId,
    employee_id,
    type: 'oos_alert',
    title,
    message: `AI detected stock issues at ${store_name}: ${affectedProducts}`,
    store_id,
  });

  // Schedule revisit
  const stockStatus: StockStatus = hasOos ? 'out_of_stock' : 'low_stock';
  await scheduleNextRevisit(companyId, store_id, employee_id, stockStatus);
}

/**
 * Fire-and-forget wrapper: calls processPhotoWithAI, catches errors to log.
 */
export function submitPhotoForProcessing(photoId: string, companyId: string): void {
  processPhotoWithAI(photoId, companyId).catch((err) => {
    console.error(`[aiProxy] Failed to process photo ${photoId}:`, err);
  });
}
