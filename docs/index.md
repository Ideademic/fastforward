---
title: Home
layout: default
nav_order: 1
---

<p align="center">
  <img src="assets/logo.svg" alt="FastForward" width="96" height="96" />
</p>

# FastForward
{: .text-center }

A ready-to-go Node.js boilerplate with **Preact**, **Hapi.js**, **Postgres**, and a built-in dual-mode auth system. Styled with **Tailwind CSS v4** and containerized with **Docker**.

## What's Included

- **Frontend** — Vite + Preact with Tailwind CSS v4 (Vite plugin). Includes client-side routing, auth context, and example pages.
- **Backend** — Hapi.js server with Joi validation, JWT cookie auth, and a clean route structure.
- **Auth** — Password, email code, and OAuth (Google, GitHub, Microsoft) authentication. Password reset. Account deletion. CSRF protection and rate limiting built-in.
- **File Uploads** — Upload, serve, and delete files with per-user ownership.
- **WebSocket** — Real-time pub/sub via @hapi/nes with example broadcast endpoint.
- **Testing** — Test suite using @hapi/lab and @hapi/code.
- **Database** — PostgreSQL with a simple SQL migration runner.
- **Docker** — Multi-stage Dockerfile and Compose config. Works standalone or behind a reverse proxy.

## Pages

| Page | Description |
|------|-------------|
| [Getting Started](getting-started) | Install, configure, and run the app |
| [Architecture](architecture) | Project structure and how the pieces fit together |
| [API Reference](api) | Every backend endpoint, with request/response examples |
| [Authentication](auth) | How the auth system works, how to configure or extend it |
| [Configuration](configuration) | All environment variables and what they control |
| [Database](database) | Schema, migrations, and how to add new tables |
| [Frontend](frontend) | Preact components, routing, auth hook, and styling |
| [Deployment](deployment) | Docker, Docker Compose, and reverse proxy setup |
