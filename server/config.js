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

  auth: {
    passwordEnabled: process.env.AUTH_PASSWORD_ENABLED !== 'false',
    emailCodeEnabled: process.env.AUTH_EMAIL_CODE_ENABLED !== 'false',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@example.com',
  },
};
