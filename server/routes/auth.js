import Boom from '@hapi/boom';
import Joi from 'joi';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db.js';
import { config } from '../config.js';
import { generateToken } from '../auth/strategy.js';
import { sendLoginCode, sendPasswordResetEmail } from '../services/email.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BCRYPT_ROUNDS = 12;

export const authRoutes = [
  // ── Register (password) ─────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/auth/register',
    options: {
      auth: false,
      tags: ['rate-limit'],
      validate: {
        payload: Joi.object({
          username: Joi.string().alphanum().min(3).max(30).required(),
          email: config.auth.passwordRequireEmail
            ? Joi.string().email().required()
            : Joi.string().email().optional(),
          password: Joi.string().min(8).max(128).required(),
          display_name: Joi.string().max(255).optional(),
        }),
      },
    },
    handler: async (request, h) => {
      if (!config.auth.passwordEnabled) {
        throw Boom.forbidden('Password registration is disabled');
      }

      const { username, email, password, display_name } = request.payload;

      if (email) {
        const { rows: existing } = await db.query(
          'SELECT id FROM users WHERE username = $1 OR email = $2',
          [username, email],
        );
        if (existing.length > 0) {
          throw Boom.conflict('Username or email already taken');
        }
      } else {
        const { rows: existing } = await db.query(
          'SELECT id FROM users WHERE username = $1',
          [username],
        );
        if (existing.length > 0) {
          throw Boom.conflict('Username already taken');
        }
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const { rows } = await db.query(
        `INSERT INTO users (username, email, password_hash, display_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, display_name, created_at`,
        [username, email || null, passwordHash, display_name || null],
      );

      const user = rows[0];
      const token = generateToken(user);

      return h.response({ user }).state('token', token).code(201);
    },
  },

  // ── Login (password) ────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/auth/login',
    options: {
      auth: false,
      tags: ['rate-limit'],
      validate: {
        payload: Joi.object({
          username: Joi.string().required(),
          password: Joi.string().required(),
        }),
      },
    },
    handler: async (request, h) => {
      if (!config.auth.passwordEnabled) {
        throw Boom.forbidden('Password login is disabled');
      }

      const { username, password } = request.payload;

      const { rows } = await db.query(
        `SELECT id, username, email, display_name, password_hash, created_at
         FROM users WHERE username = $1 OR email = $1`,
        [username],
      );

      if (rows.length === 0 || !rows[0].password_hash) {
        throw Boom.unauthorized('Invalid credentials');
      }

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        throw Boom.unauthorized('Invalid credentials');
      }

      const token = generateToken(user);
      const { password_hash: _, ...safeUser } = user;

      return h.response({ user: safeUser }).state('token', token);
    },
  },

  // ── Send email code ─────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/auth/send-code',
    options: {
      auth: false,
      tags: ['rate-limit'],
      validate: {
        payload: Joi.object({
          email: Joi.string().email().required(),
        }),
      },
    },
    handler: async (request, h) => {
      if (!config.auth.emailCodeEnabled) {
        throw Boom.forbidden('Email code login is disabled');
      }

      const { email } = request.payload;
      const code = crypto.randomInt(100_000, 999_999).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Invalidate previous codes for this email
      await db.query(
        'UPDATE email_codes SET used = TRUE WHERE email = $1 AND used = FALSE',
        [email],
      );

      const { rows: users } = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email],
      );

      await db.query(
        `INSERT INTO email_codes (user_id, email, code, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [users[0]?.id ?? null, email, code, expiresAt],
      );

      await sendLoginCode(email, code);

      // Always return success to prevent email enumeration
      return h.response({ sent: true });
    },
  },

  // ── Verify email code ───────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/auth/verify-code',
    options: {
      auth: false,
      tags: ['rate-limit'],
      validate: {
        payload: Joi.object({
          email: Joi.string().email().required(),
          code: Joi.string().length(6).required(),
          username: Joi.string().alphanum().min(3).max(30).optional(),
        }),
      },
    },
    handler: async (request, h) => {
      if (!config.auth.emailCodeEnabled) {
        throw Boom.forbidden('Email code login is disabled');
      }

      const { email, code, username } = request.payload;

      const { rows: codes } = await db.query(
        `SELECT id FROM email_codes
         WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()`,
        [email, code],
      );

      if (codes.length === 0) {
        throw Boom.unauthorized('Invalid or expired code');
      }

      await db.query('UPDATE email_codes SET used = TRUE WHERE id = $1', [
        codes[0].id,
      ]);

      // Find or create user
      let { rows: users } = await db.query(
        'SELECT id, username, email, display_name, created_at FROM users WHERE email = $1',
        [email],
      );

      if (users.length === 0) {
        if (!username) {
          throw Boom.badRequest('Username is required for new accounts');
        }

        const { rows: taken } = await db.query(
          'SELECT id FROM users WHERE username = $1',
          [username],
        );
        if (taken.length > 0) {
          throw Boom.conflict('Username already taken');
        }

        const result = await db.query(
          `INSERT INTO users (username, email)
           VALUES ($1, $2)
           RETURNING id, username, email, display_name, created_at`,
          [username, email],
        );
        users = result.rows;
      }

      const user = users[0];
      const token = generateToken(user);

      return h.response({ user }).state('token', token);
    },
  },

  // ── Forgot password ─────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/auth/forgot-password',
    options: {
      auth: false,
      tags: ['rate-limit'],
      validate: {
        payload: Joi.object({
          email: Joi.string().email().required(),
        }),
      },
    },
    handler: async (request, h) => {
      const { email } = request.payload;

      const { rows: users } = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email],
      );

      if (users.length > 0) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.query(
          `INSERT INTO password_reset_tokens (user_id, token, expires_at)
           VALUES ($1, $2, $3)`,
          [users[0].id, token, expiresAt],
        );

        const resetUrl = `${config.appUrl}/reset-password?token=${token}`;
        await sendPasswordResetEmail(email, resetUrl);
      }

      // Always return success to prevent email enumeration
      return h.response({ sent: true });
    },
  },

  // ── Reset password ──────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/auth/reset-password',
    options: {
      auth: false,
      validate: {
        payload: Joi.object({
          token: Joi.string().required(),
          password: Joi.string().min(8).max(128).required(),
        }),
      },
    },
    handler: async (request, h) => {
      const { token, password } = request.payload;

      const { rows: tokens } = await db.query(
        `SELECT id, user_id FROM password_reset_tokens
         WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
        [token],
      );

      if (tokens.length === 0) {
        throw Boom.badRequest('Invalid or expired reset token');
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        passwordHash,
        tokens[0].user_id,
      ]);

      await db.query(
        'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
        [tokens[0].id],
      );

      return h.response({ success: true });
    },
  },

  // ── Logout ──────────────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/auth/logout',
    options: { auth: false },
    handler: (_request, h) => {
      return h.response({ success: true }).unstate('token');
    },
  },

  // ── Current user ────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/auth/me',
    options: { auth: 'session' },
    handler: async (request) => {
      const { id } = request.auth.credentials;

      const { rows } = await db.query(
        'SELECT id, username, email, display_name, created_at FROM users WHERE id = $1',
        [id],
      );

      if (rows.length === 0) {
        throw Boom.unauthorized('User not found');
      }

      return { user: rows[0] };
    },
  },

  // ── Auth providers ──────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/auth/providers',
    options: { auth: false },
    handler: () => ({
      password: config.auth.passwordEnabled,
      emailCode: config.auth.emailCodeEnabled,
      passwordRequireEmail: config.auth.passwordRequireEmail,
      google: config.oauth.google.enabled,
      github: config.oauth.github.enabled,
      microsoft: config.oauth.microsoft.enabled,
    }),
  },

  // ── Delete account ──────────────────────────────────────────────────
  {
    method: 'DELETE',
    path: '/api/auth/account',
    options: { auth: 'session' },
    handler: async (request, h) => {
      const { id } = request.auth.credentials;

      // Delete uploaded files from disk
      const { rows: files } = await db.query(
        'SELECT filename FROM files WHERE user_id = $1',
        [id],
      );

      const uploadsDir = join(__dirname, '..', '..', 'uploads');
      for (const file of files) {
        try {
          await unlink(join(uploadsDir, file.filename));
        } catch {
          // File may already be deleted
        }
      }

      // Delete user (cascades to all related tables)
      await db.query('DELETE FROM users WHERE id = $1', [id]);

      return h.response({ deleted: true }).unstate('token');
    },
  },
];
