import Hapi from '@hapi/hapi';
import Inert from '@hapi/inert';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { registerAuth } from './auth/strategy.js';
import { authRoutes } from './routes/auth.js';
import { apiRoutes } from './routes/api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function start() {
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
  registerAuth(server);
  server.route([...authRoutes, ...apiRoutes]);

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
