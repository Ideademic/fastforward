---
title: Architecture
layout: default
nav_order: 3
---

# Architecture

## Project Structure

```
fastforward/
├── client/
│   ├── components/
│   │   └── layout.jsx
│   ├── lib/
│   │   ├── api.js              # Fetch wrapper (GET/POST/DELETE, CSRF, credentials)
│   │   └── auth.jsx
│   ├── pages/
│   │   ├── home.jsx
│   │   ├── login.jsx           # Password + email code + OAuth tabs
│   │   ├── register.jsx
│   │   ├── dashboard.jsx       # Protected page, account deletion
│   │   ├── forgot-password.jsx # Password reset request form
│   │   └── reset-password.jsx  # Set new password form
│   ├── app.jsx
│   ├── index.css
│   └── main.jsx
├── server/
│   ├── auth/
│   │   └── strategy.js
│   ├── migrations/
│   │   ├── 001_initial.sql
│   │   └── 002_v1_1_features.sql  # oauth_accounts, password_reset_tokens, files tables
│   ├── plugins/
│   │   └── rate-limit.js       # In-memory rate limiting plugin
│   ├── routes/
│   │   ├── auth.js             # Auth endpoints + password reset + account deletion + providers
│   │   ├── api.js              # Health check + broadcast
│   │   ├── oauth.js            # OAuth strategies (Google, GitHub, Microsoft)
│   │   └── uploads.js          # File upload/download/delete
│   ├── services/
│   │   └── email.js            # Login codes + password reset emails
│   ├── test/
│   │   ├── helpers.js          # Test server builder + utilities
│   │   ├── auth.test.js
│   │   ├── oauth.test.js
│   │   ├── uploads.test.js
│   │   ├── api.test.js
│   │   └── websocket.test.js
│   ├── config.js
│   ├── db.js
│   ├── index.js
│   ├── migrate.js
│   └── validate-config.js      # Startup configuration validation
├── uploads/                     # User-uploaded files (gitignored)
├── docs/
├── docker-compose.yml
├── Dockerfile
├── index.html
├── vite.config.js
├── package.json
├── .env.example
├── .gitignore
└── .dockerignore
```

## How the Pieces Connect

### Development

```
Browser → localhost:5173 (Vite dev server)
             │
             ├── Serves client/ files with HMR
             └── Proxies /api/* → localhost:3001 (Hapi)
                                      │
                                      └── Queries → Postgres :5432
```

Vite handles the frontend with hot module replacement. Any request starting with `/api` is proxied to the Hapi server. This is configured in `vite.config.js` under `server.proxy`.

### Production

```
Browser → :3001 (Hapi)
             │
             ├── Serves dist/* (built frontend via @hapi/inert)
             ├── SPA fallback (non-API 404s → index.html)
             └── /api/* → route handlers → Postgres
```

`npm run build` compiles the frontend into `dist/`. The Hapi server serves those static files and handles SPA routing — any non-API request that would 404 falls back to `index.html` so client-side routing works.

### Docker Compose

```
[proxy network] ← nginx/etc
       │
      app (:3001, Hapi serving built frontend + API)
       │
   [internal network]
       │
    postgres (:5432)
```

`docker-compose.yml` overrides `DATABASE_URL` with the `postgres` service name so inter-container networking works. Your `.env` value for `DATABASE_URL` is ignored in Docker — everything else in `.env` still applies.

## Key Design Decisions

- **JWT in httpOnly cookies** — tokens are never accessible to client-side JavaScript. The server sets and reads them automatically via Hapi's state management.
- **No ORM** — the `db.js` module exports a thin wrapper around `pg.Pool.query()`. Write SQL directly. Add an ORM if you want one.
- **SQL migrations** — plain `.sql` files, run in alphabetical order, tracked in a `migrations` table. No migration framework needed.
- **Dual auth strategies** — password and email code auth are independently toggleable via env vars. Both can run simultaneously.
- **Vite proxying in dev** — the frontend fetches `/api/...` without caring whether it's dev or production. No CORS issues, no separate API URLs to manage.
- **CSRF via @hapi/crumb** — restful mode, token in cookie readable by JS, sent as x-csrf-token header.
- **In-memory rate limiting** — simple Map-based rate limiter with periodic cleanup, configured per-route via tags.
- **OAuth via @hapi/bell** — providers independently toggleable, automatic account linking by email.
- **WebSocket via @hapi/nes** — built on Hapi's native WebSocket support, subscription-based pub/sub.
- **Startup validation** — config is validated before the server starts, preventing misconfiguration in production.
- **File uploads** — stored on disk in uploads/ directory, metadata in PostgreSQL.
