import pool from '../db/pool.js';
import type { ShelfDiffResult, ShelfDiffSeverity } from '@xundian/shared';

/**
 * Generate a mock shelf diff result by comparing two AI analyses.
 * In production, this would call the AI server to visually compare photos.
 */
export async function generateShelfDiff(
  currentPhotoId: string,
  previousPhotoId: string,
): Promise<{ diff_result: ShelfDiffResult; severity: ShelfDiffSeverity; confidence: number }> {
  // Fetch both analyses
  const [currentResult, previousResult] = await Promise.all([
    pool.query('SELECT ai_analysis FROM visit_photos WHERE id = $1', [currentPhotoId]),
    pool.query('SELECT ai_analysis FROM visit_photos WHERE id = $1', [previousPhotoId]),
  ]);

  const currentAnalysis = currentResult.rows[0]?.ai_analysis;
  const previousAnalysis = previousResult.rows[0]?.ai_analysis;

  if (!currentAnalysis || !previousAnalysis) {
    // Generate mock diff when analyses are missing
    return generateMockDiff();
  }

  // Compare SOS
  const prevSos = previousAnalysis.share_of_shelf_percent || 0;
  const currSos = currentAnalysis.share_of_shelf_percent || 0;
  const sosDelta = currSos - prevSos;

  // Compare facings
  const prevProducts = new Map<string, number>();
  for (const p of previousAnalysis.our_products || []) {
    prevProducts.set(p.name, p.facing_count);
  }

  const facingChanges = (currentAnalysis.our_products || []).map((p: { name: string; facing_count: number }) => ({
    product: p.name,
    previous: prevProducts.get(p.name) || 0,
    current: p.facing_count,
    change: `${p.facing_count - (prevProducts.get(p.name) || 0) >= 0 ? '+' : ''}${p.facing_count - (prevProducts.get(p.name) || 0)}`,
  }));

  // Competitor changes
  const prevCompetitors = new Map<string, number>();
  for (const c of previousAnalysis.competitors || []) {
    prevCompetitors.set(c.name, c.facing_count);
  }
  const competitorChanges = (currentAnalysis.competitors || []).map((c: { name: string; facing_count: number }) => {
    const prev = prevCompetitors.get(c.name) || 0;
    const delta = c.facing_count - prev;
    return { brand: c.name, change: `${delta >= 0 ? '+' : ''}${delta} facing${Math.abs(delta) !== 1 ? 's' : ''}` };
  });

  // Detect new/missing
  const currProductNames = new Set<string>((currentAnalysis.our_products || []).map((p: { name: string }) => p.name));
  const prevProductNames = new Set<string>((previousAnalysis.our_products || []).map((p: { name: string }) => p.name));
  const newItems: string[] = [...currProductNames].filter((n) => !prevProductNames.has(n));
  const missingItems: string[] = [...prevProductNames].filter((n) => !currProductNames.has(n));

  const diff_result: ShelfDiffResult = {
    sos_change: { previous: prevSos, current: currSos, delta: `${sosDelta >= 0 ? '+' : ''}${sosDelta}%` },
    facing_changes: facingChanges,
    competitor_changes: competitorChanges,
    new_items_detected: newItems,
    missing_items: missingItems,
    compliance: {
      price_tag_present: Math.random() > 0.2,
      product_facing_forward: Math.random() > 0.15,
      shelf_clean: Math.random() > 0.25,
    },
  };

  // Derive severity
  let severity: ShelfDiffSeverity = 'neutral';
  if (sosDelta > 3) severity = 'positive';
  else if (sosDelta < -5 || missingItems.length > 0) severity = 'critical';
  else if (sosDelta < -2) severity = 'warning';

  const confidence = Math.min(
    (currentAnalysis.confidence || 0.8),
    (previousAnalysis.confidence || 0.8),
  );

  return { diff_result, severity, confidence };
}

function generateMockDiff(): { diff_result: ShelfDiffResult; severity: ShelfDiffSeverity; confidence: number } {
  const sosDelta = Math.floor(Math.random() * 16) - 8;
  const prevSos = 25 + Math.floor(Math.random() * 10);

  const diff_result: ShelfDiffResult = {
    sos_change: { previous: prevSos, current: prevSos + sosDelta, delta: `${sosDelta >= 0 ? '+' : ''}${sosDelta}%` },
    facing_changes: [
      { product: '豆瓣酱500克', previous: 4, current: 4 + Math.floor(Math.random() * 4) - 1, change: '+1' },
      { product: '花椒油250毫升', previous: 3, current: 3 + Math.floor(Math.random() * 3) - 1, change: '0' },
    ],
    competitor_changes: [
      { brand: '李锦记', change: `${Math.random() > 0.5 ? '+' : '-'}1 facing` },
    ],
    new_items_detected: [],
    missing_items: [],
    compliance: {
      price_tag_present: true,
      product_facing_forward: Math.random() > 0.3,
      shelf_clean: Math.random() > 0.2,
    },
  };

  const severity: ShelfDiffSeverity = sosDelta > 3 ? 'positive' : sosDelta < -3 ? 'warning' : 'neutral';
  return { diff_result, severity, confidence: 0.85 };
}
