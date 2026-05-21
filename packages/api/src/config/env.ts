// Validates required environment variables at startup.
// Fails fast in production if critical vars are missing.

interface EnvConfig {
  JWT_SECRET: string;
  DATABASE_URL: string;
  NODE_ENV: string;
  PORT: number;
  HOST: string;
  CORS_ORIGINS: string[];
  GAODE_API_KEY?: string;
  GAODE_WEB_SERVICE_KEY?: string;
  GAODE_WEB_SERVICE_PRIVATE_KEY?: string;
  GAODE_JS_KEY?: string;
  GAODE_JS_SECURITY_CODE?: string;
  DEMO_MODE: boolean;
}

export function validateEnv(): EnvConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  // In production, these MUST be set explicitly
  if (isProduction) {
    const required = ['JWT_SECRET', 'DATABASE_URL'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}. ` +
        'These must be set explicitly in production.'
      );
    }
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (isProduction) {
      throw new Error('JWT_SECRET is required in production');
    }
    console.warn('WARNING: JWT_SECRET not set, using insecure default. Do NOT use in production.');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl && isProduction) {
    throw new Error('DATABASE_URL is required in production');
  }

  return {
    JWT_SECRET: jwtSecret || 'dev-only-insecure-secret',
    DATABASE_URL: databaseUrl || 'postgres://xundian:xundian_dev@localhost:5434/xundian',
    NODE_ENV: nodeEnv,
    PORT: parseInt(process.env.PORT || '3000', 10),
    HOST: process.env.HOST || '0.0.0.0',
    CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
    GAODE_API_KEY: process.env.GAODE_API_KEY,
    GAODE_WEB_SERVICE_KEY: process.env.GAODE_WEB_SERVICE_KEY,
    GAODE_WEB_SERVICE_PRIVATE_KEY: process.env.GAODE_WEB_SERVICE_PRIVATE_KEY,
    GAODE_JS_KEY: process.env.GAODE_JS_KEY,
    GAODE_JS_SECURITY_CODE: process.env.GAODE_JS_SECURITY_CODE,
    DEMO_MODE: process.env.DEMO_MODE === 'true' || process.env.ENABLE_DEMO_DATA === 'true',
  };
}
