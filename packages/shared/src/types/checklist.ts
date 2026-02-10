export type ChecklistItemType = 'photo' | 'yes_no' | 'numeric' | 'text' | 'dropdown';

export interface ChecklistItem {
  id: string;
  label: string;
  label_zh?: string;
  type: ChecklistItemType;
  required: boolean;
  options?: string[];
}

export interface ChecklistTemplate {
  id: string;
  company_id: string;
  name: string;
  name_zh?: string;
  items: ChecklistItem[];
  assigned_tiers: string[];
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

export interface ChecklistResultItem {
  item_id: string;
  value: string | number | boolean;
  photo_url?: string;
  completed_at?: string;
}

export interface VisitChecklistResult {
  id: string;
  visit_id: string;
  template_id: string;
  results: ChecklistResultItem[];
  completion_rate: number;
  created_at: string;
}
