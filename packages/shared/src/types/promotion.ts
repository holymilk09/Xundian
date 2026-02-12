export interface Promotion {
  id: string;
  company_id: string;
  product_id?: string | null;
  title: string;
  title_zh?: string;
  description: string;
  description_zh?: string;
  display_instructions?: string;
  display_instructions_zh?: string;
  target_tiers: string[];
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  // Joined fields from API
  product_name?: string;
  product_name_zh?: string;
  days_remaining?: number;
  status?: 'active' | 'upcoming' | 'expired';
}
