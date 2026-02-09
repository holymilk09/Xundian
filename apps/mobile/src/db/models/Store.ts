import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, children } from '@nozbe/watermelondb/decorators';
import type { StoreTier, StoreType } from '@xundian/shared';

export default class Store extends Model {
  static table = 'stores';

  static associations = {
    visits: { type: 'has_many' as const, foreignKey: 'store_id' },
  };

  @text('server_id') serverId!: string | null;
  @text('company_id') companyId!: string;
  @text('name') name!: string;
  @text('name_zh') nameZh!: string | null;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @text('address') address!: string | null;
  @text('tier') tier!: StoreTier;
  @text('store_type') storeType!: StoreType;
  @text('contact_name') contactName!: string | null;
  @text('contact_phone') contactPhone!: string | null;
  @text('gaode_poi_id') gaodePoiId!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('visits') visits: any;
}
