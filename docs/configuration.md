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
| `AUTH_PASSWORD_REQUIRE_EMAIL` | `true` | Set to `false` to make email optional during password registration |

### OAuth

| Variable | Default | Description |
|----------|---------|-------------|
| `OAUTH_GOOGLE_ENABLED` | `false` | Set to `"true"` to enable Google OAuth |
| `OAUTH_GOOGLE_CLIENT_ID` | (empty) | Google OAuth client ID |
| `OAUTH_GOOGLE_CLIENT_SECRET` | (empty) | Google OAuth client secret |
| `OAUTH_GITHUB_ENABLED` | `false` | Set to `"true"` to enable GitHub OAuth |
| `OAUTH_GITHUB_CLIENT_ID` | (empty) | GitHub OAuth client ID |
| `OAUTH_GITHUB_CLIENT_SECRET` | (empty) | GitHub OAuth client secret |
| `OAUTH_MICROSOFT_ENABLED` | `false` | Set to `"true"` to enable Microsoft OAuth |
| `OAUTH_MICROSOFT_CLIENT_ID` | (empty) | Microsoft OAuth client ID |
| `OAUTH_MICROSOFT_CLIENT_SECRET` | (empty) | Microsoft OAuth client secret |
| `APP_URL` | `http://localhost:5173` | Base URL for OAuth callbacks and password reset links |

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

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window in milliseconds (default 15 minutes) |
| `RATE_LIMIT_MAX_ATTEMPTS` | `15` | Max requests per window per IP per path |

### File Uploads

| Variable | Default | Description |
|----------|---------|-------------|
| `UPLOAD_MAX_FILE_SIZE_MB` | `10` | Maximum file upload size in MB |

### CSRF

| Variable | Default | Description |
|----------|---------|-------------|
| `CSRF_ENABLED` | `true` | Set to `"false"` to disable CSRF protection |

## Config Module

`server/config.js` exports a single `config` object that the rest of the server imports:

```js
import { config } from './config.js';

config.port              // number
config.isDev             // boolean (true when NODE_ENV !== 'production')
config.databaseUrl       // string
config.jwtSecret         // string
config.jwtExpiry         // string
config.appUrl            // string
config.auth.passwordEnabled        // boolean
config.auth.emailCodeEnabled       // boolean
config.auth.passwordRequireEmail   // boolean
config.oauth.google.enabled      // boolean
config.oauth.google.clientId     // string
config.oauth.google.clientSecret // string
config.oauth.github.enabled      // boolean
config.oauth.github.clientId     // string
config.oauth.github.clientSecret // string
config.oauth.microsoft.enabled      // boolean
config.oauth.microsoft.clientId     // string
config.oauth.microsoft.clientSecret // string
config.rateLimit.windowMs    // number
config.rateLimit.maxAttempts // number
config.upload.maxFileSizeMb  // number
config.csrf.enabled          // boolean
config.smtp.host         // string
config.smtp.port         // number
config.smtp.user         // string
config.smtp.pass         // string
config.smtp.from         // string
```

To add new config values, add the env var to `.env.example` and read it in `server/config.js`.

## Startup Validation

`server/validate-config.js` runs on startup and performs the following checks. The server will **throw and refuse to start** if any of these conditions are met:

- **Zero auth methods enabled** -- at least one of password auth, email code auth, or an OAuth provider must be enabled.
- **Default JWT_SECRET in production** -- the default development secret must be replaced when `NODE_ENV` is `production`.
- **OAuth provider enabled but missing credentials** -- if any `OAUTH_*_ENABLED` flag is `true`, the corresponding `CLIENT_ID` and `CLIENT_SECRET` must be set.
- **Missing DATABASE_URL** -- a database connection string is required.

Additionally, the following non-fatal warning is emitted:

- **Email code auth with localhost SMTP in production** -- if `AUTH_EMAIL_CODE_ENABLED` is `true` and `SMTP_HOST` is still `localhost` while `NODE_ENV` is `production`, a warning is logged. Email delivery will almost certainly fail in this configuration.
