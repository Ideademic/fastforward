import { describe, it, before, after } from 'node:test';
import * as Lab from '@hapi/lab';
import { expect } from '@hapi/code';
import { createTestServer, createTestUser, cleanup } from './helpers.js';
import { config } from '../config.js';
import { db } from '../db.js';

const lab = Lab.script();
const { experiment, test, before: labBefore, after: labAfter } = lab;
export { lab };

experiment('Auth routes', () => {
  let server;

  labBefore(async () => {
    server = await createTestServer();
  });

  labAfter(async () => {
    await cleanup(server);
  });

  // ── Register ──────────────────────────────────────────────────────

  test('POST /api/auth/register — valid registration', async () => {
    const crumbRes = await server.inject({
      method: 'GET',
      url: '/api/auth/providers',
    });

    let crumbToken = null;
    let cookieParts = [];
    const setCookies = crumbRes.headers['set-cookie'];
    if (setCookies) {
      const cookies = Array.isArray(setCookies) ? setCookies : [setCookies];
      for (const c of cookies) {
        const match = c.match(/crumb=([^;]+)/);
        if (match) {
          crumbToken = decodeURIComponent(match[1]);
          cookieParts.push(`crumb=${match[1]}`);
        }
      }
    }

    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      },
      headers: {
        ...(crumbToken && { 'x-csrf-token': crumbToken }),
        ...(cookieParts.length > 0 && { cookie: cookieParts.join('; ') }),
      },
    });

    expect(res.statusCode).to.equal(201);
    const body = JSON.parse(res.payload);
    expect(body.user.username).to.equal('newuser');
    expect(body.user.email).to.equal('new@example.com');
  });

  test('POST /api/auth/register — duplicate returns 409', async () => {
    const { headers } = await createTestUser(server);

    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'dupuser',
        email: 'dup@example.com',
        password: 'password123',
      },
      headers,
    });

    // Register same user again
    const res2 = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'dupuser',
        email: 'dup@example.com',
        password: 'password123',
      },
      headers,
    });

    expect(res2.statusCode).to.equal(409);
  });

  // ── Login ─────────────────────────────────────────────────────────

  test('POST /api/auth/login — valid login', async () => {
    const { user, headers, password } = await createTestUser(server);

    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: user.username, password },
      headers,
    });

    expect(res.statusCode).to.equal(200);
    const body = JSON.parse(res.payload);
    expect(body.user.username).to.equal(user.username);
  });

  test('POST /api/auth/login — wrong password returns 401', async () => {
    const { user, headers } = await createTestUser(server);

    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: user.username, password: 'wrongpassword' },
      headers,
    });

    expect(res.statusCode).to.equal(401);
  });

  // ── Forgot / Reset password ───────────────────────────────────────

  test('POST /api/auth/forgot-password — returns sent:true', async () => {
    const { user, headers } = await createTestUser(server);

    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: user.email },
      headers,
    });

    expect(res.statusCode).to.equal(200);
    expect(JSON.parse(res.payload).sent).to.be.true();
  });

  test('POST /api/auth/reset-password — valid token resets password', async () => {
    const { user, headers } = await createTestUser(server);

    // Request reset
    await server.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: user.email },
      headers,
    });

    // Get token from DB
    const { rows } = await db.query(
      'SELECT token FROM password_reset_tokens WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
      [user.id],
    );

    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: rows[0].token, password: 'newpassword123' },
      headers,
    });

    expect(res.statusCode).to.equal(200);
    expect(JSON.parse(res.payload).success).to.be.true();

    // Login with new password
    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: user.username, password: 'newpassword123' },
      headers,
    });

    expect(loginRes.statusCode).to.equal(200);
  });

  // ── Me ────────────────────────────────────────────────────────────

  test('GET /api/auth/me — returns current user', async () => {
    const { user, headers } = await createTestUser(server);

    const res = await server.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers,
    });

    expect(res.statusCode).to.equal(200);
    expect(JSON.parse(res.payload).user.id).to.equal(user.id);
  });

  // ── Logout ────────────────────────────────────────────────────────

  test('POST /api/auth/logout — returns success', async () => {
    const { headers } = await createTestUser(server);

    const res = await server.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers,
    });

    expect(res.statusCode).to.equal(200);
    expect(JSON.parse(res.payload).success).to.be.true();
  });

  // ── Delete account ────────────────────────────────────────────────

  test('DELETE /api/auth/account — deletes user', async () => {
    const { user, headers } = await createTestUser(server);

    const res = await server.inject({
      method: 'DELETE',
      url: '/api/auth/account',
      headers,
    });

    expect(res.statusCode).to.equal(200);
    expect(JSON.parse(res.payload).deleted).to.be.true();

    // Verify user is gone
    const { rows } = await db.query('SELECT id FROM users WHERE id = $1', [
      user.id,
    ]);
    expect(rows.length).to.equal(0);
  });

  // ── Providers ─────────────────────────────────────────────────────

  test('GET /api/auth/providers — returns enabled methods', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/auth/providers',
    });

    expect(res.statusCode).to.equal(200);
    const body = JSON.parse(res.payload);
    expect(body.password).to.be.a.boolean();
    expect(body.emailCode).to.be.a.boolean();
    expect(body.google).to.be.a.boolean();
    expect(body.github).to.be.a.boolean();
    expect(body.microsoft).to.be.a.boolean();
  });
});
