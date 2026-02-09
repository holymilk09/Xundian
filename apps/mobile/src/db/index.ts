import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import Store from './models/Store';
import Visit from './models/Visit';
import VisitPhoto from './models/VisitPhoto';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'xundian',
  jsi: true,
});

export const database = new Database({
  adapter,
  modelClasses: [Store, Visit, VisitPhoto],
});

export { Store, Visit, VisitPhoto };
