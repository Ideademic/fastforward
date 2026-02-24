import Hapi from '@hapi/hapi';
import Inert from '@hapi/inert';
import Crumb from '@hapi/crumb';
import Nes from '@hapi/nes';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { config } from './config.js';
import { validateConfig } from './validate-config.js';
import { registerAuth } from './auth/strategy.js';
import { rateLimitPlugin } from './plugins/rate-limit.js';
import { authRoutes } from './routes/auth.js';
import { apiRoutes } from './routes/api.js';
import { registerOAuthStrategies, oauthRoutes } from './routes/oauth.js';
import { uploadRoutes } from './routes/uploads.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function start() {
  validateConfig(config);

  // Ensure uploads directory exists
  mkdirSync(join(__dirname, '..', 'uploads'), { recursive: true });

  const server = Hapi.server({
    port: config.port,
    host: '0.0.0.0',
    routes: {
      cors: config.isDev
        ? { origin: ['http://localhost:5173'], credentials: true }
        : false,
    },
  });

  await server.register(Inert);
  await server.register(rateLimitPlugin);

  // WebSocket support
  await server.register(Nes);
  server.subscription('/notifications', { auth: { mode: 'optional' } });

  registerAuth(server);
  await registerOAuthStrategies(server);

  // CSRF protection
  if (config.csrf.enabled) {
    await server.register({
      plugin: Crumb,
      options: {
        restful: true,
        cookieOptions: {
          isSecure: !config.isDev,
          isHttpOnly: false,
          path: '/',
          isSameSite: 'Lax',
        },
        skip: (request) => {
          // Skip CSRF for OAuth callbacks and WebSocket
          if (request.path.startsWith('/api/auth/oauth/')) return true;
          if (request.path.startsWith('/nes')) return true;
          return false;
        },
      },
    });
  }

  server.route([...authRoutes, ...oauthRoutes, ...apiRoutes, ...uploadRoutes]);

  // Production: serve the built Vite frontend
  if (!config.isDev) {
    server.route({
      method: 'GET',
      path: '/{param*}',
      options: { auth: false },
      handler: {
        directory: {
          path: join(__dirname, '..', 'dist'),
          index: ['index.html'],
        },
      },
    });

    // SPA fallback — serve index.html for non-API 404s
    server.ext('onPreResponse', (request, h) => {
      const { response } = request;
      if (
        response.isBoom &&
        response.output.statusCode === 404 &&
        !request.path.startsWith('/api')
      ) {
        return h.file(join(__dirname, '..', 'dist', 'index.html'));
      }
      return h.continue;
    });
  }

  await server.start();
  console.log(`Server running at ${server.info.uri}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
