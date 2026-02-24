export const apiRoutes = [
  {
    method: 'GET',
    path: '/api/health',
    options: { auth: false },
    handler: () => ({ status: 'ok', timestamp: new Date().toISOString() }),
  },

  // ── Broadcast (WebSocket) ───────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/broadcast',
    options: { auth: 'session' },
    handler: async (request, h) => {
      const { message } = request.payload || {};
      const { username } = request.auth.credentials;

      const payload = {
        from: username,
        message: message || '',
        timestamp: new Date().toISOString(),
      };

      await request.server.publish('/notifications', payload);

      return h.response(payload);
    },
  },
];
