import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString && process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL environment variable is required in production');
}

const pool = new pg.Pool({
  connectionString: connectionString || 'postgres://xundian:xundian_dev@localhost:5434/xundian',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
