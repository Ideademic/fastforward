export const apiRoutes = [
  {
    method: 'GET',
    path: '/api/health',
    options: { auth: false },
    handler: () => ({ status: 'ok', timestamp: new Date().toISOString() }),
  },
];
