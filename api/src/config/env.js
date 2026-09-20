import 'dotenv/config';

/**
 * Configuration is read once, at boot, and validated here.
 *
 * The API refuses to start when something required is missing or obviously
 * unsafe, rather than throwing on the first request that happens to need it.
 * A misconfigured deploy should fail loudly and immediately.
 */

const required = (name) => {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
};

const optional = (name, fallback) => {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
};

const integer = (name, fallback) => {
  const value = process.env[name];
  if (!value || !value.trim()) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number, got "${value}"`);
  }
  return parsed;
};

const minimumSecretLength = 24;

const assertStrongSecret = (name, value) => {
  if (value.length < minimumSecretLength) {
    throw new Error(
      `${name} must be at least ${minimumSecretLength} characters. ` +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }
  return value;
};

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: integer('PORT', 4000),

  mongoUri: required('MONGODB_URI'),

  jwtSecret: assertStrongSecret('JWT_SECRET', required('JWT_SECRET')),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '12h'),

  // Shared secret the WordPress plugin presents on every server-to-server call.
  wpSyncToken: assertStrongSecret('WP_SYNC_TOKEN', required('WP_SYNC_TOKEN')),

  // Browser origins allowed to call the API. An explicit allow-list, never "*",
  // because these endpoints carry a bearer token.
  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:5173,http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  // A lead arriving twice within this window is treated as the same enquiry.
  duplicateWindowDays: integer('DUPLICATE_WINDOW_DAYS', 30),

  admin: {
    name: optional('ADMIN_NAME', 'CRM Admin'),
    email: optional('ADMIN_EMAIL', 'admin@leadflow.test'),
    password: optional('ADMIN_PASSWORD', ''),
  },
};

export const isProduction = env.nodeEnv === 'production';
