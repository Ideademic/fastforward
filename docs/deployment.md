---
title: Deployment
layout: default
nav_order: 9
---

# Deployment

## Dockerfile

The included Dockerfile uses a multi-stage build:

1. **Build stage** — installs all dependencies, runs `vite build` to produce the `dist/` directory.
2. **Production stage** — installs production dependencies only, copies the built frontend and server code.

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "server/index.js"]
```

In production mode (`NODE_ENV=production`), Hapi:

- Serves the built frontend from `dist/` via `@hapi/inert`
- Returns `dist/index.html` for any non-API route that would 404 (SPA fallback)
- Sets `Secure` flag on auth cookies

## Docker Compose — Basic

Exposes ports directly. Good for development or single-server deployments.

```bash
cp .env.example .env
# Edit .env — at minimum, set a real JWT_SECRET

docker compose up --build -d
docker compose exec app node server/migrate.js
```

App is at `http://localhost:3001`. Postgres is at `localhost:5432`.

### `docker-compose.yml`

```yaml
services:
  app:
    build: .
    ports:
      - "3001:3001"
    env_file: .env
    environment:
      DATABASE_URL: postgres://fastforward:fastforward@postgres:5432/fastforward
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: fastforward
      POSTGRES_PASSWORD: fastforward
      POSTGRES_DB: fastforward
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fastforward"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

The `environment` block overrides `DATABASE_URL` from `.env` so the app container reaches Postgres by service name (`postgres`) instead of `localhost`.

## Docker Compose — Behind Nginx Proxy Manager

No ports are exposed to the host. Traffic routes through an external reverse proxy (e.g., Nginx Proxy Manager) on a shared Docker network.

### 1. Create the proxy network

If you don't already have one:

```bash
docker network create proxy
```

### 2. Use this `docker-compose.yml`

```yaml
services:
  app:
    build: .
    env_file: .env
    environment:
      DATABASE_URL: postgres://fastforward:fastforward@postgres:5432/fastforward
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - internal
      - proxy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: fastforward
      POSTGRES_PASSWORD: fastforward
      POSTGRES_DB: fastforward
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fastforward"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - internal
    restart: unless-stopped

volumes:
  pgdata:

networks:
  internal:
  proxy:
    external: true
```

Key differences from the basic setup:

- **No `ports`** on either service — nothing is exposed to the host.
- **`internal` network** — a project-private network for app-to-Postgres communication. Only these two services can see each other on it.
- **`proxy` network** — the shared external network your reverse proxy is on. Only the `app` service joins it.
- **Postgres is isolated** — it's only on `internal`, unreachable from the proxy network or the host.

### 3. Configure Nginx Proxy Manager

Create a proxy host:

| Field | Value |
|-------|-------|
| Domain | `your-app.example.com` |
| Scheme | `http` |
| Forward Hostname | `app` |
| Forward Port | `3001` |

The hostname `app` resolves because Nginx Proxy Manager and the app service are both on the `proxy` network.

Enable SSL via Let's Encrypt in the SSL tab if desired. When using SSL, make sure `NODE_ENV=production` is set in `.env` so the auth cookie gets the `Secure` flag.

### Running Migrations

In all Docker setups, run migrations inside the app container:

```bash
docker compose exec app node server/migrate.js
```

Do **not** run `npm run migrate` from the host — the host can't reach Postgres when ports aren't exposed.

## Production Checklist

- [ ] Set `JWT_SECRET` to a long random string
- [ ] Set `NODE_ENV=production`
- [ ] Configure real SMTP credentials for email code auth (or disable it)
- [ ] Set up SSL (via reverse proxy or a TLS-terminating load balancer)
- [ ] Back up the `pgdata` volume
- [ ] Consider adding rate limiting to auth endpoints (see [Authentication — Extending Auth](auth#extending-auth))
