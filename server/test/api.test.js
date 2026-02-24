import * as Lab from '@hapi/lab';
import { expect } from '@hapi/code';
import { createTestServer, createTestUser, cleanup } from './helpers.js';
import { _resetStore } from '../plugins/rate-limit.js';
import { config } from '../config.js';

const lab = Lab.script();
const { experiment, test, before: labBefore, after: labAfter } = lab;
export { lab };

experiment('API routes', () => {
  let server;

  labBefore(async () => {
    server = await createTestServer();
  });

  labAfter(async () => {
    await cleanup(server);
  });

  // ── Health ────────────────────────────────────────────────────────

  test('GET /api/health — returns ok', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(res.statusCode).to.equal(200);
    const body = JSON.parse(res.payload);
    expect(body.status).to.equal('ok');
    expect(body.timestamp).to.be.a.string();
  });

  // ── Broadcast ─────────────────────────────────────────────────────

  test('POST /api/broadcast — requires auth', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/broadcast',
      payload: { message: 'hello' },
    });

    expect(res.statusCode).to.equal(401);
  });

  test('POST /api/broadcast — authenticated user can broadcast', async () => {
    const { user, headers } = await createTestUser(server);

    const res = await server.inject({
      method: 'POST',
      url: '/api/broadcast',
      payload: { message: 'hello world' },
      headers,
    });

    expect(res.statusCode).to.equal(200);
    const body = JSON.parse(res.payload);
    expect(body.from).to.equal(user.username);
    expect(body.message).to.equal('hello world');
    expect(body.timestamp).to.be.a.string();
  });

  // ── Rate limiting ─────────────────────────────────────────────────

  test('Rate limiting — returns 429 after max attempts', async () => {
    _resetStore();

    // Get CSRF token first
    const crumbRes = await server.inject({
      method: 'GET',
      url: '/api/auth/providers',
    });

    let crumbToken = null;
    let crumbCookie = null;
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

    const headers = {};
    const cookieParts = [];
    if (crumbToken) {
      headers['x-csrf-token'] = crumbToken;
      cookieParts.push(crumbCookie);
    }
    if (cookieParts.length > 0) {
      headers.cookie = cookieParts.join('; ');
    }

    const maxAttempts = config.rateLimit.maxAttempts;
    let lastRes;

    for (let i = 0; i <= maxAttempts; i++) {
      lastRes = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'nonexistent', password: 'wrong' },
        headers,
      });
    }

    expect(lastRes.statusCode).to.equal(429);
  });
});
