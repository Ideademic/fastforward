---
title: Getting Started
layout: default
nav_order: 2
---

# Getting Started

## Prerequisites

- Node.js 24+
- Docker and Docker Compose
- (Optional) An SMTP server for email code auth — [Mailpit](https://mailpit.axllent.org) works well for local dev

## Local Development

```bash
# Clone and install
git clone <your-repo-url> my-app
cd my-app
npm install

# Create your env file
cp .env.example .env
```

Edit `.env` and set `JWT_SECRET` to a random string. The rest of the defaults work for local development.

```bash
# Start Postgres
docker compose up postgres -d

# Run database migrations
npm run migrate

# Start the app (Vite + Hapi concurrently)
npm run dev
```

The frontend is at `http://localhost:5173`. The Vite dev server proxies `/api` requests to Hapi on port 3001 automatically.

## Docker

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec app node server/migrate.js
```

The app is at `http://localhost:3001`. See [Deployment](deployment) for production setups.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite + Hapi concurrently |
| `npm run dev:client` | Vite dev server only |
| `npm run dev:server` | Hapi with nodemon only |
| `npm run build` | Build frontend for production |
| `npm run start` | Start Hapi in production mode (serves built frontend) |
| `npm run migrate` | Run database migrations (local dev) |
| `npm test` | Run the test suite (requires Postgres) |

## Email in Development

For testing email code auth locally, run Mailpit:

```bash
docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit
```

The default SMTP settings in `.env.example` point to `localhost:1025`. View captured emails at `http://localhost:8025`.

## OAuth Setup

To enable OAuth providers, set the appropriate env vars (e.g. `OAUTH_GOOGLE_ENABLED=true`, `OAUTH_GOOGLE_CLIENT_ID=...`, `OAUTH_GOOGLE_CLIENT_SECRET=...`). See [Configuration](configuration) docs for all OAuth variables. Callback URLs follow the pattern: `APP_URL/api/auth/oauth/{provider}`.
