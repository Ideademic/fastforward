---
title: Architecture
layout: default
nav_order: 3
---

# Architecture

## Project Structure

```
fastforward/
├── client/                     # Frontend (Preact + Tailwind)
│   ├── components/
│   │   └── layout.jsx          # Top nav, auth-aware links
│   ├── lib/
│   │   ├── api.js              # Fetch wrapper (GET/POST, credentials)
│   │   └── auth.jsx            # AuthContext provider + useAuth hook
│   ├── pages/
│   │   ├── home.jsx            # Landing page
│   │   ├── login.jsx           # Password + email code tabs
│   │   ├── register.jsx        # Registration form
│   │   └── dashboard.jsx       # Protected page (redirects if not logged in)
│   ├── app.jsx                 # Router setup
│   ├── index.css               # Tailwind v4 entry (@import "tailwindcss")
│   └── main.jsx                # Preact render entry point
├── server/                     # Backend (Hapi.js)
│   ├── auth/
│   │   └── strategy.js         # JWT-in-cookie Hapi auth scheme + token generation
│   ├── migrations/
│   │   └── 001_initial.sql     # users + email_codes tables
│   ├── routes/
│   │   ├── auth.js             # Auth endpoints (register, login, codes, logout, me)
│   │   └── api.js              # App endpoints (health check)
│   ├── services/
│   │   └── email.js            # Nodemailer transporter for sending login codes
│   ├── config.js               # Reads env vars into a config object
│   ├── db.js                   # pg Pool connected via DATABASE_URL
│   ├── index.js                # Hapi server init, plugin registration, static serving
│   └── migrate.js              # SQL migration runner
├── docs/                       # This documentation (Jekyll + GitHub Pages)
├── docker-compose.yml          # App + Postgres services
├── Dockerfile                  # Multi-stage production build
├── index.html                  # Vite HTML entry point
├── vite.config.js              # Vite + Preact + Tailwind plugins, API proxy
├── package.json
├── .env.example                # Template for environment variables
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
