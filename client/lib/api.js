function getCrumbToken() {
  const match = document.cookie.match(/(?:^|;\s*)crumb=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  const crumb = getCrumbToken();
  if (crumb && options.method && options.method !== 'GET') {
    headers['x-csrf-token'] = crumb;
  }

  const res = await fetch(path, {
    headers,
    credentials: 'include',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
