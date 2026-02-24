---
title: API Reference
layout: default
nav_order: 4
---

# API Reference

All endpoints are prefixed with `/api`. Requests with a JSON body should set `Content-Type: application/json`. Auth is handled via an `httpOnly` cookie set by the server — no `Authorization` header needed.

---

## CSRF Protection

All `POST`, `PUT`, and `DELETE` requests must include the `x-csrf-token` header. The value must match the `crumb` cookie set by the server. Requests that omit or provide an incorrect token receive a `403` response.

`GET` requests and OAuth callback routes are exempt from CSRF validation.

---

## Rate Limiting

Routes tagged with `rate-limit` return `429 Too Many Requests` after too many attempts within the configured window. The following headers are included in the response:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum number of requests allowed in the window |
| `X-RateLimit-Remaining` | Number of requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp (seconds) when the window resets |
| `Retry-After` | Seconds until the client should retry (present on `429` responses) |

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
| `email` | string | Valid email, required by default (optional when `AUTH_PASSWORD_REQUIRE_EMAIL=false`) |
| `password` | string | 8–128 chars, required |
| `display_name` | string | Max 255 chars, optional |

**Response `201`**

```json
{
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "display_name": "Alice Smith",
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
    "display_name": "Alice Smith",
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

## Auth — Password Reset

### `POST /api/auth/forgot-password`

Request a password reset email. Always returns success to prevent email enumeration. Tagged with `rate-limit`.

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

---

### `POST /api/auth/reset-password`

Reset a password using a token received via email.

**Request body**

| Field | Type | Rules |
|-------|------|-------|
| `token` | string | Reset token from the email link, required |
| `password` | string | 8–128 chars, required |

**Response `200`**

```json
{
  "success": true
}
```

**Errors**

| Status | Message |
|--------|---------|
| 400 | Invalid or expired reset token |

---

## Auth — OAuth

### `GET /api/auth/oauth/{provider}`

Initiate an OAuth login flow. The `{provider}` path parameter must be one of `google`, `github`, or `microsoft`.

No auth required. The server redirects the browser to the OAuth provider's consent screen. After the user authorizes (or denies), the provider redirects back to the server's callback URL.

**On success** — redirects to `/dashboard` and sets a `token` cookie.

**On failure** — redirects to `/login?error=...` with a human-readable error message in the query string.

---

## Auth — Providers

### `GET /api/auth/providers`

Returns which authentication methods are currently enabled on the server. No auth required.

**Response `200`**

```json
{
  "password": true,
  "emailCode": true,
  "passwordRequireEmail": true,
  "google": false,
  "github": true,
  "microsoft": false
}
```

---

## Auth — Account Deletion

### `DELETE /api/auth/account`

Permanently delete the authenticated user's account. **Requires auth.**

**Response `200`**

```json
{
  "deleted": true
}
```

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
    "display_name": "Alice Smith",
    "created_at": "2025-01-15T12:00:00.000Z"
  }
}
```

**Errors**

| Status | Message |
|--------|---------|
| 401 | Authentication required / Invalid or expired token / User not found |

---

## File Uploads

### `POST /api/uploads`

Upload a file. **Requires auth.** The request must use `multipart/form-data` encoding with a field named `file`. The maximum file size is configurable on the server.

**Response `201`**

```json
{
  "id": "a1b2c3d4",
  "filename": "a1b2c3d4-photo.png",
  "original_name": "photo.png",
  "mime_type": "image/png",
  "size": 204800,
  "created_at": "2025-01-15T12:00:00.000Z"
}
```

---

### `GET /api/uploads/{id}`

Retrieve an uploaded file by its ID. No auth required. Returns the raw file bytes with the appropriate `Content-Type` header.

**Errors**

| Status | Message |
|--------|---------|
| 404 | Not found |

---

### `DELETE /api/uploads/{id}`

Delete an uploaded file. **Requires auth.** Only the original uploader may delete the file.

**Response `200`**

```json
{
  "deleted": true
}
```

**Errors**

| Status | Message |
|--------|---------|
| 403 | Forbidden (not the file owner) |
| 404 | Not found |

---

## Broadcast (WebSocket)

### `POST /api/broadcast`

Publish a message to all connected WebSocket subscribers. **Requires auth.** Clients subscribed to the `/notifications` WebSocket path will receive the message in real time.

**Request body**

| Field | Type | Rules |
|-------|------|-------|
| `message` | string | Required |

**Response `200`**

```json
{
  "from": "alice",
  "message": "Hello everyone!",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

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
