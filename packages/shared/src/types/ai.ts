export type ShelfPosition = 'eye' | 'middle' | 'bottom' | 'top';
export type StockLevel = 'high' | 'medium' | 'low' | 'empty';

export interface AIProductDetection {
  name: string;
  facing_count: number;
  stock_level: StockLevel;
  shelf_position: ShelfPosition;
}

export interface AICompetitorDetection {
  name: string;
  facing_count: number;
}

export interface AIShelfAnalysis {
  our_products: AIProductDetection[];
  total_category_facings: number;
  share_of_shelf_percent: number;
  competitors: AICompetitorDetection[];
  anomalies: string[];
  confidence: number;
}
