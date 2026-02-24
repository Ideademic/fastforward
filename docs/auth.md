---
title: Authentication
layout: default
nav_order: 5
---

# Authentication

FastForward ships with multiple auth strategies that can run simultaneously or independently.

## Overview

| Strategy | Env Toggle | How It Works |
|----------|-----------|--------------|
| Password | `AUTH_PASSWORD_ENABLED` | User registers with username + password (email optional when `AUTH_PASSWORD_REQUIRE_EMAIL=false`). Logs in with username/email + password. |
| Email Code | `AUTH_EMAIL_CODE_ENABLED` | User enters email, receives a 6-digit code, submits it. Creates an account automatically if one doesn't exist. |
| Google OAuth | `OAUTH_GOOGLE_ENABLED` | User clicks "Sign in with Google". Redirected to Google consent screen, then back to the app. |
| GitHub OAuth | `OAUTH_GITHUB_ENABLED` | User clicks "Sign in with GitHub". Redirected to GitHub authorization, then back to the app. |
| Microsoft OAuth | `OAUTH_MICROSOFT_ENABLED` | User clicks "Sign in with Microsoft". Redirected to Microsoft login, then back to the app. |

Password and Email Code are enabled by default. OAuth providers are each independently disabled by default — set any to `true` in `.env` to enable it.

## Auth Providers Endpoint

The frontend can discover which auth methods are currently enabled by calling:

```
GET /api/auth/providers
```

Returns:

```json
{
  "password": true,
  "emailCode": true,
  "passwordRequireEmail": true,
  "google": false,
  "github": false,
  "microsoft": false
}
```

Use this to conditionally render login buttons and forms in the UI.

## How Tokens Work

1. On successful login or registration, the server generates a JWT containing `{ id, username, email, display_name }`.
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

### Optional Email

By default, email is required during password registration. Set `AUTH_PASSWORD_REQUIRE_EMAIL=false` to allow users to register with just a username and password. Users without an email address cannot use password reset or email code auth.

### Flow

```
POST /api/auth/register  { username, email, password, display_name }
  → Creates user, hashes password, returns JWT cookie
  → email and display_name are optional when AUTH_PASSWORD_REQUIRE_EMAIL=false

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

## OAuth

FastForward supports third-party OAuth login via **@hapi/bell** for three providers: Google, GitHub, and Microsoft. Each provider is independently toggleable through its own environment variable:

| Provider | Env Toggle | Client ID Env | Client Secret Env |
|----------|-----------|---------------|-------------------|
| Google | `OAUTH_GOOGLE_ENABLED` | `OAUTH_GOOGLE_CLIENT_ID` | `OAUTH_GOOGLE_CLIENT_SECRET` |
| GitHub | `OAUTH_GITHUB_ENABLED` | `OAUTH_GITHUB_CLIENT_ID` | `OAUTH_GITHUB_CLIENT_SECRET` |
| Microsoft | `OAUTH_MICROSOFT_ENABLED` | `OAUTH_MICROSOFT_CLIENT_ID` | `OAUTH_MICROSOFT_CLIENT_SECRET` |

### Flow

1. User clicks an OAuth sign-in button in the frontend.
2. The browser navigates to `/api/auth/{provider}` (e.g. `/api/auth/google`).
3. @hapi/bell redirects the user to the provider's consent/authorization screen.
4. After the user authorizes, the provider redirects back to the app's callback URL.
5. The callback handler receives the user's profile from the provider. It either:
   - **Links** the OAuth identity to an existing user (matched by email), or
   - **Creates** a new user account from the OAuth profile.
6. A JWT cookie is set and the user is redirected to `/dashboard`.

### Security Details

- OAuth state parameters are managed by @hapi/bell to prevent CSRF during the OAuth flow.
- If an account already exists with the same email address, the OAuth identity is linked to that existing account rather than creating a duplicate.

## Password Reset

### Flow

```
POST /api/auth/forgot-password  { email }
  → Generates a reset token, emails a reset link to the user
  → Always returns { sent: true } regardless of whether the email exists (prevents enumeration)

POST /api/auth/reset-password  { token, password }
  → Validates the token, hashes the new password, updates the user record
```

### Security Details

- Reset tokens expire after **1 hour**.
- Tokens are **single-use** — consumed immediately when the password is reset.
- `POST /api/auth/forgot-password` always returns `{ sent: true }` even if no account matches the email, preventing user enumeration.
- The new password must meet the same validation rules as registration (8-128 characters).

## CSRF Protection

FastForward uses **@hapi/crumb** for CSRF protection with the `restful: true` option, which is designed for single-page applications that make API calls.

### How It Works

1. The server sets a cookie named `crumb` on responses.
2. The `crumb` cookie is **not** `httpOnly`, so client-side JavaScript can read its value.
3. For any **POST**, **PUT**, or **DELETE** request, the frontend reads the `crumb` cookie and sends its value in the `x-csrf-token` request header.
4. @hapi/crumb validates that the header value matches the cookie. If it does not match (or is missing), the request is rejected with a `403 Forbidden`.

### Excluded Paths

CSRF validation is **skipped** for:

- **OAuth callback routes** — these are redirects from external providers and cannot include a CSRF header.
- **WebSocket paths** — WebSocket upgrade requests do not support custom headers in the same way.

### Configuration

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `CSRF_ENABLED` | `true` | Set to `false` to disable CSRF protection entirely (useful for testing or API-only deployments). |

## Rate Limiting

FastForward includes a built-in in-memory rate limiter plugin that protects auth-related routes from brute-force and abuse.

### Which Routes Are Rate-Limited

Rate limiting applies to any route tagged with `'rate-limit'`. The following auth routes are tagged by default:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/send-code`
- `POST /api/auth/verify-code`
- `POST /api/auth/forgot-password`

### Configuration

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 minutes) | The time window in milliseconds for tracking attempts. |
| `RATE_LIMIT_MAX_ATTEMPTS` | `15` | Maximum number of requests allowed per IP within the window. |

### Behavior

- When a client exceeds the limit, the server responds with **429 Too Many Requests** and includes a `Retry-After` header indicating how many seconds the client must wait.
- Every response to a rate-limited route includes the following headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | The maximum number of requests allowed in the window. |
| `X-RateLimit-Remaining` | The number of requests remaining in the current window. |
| `X-RateLimit-Reset` | The Unix timestamp (in seconds) when the window resets. |

## Account Deletion

Authenticated users can permanently delete their account:

```
DELETE /api/auth/account
```

This route requires authentication (`auth: 'session'`).

### What Happens

1. All files uploaded by the user are **deleted from disk**.
2. The user's database row is **deleted**, which **cascades** to all related tables (uploaded file records, OAuth identities, email codes, password reset tokens, etc.).
3. The auth cookie is **unset**, logging the user out.

The response returns a confirmation, and the frontend should redirect the user to the home or login page.

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
| `deleteAccount()` | `async function` | Call `DELETE /api/auth/account`, clear user state |

All methods that authenticate the user (`login`, `register`, `verifyCode`) update the `user` state automatically on success.

## Extending Auth

The built-in auth system covers password login, email code login, OAuth (Google, GitHub, Microsoft), password reset, rate limiting, CSRF protection, and account deletion. Common things you might still add:

- **Refresh tokens** — replace the single JWT with a short-lived access token + long-lived refresh token pair.
- **Additional OAuth providers** — add more @hapi/bell strategies (e.g. Apple, Facebook, Twitter) following the same pattern as the existing providers.
- **Two-factor authentication (2FA)** — add TOTP-based second factor using a library like `otpauth`.
- **Role-based access control** — extend the JWT payload with roles and add route-level authorization checks.
- **Persistent rate limiting** — replace the in-memory rate limiter with a Redis-backed store for multi-process or multi-server deployments.
