import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation, json } from '@nozbe/watermelondb/decorators';
import type { PhotoType } from '@xundian/shared';

const sanitizeAIAnalysis = (raw: unknown) => (typeof raw === 'object' ? raw : null);

export default class VisitPhoto extends Model {
  static table = 'visit_photos';

  static associations = {
    visits: { type: 'belongs_to' as const, key: 'visit_id' },
  };

  @text('server_id') serverId!: string | null;
  @text('visit_id') visitId!: string;
  @text('photo_url') photoUrl!: string;
  @text('photo_type') photoType!: PhotoType;
  @json('ai_analysis', sanitizeAIAnalysis) aiAnalysis!: unknown | null;
  @field('ai_processed_at') aiProcessedAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('visits', 'visit_id') visit: any;
}
