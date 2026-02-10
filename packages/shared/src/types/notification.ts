export type NotificationType = 'revisit_reminder' | 'oos_alert' | 'route_ready' | 'system' | 'store_discovered';

export interface Notification {
  id: string;
  company_id: string;
  employee_id: string;
  type: NotificationType;
  title: string;
  message: string;
  store_id?: string;
  schedule_id?: string;
  read: boolean;
  created_at: string;
}
