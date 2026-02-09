import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation, children } from '@nozbe/watermelondb/decorators';
import type { StockStatus } from '@xundian/shared';

export default class Visit extends Model {
  static table = 'visits';

  static associations = {
    stores: { type: 'belongs_to' as const, key: 'store_id' },
    visit_photos: { type: 'has_many' as const, foreignKey: 'visit_id' },
  };

  @text('server_id') serverId!: string | null;
  @text('company_id') companyId!: string;
  @text('store_id') storeId!: string;
  @text('employee_id') employeeId!: string;
  @date('checked_in_at') checkedInAt!: Date;
  @field('gps_lat') gpsLat!: number;
  @field('gps_lng') gpsLng!: number;
  @field('gps_accuracy_m') gpsAccuracyM!: number;
  @text('stock_status') stockStatus!: StockStatus;
  @text('notes') notes!: string | null;
  @field('duration_minutes') durationMinutes!: number | null;
  @field('is_audit') isAudit!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('stores', 'store_id') store: any;
  @children('visit_photos') photos: any;
}
