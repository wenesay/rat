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

```http
POST /track
Content-Type: application/json

{
  "projectId": 1,
  "url": "https://example.com/page",
  "referrer": "https://google.com",
  "userAgent": "Mozilla/5.0..."
}
```

Response:
```json
{
  "success": true
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
  "id": 2,
  "name": "New Project",
  "owner_id": 1
}
```

### Share Project

```http
POST /api/projects/1/share
Authorization: Required
Content-Type: application/json

{
  "userId": 2,
  "permissions": "view"
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

Currently no rate limiting is implemented. Consider adding rate limiting for production deployments.

## Data Types

- **projectId**: Integer - Unique project identifier
- **userId**: Integer - Unique user identifier
- **url**: String - Page URL (required)
- **referrer**: String - Referring URL (optional)
- **userAgent**: String - Browser user agent (optional)
- **permissions**: String - "view" or "admin"

## SDKs and Libraries

Currently, no official SDKs are available. The API is RESTful and can be used with any HTTP client.