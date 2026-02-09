import type { StockStatus } from '../types/store';

export const STOCK_STATUS_COLORS: Record<StockStatus, string> = {
  in_stock: '#10B981',
  low_stock: '#F59E0B',
  out_of_stock: '#EF4444',
  added_product: '#8B5CF6',
};

export const VISIT_STATUS_COLORS: Record<string, string> = {
  visited: '#10B981',
  pending: '#3B82F6',
  overdue: '#EF4444',
  discovered: '#8B5CF6',
};
