# FastForward

A ready-to-go Node.js boilerplate with Preact, Hapi.js, Postgres, and built-in auth. Styled with Tailwind CSS v4, containerized with Docker.

## Tech Stack

Vite + Preact | Tailwind CSS v4 | Hapi.js | PostgreSQL | Docker

## Quick Start

```bash
git clone <your-repo-url> my-app && cd my-app
npm install
cp .env.example .env

# Start Postgres, run migrations, start dev
docker compose up postgres -d
npm run migrate
npm run dev
```

Open `http://localhost:5173`.

## Docker

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec app node server/migrate.js
```

## Documentation

Full docs are in the [`docs/`](docs/) directory and published via GitHub Pages.

- [Getting Started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Authentication](docs/auth.md)
- [Configuration](docs/configuration.md)
- [Database](docs/database.md)
- [Frontend](docs/frontend.md)
- [Deployment](docs/deployment.md)

## License

Apache 2.0 — see [LICENSE](LICENSE).
