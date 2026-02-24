import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  isDev: process.env.NODE_ENV !== 'production',

  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://fastforward:fastforward@localhost:5432/fastforward',

  jwtSecret:
    process.env.JWT_SECRET || 'change-me-to-a-random-secret-in-production',
  jwtExpiry: process.env.JWT_EXPIRY || '7d',

  appUrl: process.env.APP_URL || 'http://localhost:5173',

  auth: {
    passwordEnabled: process.env.AUTH_PASSWORD_ENABLED !== 'false',
    emailCodeEnabled: process.env.AUTH_EMAIL_CODE_ENABLED !== 'false',
    passwordRequireEmail: process.env.AUTH_PASSWORD_REQUIRE_EMAIL !== 'false',
  },

  oauth: {
    google: {
      enabled: process.env.OAUTH_GOOGLE_ENABLED === 'true',
      clientId: process.env.OAUTH_GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET || '',
    },
    github: {
      enabled: process.env.OAUTH_GITHUB_ENABLED === 'true',
      clientId: process.env.OAUTH_GITHUB_CLIENT_ID || '',
      clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET || '',
    },
    microsoft: {
      enabled: process.env.OAUTH_MICROSOFT_ENABLED === 'true',
      clientId: process.env.OAUTH_MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.OAUTH_MICROSOFT_CLIENT_SECRET || '',
    },
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxAttempts: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || '15', 10),
  },

  upload: {
    maxFileSizeMb: parseInt(process.env.UPLOAD_MAX_FILE_SIZE_MB || '10', 10),
  },

  csrf: {
    enabled: process.env.CSRF_ENABLED !== 'false',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@example.com',
  },
};
