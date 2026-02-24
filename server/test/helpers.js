import Hapi from '@hapi/hapi';
import Inert from '@hapi/inert';
import Nes from '@hapi/nes';
import Crumb from '@hapi/crumb';
import { registerAuth } from '../auth/strategy.js';
import { rateLimitPlugin, _resetStore } from '../plugins/rate-limit.js';
import { authRoutes } from '../routes/auth.js';
import { apiRoutes } from '../routes/api.js';
import { registerOAuthStrategies, oauthRoutes } from '../routes/oauth.js';
import { uploadRoutes } from '../routes/uploads.js';
import { config } from '../config.js';
import { db } from '../db.js';

export async function createTestServer(options = {}) {
  const server = Hapi.server({
    port: 0,
    host: '0.0.0.0',
  });

  await server.register(Inert);
  await server.register(rateLimitPlugin);
  await server.register(Nes);
  server.subscription('/notifications', { auth: { mode: 'optional' } });

  registerAuth(server);
  await registerOAuthStrategies(server);

  if (options.csrf !== false && config.csrf.enabled) {
    await server.register({
      plugin: Crumb,
      options: {
        restful: true,
        cookieOptions: {
          isSecure: false,
          isHttpOnly: false,
          path: '/',
          isSameSite: 'Lax',
        },
        skip: (request) => {
          if (request.path.startsWith('/api/auth/oauth/')) return true;
          if (request.path.startsWith('/nes')) return true;
          return false;
        },
      },
    });
  }

  server.route([...authRoutes, ...oauthRoutes, ...apiRoutes, ...uploadRoutes]);

  await server.initialize();
  return server;
}

export async function createTestUser(server) {
  // First get a crumb token
  let crumbToken = null;
  let crumbCookie = null;

  if (config.csrf.enabled) {
    const crumbRes = await server.inject({
      method: 'GET',
      url: '/api/auth/providers',
    });
    const setCookies = crumbRes.headers['set-cookie'];
    if (setCookies) {
      const cookies = Array.isArray(setCookies) ? setCookies : [setCookies];
      for (const c of cookies) {
        const match = c.match(/crumb=([^;]+)/);
        if (match) {
          crumbToken = decodeURIComponent(match[1]);
          crumbCookie = `crumb=${match[1]}`;
        }
      }
    }
  }

  const suffix = Math.random().toString(36).slice(2, 8);
  const payload = {
    username: `test${suffix}`,
    email: `test${suffix}@example.com`,
    password: 'password123',
    display_name: `Test User ${suffix}`,
  };

  const headers = {};
  const cookieParts = [];
  if (crumbToken) {
    headers['x-csrf-token'] = crumbToken;
    cookieParts.push(crumbCookie);
  }

  const res = await server.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload,
    headers: {
      ...headers,
      cookie: cookieParts.join('; ') || undefined,
    },
  });

  const tokenCookie = res.headers['set-cookie']
    ?.find?.((c) => c.startsWith('token='))
    || (typeof res.headers['set-cookie'] === 'string' && res.headers['set-cookie'].startsWith('token=')
      ? res.headers['set-cookie']
      : null);

  let token = null;
  if (tokenCookie) {
    const match = tokenCookie.match(/token=([^;]+)/);
    if (match) token = match[1];
  }

  const authHeaders = {};
  const authCookieParts = [];
  if (token) authCookieParts.push(`token=${token}`);
  if (crumbToken) {
    authHeaders['x-csrf-token'] = crumbToken;
    authCookieParts.push(crumbCookie);
  }
  if (authCookieParts.length > 0) {
    authHeaders.cookie = authCookieParts.join('; ');
  }

  const user = JSON.parse(res.payload).user;

  return { user, headers: authHeaders, password: payload.password };
}

export async function cleanup(server) {
  _resetStore();
  await db.query('DELETE FROM files');
  await db.query('DELETE FROM password_reset_tokens');
  await db.query('DELETE FROM oauth_accounts');
  await db.query('DELETE FROM email_codes');
  await db.query('DELETE FROM users');
  await server.stop();
}
