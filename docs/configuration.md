---
title: Configuration
layout: default
nav_order: 6
---

# Configuration

All configuration is driven by environment variables, loaded via `dotenv` in `server/config.js`. Copy `.env.example` to `.env` to get started.

## Environment Variables

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Port the Hapi server listens on |
| `NODE_ENV` | `development` | Set to `production` to enable secure cookies and static file serving |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://fastforward:fastforward@localhost:5432/fastforward` | Postgres connection string |

In Docker Compose, this is overridden to `postgres://fastforward:fastforward@postgres:5432/fastforward` (using the `postgres` service name) via the `environment` key in `docker-compose.yml`. Your `.env` value is ignored when running in containers.

### Auth

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `change-me-to-a-random-secret-in-production` | Secret key for signing JWTs. **Must be changed in production.** |
| `JWT_EXPIRY` | `7d` | JWT lifetime. Accepts `ms`-style strings: `1h`, `7d`, `30d`, etc. |
| `AUTH_PASSWORD_ENABLED` | `true` | Set to `false` to disable password registration and login |
| `AUTH_EMAIL_CODE_ENABLED` | `true` | Set to `false` to disable email code auth |

### Email (SMTP)

Used by the email code auth strategy to send login codes.

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | `localhost` | SMTP server hostname |
| `SMTP_PORT` | `1025` | SMTP server port |
| `SMTP_USER` | (empty) | SMTP username. If empty, auth is skipped. |
| `SMTP_PASS` | (empty) | SMTP password |
| `SMTP_FROM` | `noreply@example.com` | Sender address for outgoing emails |

For local development, [Mailpit](https://mailpit.axllent.org) is a good choice — run it with `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit` and the defaults in `.env.example` will work.

## Config Module

`server/config.js` exports a single `config` object that the rest of the server imports:

```js
import { config } from './config.js';

config.port              // number
config.isDev             // boolean (true when NODE_ENV !== 'production')
config.databaseUrl       // string
config.jwtSecret         // string
config.jwtExpiry         // string
config.auth.passwordEnabled    // boolean
config.auth.emailCodeEnabled   // boolean
config.smtp.host         // string
config.smtp.port         // number
config.smtp.user         // string
config.smtp.pass         // string
config.smtp.from         // string
```

To add new config values, add the env var to `.env.example` and read it in `server/config.js`.
