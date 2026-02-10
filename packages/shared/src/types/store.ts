import type { AIShelfAnalysis } from './ai';

export type StoreTier = 'A' | 'B' | 'C';
export type StoreType = 'supermarket' | 'convenience' | 'small_shop' | 'other';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'added_product';
export type PhotoType = 'shelf' | 'storefront' | 'other';
export type RevisitPriority = 'high' | 'normal' | 'low';
export type RevisitReason = 'scheduled' | 'oos_detected' | 'low_stock' | 'new_product';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Store {
  id: string;
  company_id: string;
  name: string;
  name_zh?: string;
  latitude: number;
  longitude: number;
  address?: string;
  tier: StoreTier;
  store_type: StoreType;
  contact_name?: string;
  contact_phone?: string;
  gaode_poi_id?: string;
  discovered_by?: string;
  discovered_at?: string;
  storefront_photo_url?: string;
  approval_status?: ApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Visit {
  id: string;
  company_id: string;
  store_id: string;
  employee_id: string;
  checked_in_at: string;
  gps_lat: number;
  gps_lng: number;
  gps_accuracy_m: number;
  stock_status: StockStatus;
  notes?: string;
  duration_minutes?: number;
  is_audit: boolean;
  created_at: string;
}

export interface VisitPhoto {
  id: string;
  visit_id: string;
  photo_url: string;
  photo_type: PhotoType;
  ai_analysis?: AIShelfAnalysis;
  ai_processed_at?: string;
  created_at: string;
}

export interface RevisitSchedule {
  id: string;
  store_id: string;
  company_id: string;
  next_visit_date: string;
  priority: RevisitPriority;
  reason: RevisitReason;
  assigned_to?: string;
  completed: boolean;
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  name_zh?: string;
  sku?: string;
  category?: string;
  reference_image_url?: string;
  created_at: string;
}

export interface InventoryPrediction {
  id: string;
  store_id: string;
  product_id: string;
  predicted_stockout_date?: string;
  confidence: number;
  recommended_revisit_date?: string;
  model_version: string;
  created_at: string;
}

export type ShelfDiffSeverity = 'positive' | 'neutral' | 'warning' | 'critical';

export interface ShelfDiffFacingChange {
  product: string;
  previous: number;
  current: number;
  change: string;
}

export interface ShelfDiffResult {
  sos_change: { previous: number; current: number; delta: string };
  facing_changes: ShelfDiffFacingChange[];
  competitor_changes: { brand: string; change: string }[];
  new_items_detected: string[];
  missing_items: string[];
  compliance: {
    price_tag_present: boolean;
    product_facing_forward: boolean;
    shelf_clean: boolean;
  };
}

export interface ShelfComparison {
  id: string;
  store_id: string;
  current_photo_id: string;
  previous_photo_id: string;
  diff_result: ShelfDiffResult;
  severity: ShelfDiffSeverity;
  confidence: number;
  reviewed: boolean;
  reviewed_by?: string;
  created_at: string;
}

// Re-export AI types used in store context
export type { AIShelfAnalysis } from './ai';
