import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'stores',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'company_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'name_zh', type: 'string', isOptional: true },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'tier', type: 'string' },
        { name: 'store_type', type: 'string' },
        { name: 'contact_name', type: 'string', isOptional: true },
        { name: 'contact_phone', type: 'string', isOptional: true },
        { name: 'gaode_poi_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'visits',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'company_id', type: 'string' },
        { name: 'store_id', type: 'string', isIndexed: true },
        { name: 'employee_id', type: 'string', isIndexed: true },
        { name: 'checked_in_at', type: 'number' },
        { name: 'gps_lat', type: 'number' },
        { name: 'gps_lng', type: 'number' },
        { name: 'gps_accuracy_m', type: 'number' },
        { name: 'stock_status', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'duration_minutes', type: 'number', isOptional: true },
        { name: 'is_audit', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'visit_photos',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'visit_id', type: 'string', isIndexed: true },
        { name: 'photo_url', type: 'string' },
        { name: 'photo_type', type: 'string' },
        { name: 'ai_analysis', type: 'string', isOptional: true },
        { name: 'ai_processed_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
