import Boom from '@hapi/boom';
import crypto from 'crypto';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { db } from '../db.js';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, '..', '..', 'uploads');

export const uploadRoutes = [
  // ── Upload file ─────────────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/uploads',
    options: {
      auth: 'session',
      payload: {
        output: 'stream',
        parse: true,
        multipart: true,
        maxBytes: config.upload.maxFileSizeMb * 1024 * 1024,
        allow: 'multipart/form-data',
      },
    },
    handler: async (request, h) => {
      const { id: userId } = request.auth.credentials;
      const file = request.payload.file;

      if (!file || typeof file.pipe !== 'function') {
        throw Boom.badRequest('No file provided');
      }

      const originalName = file.hapi?.filename || 'unknown';
      const mimeType = file.hapi?.headers?.['content-type'] || 'application/octet-stream';
      const ext = extname(originalName);
      const filename = `${crypto.randomUUID()}${ext}`;
      const filepath = join(uploadsDir, filename);

      // Write file to disk
      const writeStream = createWriteStream(filepath);
      try {
        await pipeline(file, writeStream);
      } catch (err) {
        await unlink(filepath).catch(() => {});
        throw Boom.badData('File upload failed');
      }

      const size = writeStream.bytesWritten;

      try {
        const { rows } = await db.query(
          `INSERT INTO files (user_id, filename, original_name, mime_type, size)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, filename, original_name, mime_type, size, created_at`,
          [userId, filename, originalName, mimeType, size],
        );

        return h.response(rows[0]).code(201);
      } catch (err) {
        await unlink(filepath).catch(() => {});
        throw err;
      }
    },
  },

  // ── Get file ────────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/uploads/{id}',
    options: { auth: false },
    handler: async (request, h) => {
      const { rows } = await db.query(
        'SELECT filename, original_name, mime_type FROM files WHERE id = $1',
        [request.params.id],
      );

      if (rows.length === 0) {
        throw Boom.notFound('File not found');
      }

      const file = rows[0];
      return h
        .file(join(uploadsDir, file.filename))
        .type(file.mime_type)
        .header('Content-Disposition', `inline; filename="${file.original_name}"`);
    },
  },

  // ── Delete file ─────────────────────────────────────────────────────
  {
    method: 'DELETE',
    path: '/api/uploads/{id}',
    options: { auth: 'session' },
    handler: async (request, h) => {
      const { id: userId } = request.auth.credentials;
      const fileId = request.params.id;

      const { rows } = await db.query(
        'SELECT id, filename, user_id FROM files WHERE id = $1',
        [fileId],
      );

      if (rows.length === 0) {
        throw Boom.notFound('File not found');
      }

      if (rows[0].user_id !== userId) {
        throw Boom.forbidden('You can only delete your own files');
      }

      try {
        await unlink(join(uploadsDir, rows[0].filename));
      } catch {
        // File may already be deleted from disk
      }

      await db.query('DELETE FROM files WHERE id = $1', [fileId]);

      return h.response({ deleted: true });
    },
  },
];
