---
title: API Reference
layout: default
nav_order: 4
---

# API Reference

All endpoints are prefixed with `/api`. Requests with a JSON body should set `Content-Type: application/json`. Auth is handled via an `httpOnly` cookie set by the server — no `Authorization` header needed.

---

## Health

### `GET /api/health`

No auth required.

**Response `200`**

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

---

## Auth — Password

These endpoints are available when `AUTH_PASSWORD_ENABLED` is `true` (default).

### `POST /api/auth/register`

Create a new account with a password.

**Request body**

| Field | Type | Rules |
|-------|------|-------|
| `username` | string | Alphanumeric, 3–30 chars, required |
| `email` | string | Valid email, required |
| `password` | string | 8–128 chars, required |

**Response `201`**

```json
{
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "created_at": "2025-01-15T12:00:00.000Z"
  }
}
```

Sets a `token` cookie.

**Errors**

| Status | Message |
|--------|---------|
| 403 | Password registration is disabled |
| 409 | Username or email already taken |

---

### `POST /api/auth/login`

Login with username (or email) and password.

**Request body**

| Field | Type | Rules |
|-------|------|-------|
| `username` | string | Username or email address, required |
| `password` | string | Required |

**Response `200`**

```json
{
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "created_at": "2025-01-15T12:00:00.000Z"
  }
}
```

Sets a `token` cookie.

**Errors**

| Status | Message |
|--------|---------|
| 403 | Password login is disabled |
| 401 | Invalid credentials |

---

## Auth — Email Code

These endpoints are available when `AUTH_EMAIL_CODE_ENABLED` is `true` (default).

### `POST /api/auth/send-code`

Send a 6-digit login code to an email address. Invalidates any previous unused codes for that email.

**Request body**

| Field | Type | Rules |
|-------|------|-------|
| `email` | string | Valid email, required |

**Response `200`**

```json
{
  "sent": true
}
```

Always returns success, even if no user exists with that email. This prevents email enumeration.

**Errors**

| Status | Message |
|--------|---------|
| 403 | Email code login is disabled |

---

### `POST /api/auth/verify-code`

Verify an email code and login. If no account exists for the email, a `username` must be provided to create one.

**Request body**

| Field | Type | Rules |
|-------|------|-------|
| `email` | string | Valid email, required |
| `code` | string | Exactly 6 chars, required |
| `username` | string | Alphanumeric, 3–30 chars, optional (required if account doesn't exist) |

**Response `200`**

```json
{
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "created_at": "2025-01-15T12:00:00.000Z"
  }
}
```

Sets a `token` cookie.

**Errors**

| Status | Message |
|--------|---------|
| 403 | Email code login is disabled |
| 401 | Invalid or expired code |
| 400 | Username is required for new accounts |
| 409 | Username already taken |

---

## Auth — Shared

### `POST /api/auth/logout`

Clear the auth cookie. No auth required (idempotent).

**Response `200`**

```json
{
  "success": true
}
```

---

### `GET /api/auth/me`

Get the currently authenticated user. **Requires auth.**

**Response `200`**

```json
{
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "created_at": "2025-01-15T12:00:00.000Z"
  }
}
```

**Errors**

| Status | Message |
|--------|---------|
| 401 | Authentication required / Invalid or expired token / User not found |

---

## Error Format

All errors follow the [Boom](https://hapi.dev/module/boom/) format:

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid credentials"
}
```

## Adding New Endpoints

Add routes to `server/routes/api.js` (or create a new file and register it in `server/index.js`).

- **Unprotected**: set `options: { auth: false }`
- **Protected**: set `options: { auth: 'session' }` — the user is available at `request.auth.credentials`

```js
{
  method: 'GET',
  path: '/api/secret',
  options: { auth: 'session' },
  handler: (request) => {
    return { message: `Hello, ${request.auth.credentials.username}` };
  },
}
```

See [Hapi route options](https://hapi.dev/api/#-serverrouteroute) and [Joi validation](https://joi.dev/api/) for request validation.
