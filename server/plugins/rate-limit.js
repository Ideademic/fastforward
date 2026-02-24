import Boom from '@hapi/boom';
import { config } from '../config.js';

const store = new Map();

// Cleanup expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer;

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

export const rateLimitPlugin = {
  name: 'rate-limit',
  version: '1.0.0',
  register(server) {
    const { windowMs, maxAttempts } = config.rateLimit;

    cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL);
    cleanupTimer.unref();

    server.ext('onPreAuth', (request, h) => {
      const routeTags = request.route.settings.tags || [];
      if (!routeTags.includes('rate-limit')) {
        return h.continue;
      }

      const key = `${request.info.remoteAddress}:${request.path}`;
      const now = Date.now();

      let entry = store.get(key);
      if (!entry || now >= entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
        store.set(key, entry);
      }

      entry.count++;

      if (entry.count > maxAttempts) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        const error = Boom.tooManyRequests('Too many requests, please try again later');
        error.output.headers['Retry-After'] = retryAfter;
        throw error;
      }

      return h.continue;
    });

    server.ext('onPreResponse', (request, h) => {
      const routeTags = request.route.settings.tags || [];
      if (!routeTags.includes('rate-limit')) {
        return h.continue;
      }

      const key = `${request.info.remoteAddress}:${request.path}`;
      const entry = store.get(key);
      const response = request.response;

      if (entry) {
        const headers = {
          'X-RateLimit-Limit': maxAttempts,
          'X-RateLimit-Remaining': Math.max(0, maxAttempts - entry.count),
          'X-RateLimit-Reset': Math.ceil(entry.resetAt / 1000),
        };

        if (response.isBoom) {
          for (const [name, value] of Object.entries(headers)) {
            response.output.headers[name] = value;
          }
        } else {
          for (const [name, value] of Object.entries(headers)) {
            response.header(name, value);
          }
        }
      }

      return h.continue;
    });
  },
};

// Export for testing
export function _resetStore() {
  store.clear();
}
