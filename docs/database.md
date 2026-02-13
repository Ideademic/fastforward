---
title: Database
layout: default
nav_order: 7
---

# Database

FastForward uses PostgreSQL with the [`pg`](https://node-postgres.com) driver directly — no ORM.

## Connection

`server/db.js` creates a connection pool from `DATABASE_URL` and exports a `db` object:

```js
import { db } from './db.js';

// Parameterized query (always use $1, $2, etc. — never interpolate values)
const { rows } = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId],
);

// Access the underlying pool if needed
db.pool.on('error', (err) => console.error(err));
```

## Schema

### `users`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `SERIAL` | Primary key |
| `username` | `VARCHAR(255)` | Unique, not null |
| `email` | `VARCHAR(255)` | Unique, not null |
| `password_hash` | `VARCHAR(255)` | Nullable (null for email-code-only accounts) |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()` |

### `email_codes`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `SERIAL` | Primary key |
| `user_id` | `INTEGER` | Foreign key → `users(id)` ON DELETE CASCADE, nullable |
| `email` | `VARCHAR(255)` | Not null |
| `code` | `VARCHAR(6)` | Not null |
| `expires_at` | `TIMESTAMPTZ` | Not null |
| `used` | `BOOLEAN` | Default `false` |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` |

Indexes: `idx_email_codes_email`, `idx_email_codes_expires`.

### `migrations`

Created automatically by the migration runner.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `SERIAL` | Primary key |
| `name` | `VARCHAR(255)` | Unique, not null |
| `run_at` | `TIMESTAMPTZ` | Default `NOW()` |

## Migrations

Migrations are plain `.sql` files in `server/migrations/`, run in alphabetical order. The runner (`server/migrate.js`) tracks applied migrations in the `migrations` table and skips any that have already been applied.

### Running Migrations

```bash
# Local dev (Postgres port exposed to host)
npm run migrate

# Docker (run inside the app container)
docker compose exec app node server/migrate.js
```

### Adding a Migration

1. Create a new file with the next sequence number:

```
server/migrations/002_add_posts.sql
```

2. Write your SQL:

```sql
CREATE TABLE IF NOT EXISTS posts (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  body       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. Run `npm run migrate` (or `docker compose exec app node server/migrate.js`).

### Notes

- Migrations are **forward-only** — there is no rollback mechanism. If you need to undo something, write a new migration that reverses the change.
- Always use `IF NOT EXISTS` / `IF EXISTS` guards so migrations are safe to re-run if the tracking table is ever lost.
- The runner calls `db.pool.end()` after completing, so it exits cleanly.
