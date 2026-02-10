export type GoalMetricType =
  | 'visits_target'
  | 'stores_target'
  | 'coverage_percent'
  | 'photos_target'
  | 'new_stores_target'
  | 'checklist_completion';

export interface GoalDefinition {
  id: string;
  metric: GoalMetricType;
  target: number;
  label: string;
  label_zh?: string;
}

export interface MonthlyGoal {
  id: string;
  company_id: string;
  month: string;
  goals: GoalDefinition[];
  created_by?: string;
  created_at: string;
}

export interface GoalProgressItem {
  goal_id: string;
  metric: GoalMetricType;
  target: number;
  current: number;
  verified: number;
  flagged: number;
  percent: number;
}

export interface GoalProgress {
  id: string;
  goal_id: string;
  employee_id: string;
  employee_name?: string;
  progress: GoalProgressItem[];
  verified_count: number;
  flagged_count: number;
  updated_at: string;
}

export type IntegrityFlagType =
  | 'gps_too_far'
  | 'gps_accuracy_low'
  | 'visit_too_short'
  | 'impossible_travel'
  | 'burst_visits'
  | 'same_gps_different_stores'
  | 'off_hours'
  | 'month_end_clustering';

export type IntegrityFlagSeverity = 'warning' | 'critical';

export interface VisitIntegrityFlag {
  id: string;
  visit_id: string;
  flag_type: IntegrityFlagType;
  severity: IntegrityFlagSeverity;
  details: Record<string, unknown>;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface WeeklyReportSummary {
  week_start: string;
  week_end: string;
  total_visits: number;
  unique_stores_visited: number;
  coverage_percent: number;
  avg_sos: number | null;
  oos_incidents: number;
  new_stores_discovered: number;
  flagged_visits: number;
  total_photos: number;
}

export interface RepWeeklyStats {
  employee_id: string;
  employee_name: string;
  visits: number;
  unique_stores: number;
  avg_duration: number;
  checklist_completion_rate: number;
  flagged_visits: number;
  verified_visits: number;
}

export interface WeeklyReport {
  summary: WeeklyReportSummary;
  rep_stats: RepWeeklyStats[];
  goal_progress_snapshot: GoalProgress[];
  top_sos_changes: Array<{
    store_id: string;
    store_name: string;
    sos_previous: number;
    sos_current: number;
    delta: number;
  }>;
  oos_stores: Array<{
    store_id: string;
    store_name: string;
    product_name: string;
    detected_at: string;
  }>;
}
