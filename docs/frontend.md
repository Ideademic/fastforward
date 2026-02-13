---
title: Frontend
layout: default
nav_order: 8
---

# Frontend

The frontend is a Preact SPA styled with Tailwind CSS v4, built and served by Vite.

## Entry Points

- `index.html` — Vite's HTML entry. Loads `client/main.jsx`.
- `client/main.jsx` — Renders `<App />` into `#app`, imports Tailwind CSS.
- `client/app.jsx` — Wraps the router in `<AuthProvider>` and `<Layout>`.

## Routing

Client-side routing uses [`preact-router`](https://github.com/preactjs/preact-router).

```jsx
// client/app.jsx
<Router>
  <Home path="/" />
  <Login path="/login" />
  <Register path="/register" />
  <Dashboard path="/dashboard" />
</Router>
```

To navigate programmatically:

```js
import { route } from 'preact-router';
route('/dashboard');
```

To add a new page, create a component in `client/pages/` and add a `<Route path="..." />` entry in `app.jsx`.

## Pages

| Page | Path | Auth Required | Description |
|------|------|--------------|-------------|
| `home.jsx` | `/` | No | Landing page with CTA links |
| `login.jsx` | `/login` | No | Tabbed login (password / email code) |
| `register.jsx` | `/register` | No | Registration form |
| `dashboard.jsx` | `/dashboard` | Yes | User profile, redirects to `/login` if not authenticated |

## Components

### `Layout` (`client/components/layout.jsx`)

Wraps every page. Renders the top nav bar with auth-aware links:

- **Logged out**: Login, Register
- **Logged in**: Dashboard, Logout

### Auth Hook (`client/lib/auth.jsx`)

`<AuthProvider>` wraps the app and provides auth state via context. Use the `useAuth()` hook in any component:

```jsx
import { useAuth } from '../lib/auth.jsx';

function MyComponent() {
  const { user, loading, login, logout } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Not logged in</p>;
  return <p>Hello, {user.username}</p>;
}
```

See [Authentication — Frontend Auth Hook](auth#frontend-auth-hook) for the full API.

### API Client (`client/lib/api.js`)

A thin wrapper around `fetch` that:

- Sets `Content-Type: application/json`
- Includes credentials (cookies)
- Parses JSON responses
- Throws on non-2xx status with the server's error message

```js
import { api } from '../lib/api.js';

const data = await api.get('/api/health');
const result = await api.post('/api/auth/login', { username, password });
```

## Styling

Tailwind CSS v4 is loaded via the `@tailwindcss/vite` plugin. The CSS entry point is `client/index.css`:

```css
@import "tailwindcss";
```

Tailwind v4 uses a CSS-first configuration model — there's no `tailwind.config.js`. To customize the theme, add `@theme` blocks in `client/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-brand: #4f46e5;
  --font-family-display: "Inter", sans-serif;
}
```

See the [Tailwind v4 docs](https://tailwindcss.com/docs) for the full configuration API.

## Vite Config

`vite.config.js` registers two plugins and sets up the API proxy:

```js
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  build: { outDir: 'dist' },
  server: {
    proxy: { '/api': 'http://localhost:3001' },
  },
});
```

- `@preact/preset-vite` — handles JSX transformation for Preact.
- `@tailwindcss/vite` — processes Tailwind CSS.
- `server.proxy` — forwards `/api` requests to Hapi during development so the frontend can fetch `/api/...` without CORS issues.
