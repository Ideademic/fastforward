import Boom from '@hapi/boom';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function registerAuth(server) {
  server.auth.scheme('jwt-cookie', () => ({
    authenticate(request, h) {
      const token = request.state.token;
      if (!token) {
        return h.unauthenticated(Boom.unauthorized('Authentication required'));
      }
      try {
        const credentials = jwt.verify(token, config.jwtSecret);
        return h.authenticated({ credentials });
      } catch {
        return h.unauthenticated(Boom.unauthorized('Invalid or expired token'));
      }
    },
  }));

  server.auth.strategy('session', 'jwt-cookie');

  server.state('token', {
    ttl: 7 * 24 * 60 * 60 * 1000,
    isSecure: !config.isDev,
    isHttpOnly: true,
    isSameSite: 'Lax',
    path: '/',
    encoding: 'none',
  });
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, display_name: user.display_name },
    config.jwtSecret,
    { expiresIn: config.jwtExpiry },
  );
}
