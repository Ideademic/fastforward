---
title: Authentication
layout: default
nav_order: 5
---

# Authentication

FastForward ships with two auth strategies that can run simultaneously or independently.

## Overview

| Strategy | Env Toggle | How It Works |
|----------|-----------|--------------|
| Password | `AUTH_PASSWORD_ENABLED` | User registers with username + email + password. Logs in with username/email + password. |
| Email Code | `AUTH_EMAIL_CODE_ENABLED` | User enters email, receives a 6-digit code, submits it. Creates an account automatically if one doesn't exist. |

Both are enabled by default. Set either to `false` in `.env` to disable it.

## How Tokens Work

1. On successful login or registration, the server generates a JWT containing `{ id, username, email }`.
2. The JWT is set as an `httpOnly` cookie named `token`.
3. On each request, the custom Hapi auth scheme (`server/auth/strategy.js`) reads the cookie and verifies the JWT.
4. If valid, `request.auth.credentials` is populated with the decoded token payload.

### Cookie Settings

| Property | Development | Production |
|----------|-------------|------------|
| `httpOnly` | `true` | `true` |
| `secure` | `false` | `true` |
| `sameSite` | `Lax` | `Lax` |
| `path` | `/` | `/` |
| `ttl` | 7 days | 7 days |

The JWT expiry is separate from the cookie TTL and is configured via `JWT_EXPIRY` (default `7d`).

## Password Auth

### Security Details

- Passwords are hashed with **bcrypt** at cost factor **12**.
- Minimum password length is **8 characters**, maximum **128**.
- Login accepts either username or email in the `username` field.
- Failed logins return a generic "Invalid credentials" message — the response does not reveal whether the username exists or the password was wrong.

### Flow

```
POST /api/auth/register  { username, email, password }
  → Creates user, hashes password, returns JWT cookie

POST /api/auth/login  { username, password }
  → Verifies password, returns JWT cookie
```

## Email Code Auth

### Security Details

- Codes are **6-digit numeric** strings generated with `crypto.randomInt()`.
- Codes expire after **10 minutes**.
- Codes are **single-use** — marked as used immediately upon verification.
- Requesting a new code **invalidates** all previous unused codes for that email.
- `POST /api/auth/send-code` always returns `{ sent: true }` regardless of whether the email exists, preventing enumeration.

### Flow — Existing User

```
POST /api/auth/send-code  { email }
  → Sends 6-digit code to email

POST /api/auth/verify-code  { email, code }
  → Verifies code, returns JWT cookie
```

### Flow — New User

```
POST /api/auth/send-code  { email }
  → Sends 6-digit code to email

POST /api/auth/verify-code  { email, code }
  → Returns 400 "Username is required for new accounts"

POST /api/auth/verify-code  { email, code, username }
  → Creates account, returns JWT cookie
```

The frontend handles this automatically — if the server responds with "Username is required", it shows a username field and resubmits.

## Protecting Routes

In Hapi route options:

```js
// Protected — requires valid JWT cookie
options: { auth: 'session' }

// Unprotected — no auth needed
options: { auth: false }
```

There is no default auth strategy set globally, so every route must explicitly declare its auth setting.

## Frontend Auth Hook

The `useAuth()` hook (`client/lib/auth.jsx`) provides:

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `user` | `object \| null` | Current user, or `null` if not logged in |
| `loading` | `boolean` | `true` while the initial `/api/auth/me` check is in flight |
| `login(credentials)` | `async function` | Call `POST /api/auth/login` |
| `register(credentials)` | `async function` | Call `POST /api/auth/register` |
| `sendCode(email)` | `async function` | Call `POST /api/auth/send-code` |
| `verifyCode(email, code, username?)` | `async function` | Call `POST /api/auth/verify-code` |
| `logout()` | `async function` | Call `POST /api/auth/logout`, clear user state |

All methods that authenticate the user (`login`, `register`, `verifyCode`) update the `user` state automatically on success.

## Extending Auth

Common things you might add:

- **Password reset** — add a `password_reset_tokens` table, a `POST /api/auth/forgot-password` route to send a reset link, and a `POST /api/auth/reset-password` route to set a new password.
- **Rate limiting** — add a Hapi plugin or middleware to limit attempts on `/api/auth/login`, `/api/auth/send-code`, and `/api/auth/verify-code`.
- **Refresh tokens** — replace the single JWT with a short-lived access token + long-lived refresh token pair.
- **OAuth** — add [bell](https://hapi.dev/module/bell/) for third-party providers (Google, GitHub, etc.).
