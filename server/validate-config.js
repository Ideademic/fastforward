export function validateConfig(config) {
  const { auth, oauth, jwtSecret, databaseUrl, smtp, isDev } = config;

  // Check at least one auth method is enabled
  const anyAuthEnabled =
    auth.passwordEnabled ||
    auth.emailCodeEnabled ||
    oauth.google.enabled ||
    oauth.github.enabled ||
    oauth.microsoft.enabled;

  if (!anyAuthEnabled) {
    throw new Error(
      'At least one auth method must be enabled (password, email code, or an OAuth provider)',
    );
  }

  // Check JWT_SECRET is not default in production
  if (
    !isDev &&
    jwtSecret === 'change-me-to-a-random-secret-in-production'
  ) {
    throw new Error(
      'JWT_SECRET must be changed from the default value in production',
    );
  }

  // Check OAuth providers have credentials when enabled
  for (const [provider, settings] of Object.entries(oauth)) {
    if (settings.enabled) {
      if (!settings.clientId || !settings.clientSecret) {
        throw new Error(
          `OAuth provider "${provider}" is enabled but missing clientId or clientSecret`,
        );
      }
    }
  }

  // Check DATABASE_URL is present
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  // Warn if email code enabled with localhost SMTP in production
  if (!isDev && auth.emailCodeEnabled && smtp.host === 'localhost') {
    console.warn(
      'Warning: Email code auth is enabled but SMTP_HOST is "localhost" in production',
    );
  }
}
