# Real Analytics Tracker (RAT) API Documentation

## Overview

RAT provides a RESTful API for managing analytics data, users, and projects. All API endpoints return JSON responses.

## Authentication

Most endpoints require authentication. Include session cookies from login.

### Login

```http
POST /login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}
```

Response:

```json
{
  "success": true
}
```

### Logout

```http
POST /logout
```

Response:

```json
{
  "success": true
}
```

## Analytics Endpoints

### Track Page View

Public endpoint. Requires either `projectId` (in body) or `X-API-Key` (header or `apiKey` in body).

```http
POST /track
Content-Type: application/json
X-API-Key: optional-project-api-key

{
  "projectId": 1,
  "url": "https://example.com/page",
  "referrer": "https://google.com",
  "userAgent": "Mozilla/5.0...",
  "sessionId": "32-hex-lowercase-optional",
  "event": "pageview",
  "eventTarget": "optional-target-string",
  "eventData": "optional-string-or-json-serialized-object",
  "apiKey": "optional-alternative-to-header-legacy"
}
```

- **projectId**: Required if no API key. Integer project ID.
- **url**: Required. Page URL.
- **sessionId**: Optional. Must be exactly 32 hexadecimal characters (lowercase) when present; invalid values are ignored (stored as null). The snippet generates and persists one per project via `localStorage` unless `window.ratAnalyticsDisableStorage` is true.
- **event**: Optional. Defaults to `pageview` when omitted or empty. Used for custom events, `click` (from `data-rat-track`), etc.
- **eventTarget**: Optional. Short string (e.g. click target id from `data-rat-track`).
- **eventData**: Optional. Opaque string; objects should be JSON-stringified on the client.
- **X-API-Key** or **apiKey**: Optional. When provided, identifies the project; `projectId` can be omitted. The hosted snippet sends **X-API-Key** only (not the secret in the JSON body).

Response:

```json
{
  "success": true,
  "message": "Analytics data recorded",
  "id": 123
}
```

### Get Project Statistics

```http
GET /api/stats/1
Authorization: Required
```

Response:

```json
[
  {
    "total_views": 150,
    "unique_pages": 12,
    "url": "https://example.com/home",
    "views_per_page": 45
  }
]
```

## Project Management

### List Projects

```http
GET /api/projects
Authorization: Required
```

Response:

```json
[
  {
    "id": 1,
    "name": "My Website",
    "owner_id": 1,
    "created_at": "2024-03-17T10:00:00.000Z"
  }
]
```

### Create Project

```http
POST /api/projects
Authorization: Required
Content-Type: application/json

{
  "name": "New Project"
}
```

Response:

```json
{
  "success": true,
  "message": "Project created successfully",
  "project": {
    "id": 2,
    "name": "New Project",
    "owner_id": 1,
    "api_key": "hex-string-for-tracking"
  }
}
```

Each project has an `api_key` for use with the `/track` endpoint (header or body).

### Share Project

```http
POST /api/projects/1/share
Authorization: Required
Content-Type: application/json

{
  "userId": 2,
  "permission": "view"
}
```

Response:

```json
{
  "success": true
}
```

## User Management (Admin Only)

### List Users

```http
GET /api/users
Authorization: Admin Required
```

Response:

```json
[
  {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "created_at": "2024-03-17T09:00:00.000Z"
  }
]
```

### Create User

```http
POST /api/users
Authorization: Admin Required
Content-Type: application/json

{
  "username": "newuser",
  "password": "securepassword",
  "role": "viewer"
}
```

Response:

```json
{
  "id": 2,
  "username": "newuser",
  "role": "viewer"
}
```

### Change Password

```http
PUT /api/users/1/password
Authorization: Required
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

Response:

```json
{
  "success": true
}
```

## Error Responses

All endpoints may return error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

- **`/track`**: 10 requests per minute per IP
- **`/api/*`**: 100 requests per 15 minutes per IP

## Data Types

- **projectId**: Integer - Unique project identifier
- **userId**: Integer - Unique user identifier
- **url**: String - Page URL (required)
- **referrer**: String - Referring URL (optional)
- **userAgent**: String - Browser user agent (optional)
- **permissions**: String - "view" or "admin"

## Client Integration

**Snippet only.** RAT supports integration via the JavaScript snippet only. No official npm package or SDK is provided. The snippet is served at `/snippet/analytics.js` and supports:

- **window.ratAnalyticsProjectId** – Project ID (required unless set via meta tags)
- **window.ratAnalyticsEndpoint** – Custom track URL (e.g. `https://your-server.com/track`) when the script is hosted statically; otherwise `/snippet/analytics.js` injects your server’s `/track` URL.
- **window.ratAnalyticsApiKey** – Project API key; when set, sends `X-API-Key` on every `/track` request.
- **window.ratAnalyticsDisableStorage** – If true, the snippet does not read or write `localStorage` (no `sessionId` sent).
- **window.ratDebug** – If true, logs each payload and fetch errors to the console.
- **`ratTrack(eventName, eventTarget?, eventData?)`** – Global function for custom events; same transport as automatic page views.
- **`data-rat-track`** – Attribute on clickable elements; a capture-phase listener sends `event: "click"` with the attribute value as `eventTarget` (and optional short label text in `eventData`).
