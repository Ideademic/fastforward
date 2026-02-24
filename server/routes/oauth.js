import Bell from '@hapi/bell';
import crypto from 'crypto';
import { db } from '../db.js';
import { config } from '../config.js';
import { generateToken } from '../auth/strategy.js';

const providers = {
  google: {
    provider: 'google',
    scope: ['openid', 'email', 'profile'],
  },
  github: {
    provider: 'github',
    scope: ['user:email'],
  },
  microsoft: {
    provider: 'microsoft',
    scope: ['openid', 'email', 'profile'],
  },
};

export async function registerOAuthStrategies(server) {
  const anyEnabled = Object.values(config.oauth).some((p) => p.enabled);
  if (!anyEnabled) return;

  await server.register(Bell);

  for (const [name, providerConfig] of Object.entries(providers)) {
    const oauthConfig = config.oauth[name];
    if (!oauthConfig.enabled) continue;

    server.auth.strategy(name, 'bell', {
      provider: providerConfig.provider,
      password: crypto.randomBytes(32).toString('hex'),
      clientId: oauthConfig.clientId,
      clientSecret: oauthConfig.clientSecret,
      isSecure: !config.isDev,
      scope: providerConfig.scope,
      ...(name === 'microsoft' && {
        providerParams: { tenant: 'common' },
      }),
    });
  }
}

export const oauthRoutes = Object.keys(providers)
  .filter((name) => config.oauth[name].enabled)
  .map((providerName) => ({
  method: ['GET', 'POST'],
  path: `/api/auth/oauth/${providerName}`,
  options: {
    auth: {
      strategy: providerName,
      mode: 'try',
    },
    plugins: { crumb: false },
  },
  handler: async (request, h) => {
    if (!request.auth.isAuthenticated) {
      return h.redirect(
        `${config.appUrl}/login?error=${encodeURIComponent(request.auth.error?.message || 'OAuth failed')}`,
      );
    }

    const profile = request.auth.credentials.profile;
    const provider = providerName;
    const providerId = String(profile.id);
    const email = profile.email || profile.raw?.email;
    const displayName =
      profile.displayName || profile.raw?.name || profile.username;

    // Look up existing OAuth link
    const { rows: existing } = await db.query(
      'SELECT user_id FROM oauth_accounts WHERE provider = $1 AND provider_id = $2',
      [provider, providerId],
    );

    let user;

    if (existing.length > 0) {
      // Known OAuth account — load user
      const { rows } = await db.query(
        'SELECT id, username, email, display_name, created_at FROM users WHERE id = $1',
        [existing[0].user_id],
      );
      user = rows[0];
    } else if (email) {
      // Check if a user with this email already exists
      const { rows: emailUsers } = await db.query(
        'SELECT id, username, email, display_name, created_at FROM users WHERE email = $1',
        [email],
      );

      if (emailUsers.length > 0) {
        // Link OAuth to existing user
        user = emailUsers[0];
        await db.query(
          `INSERT INTO oauth_accounts (user_id, provider, provider_id, email, display_name)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.id, provider, providerId, email, displayName],
        );
      } else {
        // Create new user
        const baseUsername = (
          displayName || email.split('@')[0]
        ).replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 25);

        let username = baseUsername;
        let attempts = 0;
        while (attempts < 10) {
          const { rows: taken } = await db.query(
            'SELECT id FROM users WHERE username = $1',
            [username],
          );
          if (taken.length === 0) break;
          username = `${baseUsername}${crypto.randomInt(1000, 9999)}`;
          attempts++;
        }

        const { rows: newUser } = await db.query(
          `INSERT INTO users (username, email, display_name)
           VALUES ($1, $2, $3)
           RETURNING id, username, email, display_name, created_at`,
          [username, email, displayName || null],
        );
        user = newUser[0];

        await db.query(
          `INSERT INTO oauth_accounts (user_id, provider, provider_id, email, display_name)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.id, provider, providerId, email, displayName],
        );
      }
    } else {
      return h.redirect(
        `${config.appUrl}/login?error=${encodeURIComponent('No email provided by OAuth provider')}`,
      );
    }

    const token = generateToken(user);

    return h
      .redirect(`${config.appUrl}/dashboard`)
      .state('token', token);
  },
}));
