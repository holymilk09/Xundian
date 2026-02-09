export type EmployeeRole = 'rep' | 'area_manager' | 'regional_director' | 'admin';

export interface Company {
  id: string;
  name: string;
  name_zh?: string;
  business_license: string;
  unified_credit_code?: string;
  industry: string;
  company_code: string;
  tier_config: TierConfig;
  created_at: string;
}

export interface TierConfig {
  A: { revisit_days: number };
  B: { revisit_days: number };
  C: { revisit_days: number };
}

export interface Employee {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  role: EmployeeRole;
  territory_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface Territory {
  id: string;
  company_id: string;
  name: string;
  name_zh?: string;
  manager_id?: string;
}
