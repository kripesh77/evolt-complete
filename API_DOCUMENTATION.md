# EV Charging Station API Documentation

**Version:** 4.0.0  
**Base URL:** `https://0s2djcq5-3000.inc1.devtunnels.ms/api/v1`  
**WebSocket URL:** `https://0s2djcq5-3000.inc1.devtunnels.ms`  
**Last Updated:** March 1, 2026

---

## Table of Contents

1. [Health Check](#health-check)
2. [Authentication](#authentication)
3. [User Profile & Account](#user-profile--account)
4. [Vehicle Profiles](#vehicle-profiles)
5. [Favorite Stations](#favorite-stations)
6. [Stations](#stations)
7. [Recommendations](#recommendations)
8. [Admin Routes](#admin-routes)
9. [WebSocket Events](#websocket-events)
10. [Error Handling](#error-handling)

---

## Health Check

### `GET /health`

Check if the API server is running.

**Auth Required:** No

**Response:**

```json
{
  "status": "success",
  "message": "EV Charging Station API is running",
  "timestamp": "2026-03-01T12:00:00.000Z"
}
```

---

## Authentication

### `POST /api/v1/auth/register`

Register a new user account.

**Auth Required:** No (optional auth for admin creating admin accounts)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | User's name (2-100 chars) |
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Min 8 characters |
| `role` | string | No | `"user"` (default), `"operator"` |
| `company` | string | Conditional | Required if role is `"operator"` |
| `phone` | string | No | Phone number |

**Response (201):**

```json
{
  "status": "success",
  "token": "eyJhbGciOi...",
  "data": {
    "user": {
      "_id": "665a...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "vehicleProfiles": [],
      "favoriteStations": [],
      "createdAt": "2026-03-01T12:00:00.000Z",
      "updatedAt": "2026-03-01T12:00:00.000Z"
    }
  }
}
```

**Error Responses:**

- `400` - Missing required fields / Password too short
- `403` - Admin accounts can only be created by existing admins
- `409` - Email already registered

---

### `POST /api/v1/auth/login`

Authenticate a user and receive a JWT token.

**Auth Required:** No

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Registered email |
| `password` | string | Yes | User password |

**Response (200):**

```json
{
  "status": "success",
  "token": "eyJhbGciOi...",
  "data": {
    "user": {
      "_id": "665a...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "vehicleProfiles": [...],
      "favoriteStations": [...]
    }
  }
}
```

**Error Responses:**

- `400` - Email and password are required
- `401` - Invalid email or password
- `403` - Account is deactivated

---

## User Profile & Account

### `GET /api/v1/auth/me`

Get the currently authenticated user's profile.

**Auth Required:** Yes (Bearer token)

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "665a...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "vehicleProfiles": [...],
      "favoriteStations": [...]
    }
  }
}
```

---

### `PATCH /api/v1/auth/me`

Update the authenticated user's profile.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Updated name |
| `email` | string | No | Updated email |
| `phone` | string | No | Updated phone |
| `company` | string | No | Updated company (operators) |

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": { ... }
  }
}
```

---

### `PATCH /api/v1/auth/password`

Change the authenticated user's password.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `currentPassword` | string | Yes | Current password |
| `newPassword` | string | Yes | New password (min 8 chars) |
| `newPasswordConfirm` | string | Yes | Must match `newPassword` |

**Response (200):**

```json
{
  "status": "success",
  "token": "eyJhbGciOi...",
  "data": {
    "user": { ... }
  }
}
```

---

## Vehicle Profiles

### `POST /api/v1/auth/vehicle-profiles`

Add a vehicle profile to the authenticated user's account.

**Auth Required:** Yes

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Vehicle nickname (e.g., "My Tesla") |
| `vehicleType` | string | Yes | `"bike"` or `"car"` |
| `batteryCapacity_kWh` | number | Yes | Battery capacity (0.5-200 kWh) |
| `efficiency_kWh_per_km` | number | Yes | Energy per km (0.01-1 kWh/km) |
| `batteryPercent` | number | No | Current battery (0-100, default 100) |
| `compatibleConnectors` | string[] | Yes | Array of: `"AC_SLOW"`, `"Type2"`, `"CCS"`, `"CHAdeMO"` |

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": {
      ...
      "vehicleProfiles": [
        {
          "_id": "abc123...",
          "name": "My Tesla",
          "vehicleType": "car",
          "batteryCapacity_kWh": 60,
          "efficiency_kWh_per_km": 0.15,
          "batteryPercent": 80,
          "compatibleConnectors": ["Type2", "CCS"]
        }
      ]
    }
  }
}
```

---

### `DELETE /api/v1/auth/vehicle-profiles/:profileId`

Remove a vehicle profile from the authenticated user's account.

**Auth Required:** Yes

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `profileId` | string | MongoDB ObjectId of the vehicle profile |

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": { ... }
  }
}
```

---

## Favorite Stations

### `POST /api/v1/auth/favorites/:stationId`

Add a station to the user's favorites.

**Auth Required:** Yes

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `stationId` | string | MongoDB ObjectId of the station |

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": { ... }
  }
}
```

---

### `DELETE /api/v1/auth/favorites/:stationId`

Remove a station from the user's favorites.

**Auth Required:** Yes

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `stationId` | string | MongoDB ObjectId of the station |

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": { ... }
  }
}
```

---

## Stations

### `GET /api/v1/stations`

List all stations with optional filters and pagination.

**Auth Required:** No

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by `"active"` or `"inactive"` |
| `vehicleType` | string | - | Filter by `"bike"` or `"car"` |
| `connector` | string | - | Filter by connector type |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Results per page |

**Response (200):**

```json
{
  "status": "success",
  "results": 10,
  "total": 50,
  "page": 1,
  "pages": 5,
  "data": {
    "stations": [
      {
        "_id": "665a...",
        "name": "Green Energy Hub",
        "operatorId": "665b...",
        "location": {
          "type": "Point",
          "coordinates": [77.209, 28.6139]
        },
        "address": "123 Main Street, New Delhi",
        "ports": [
          {
            "connectorType": "CCS",
            "vehicleType": "car",
            "powerKW": 50,
            "total": 4,
            "occupied": 1,
            "pricePerKWh": 12
          }
        ],
        "operatingHours": "24/7",
        "status": "active",
        "createdAt": "2026-01-15T10:00:00.000Z",
        "updatedAt": "2026-03-01T12:00:00.000Z"
      }
    ]
  }
}
```

---

### `GET /api/v1/stations/stats`

Get aggregate station statistics.

**Auth Required:** No

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "stats": {
      "totalStations": 50,
      "activeStations": 45,
      "totalPorts": 200,
      "availablePorts": 150
    }
  }
}
```

---

### `GET /api/v1/stations/:id`

Get a single station by ID.

**Auth Required:** No

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Station MongoDB ObjectId |

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "station": {
      "_id": "665a...",
      "name": "Green Energy Hub",
      "location": { "type": "Point", "coordinates": [77.209, 28.6139] },
      "address": "123 Main Street, New Delhi",
      "ports": [...],
      "operatingHours": "24/7",
      "status": "active"
    }
  }
}
```

**Error Responses:**

- `404` - Station not found
- `400` - Invalid ID format

---

### `GET /api/v1/stations/my-stations`

Get all stations owned by the authenticated operator.

**Auth Required:** Yes (operator or admin only)

**Response (200):**

```json
{
  "status": "success",
  "results": 5,
  "data": {
    "stations": [...]
  }
}
```

---

### `POST /api/v1/stations`

Create a new charging station.

**Auth Required:** Yes (operator or admin only)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Station name (max 100 chars) |
| `location` | object | Yes | `{ type: "Point", coordinates: [lng, lat] }` |
| `address` | string | Yes | Physical address |
| `ports` | array | Yes | Array of port objects (see below) |
| `operatingHours` | string | Yes | e.g., `"24/7"` or `"8AM-10PM"` |
| `status` | string | No | `"active"` (default) or `"inactive"` |

**Port Object:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `connectorType` | string | Yes | `"AC_SLOW"`, `"Type2"`, `"CCS"`, `"CHAdeMO"` |
| `vehicleType` | string | Yes | `"bike"` or `"car"` |
| `powerKW` | number | Yes | Power output (0.5-350 kW) |
| `total` | number | Yes | Total charging slots (min 1) |
| `pricePerKWh` | number | Yes | Price per kWh |

**Response (201):**

```json
{
  "status": "success",
  "data": {
    "station": { ... }
  }
}
```

---

### `PATCH /api/v1/stations/:id`

Update a station. Only the station owner or admin can update.

**Auth Required:** Yes (station owner or admin)

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "station": { ... }
  }
}
```

---

### `DELETE /api/v1/stations/:id`

Delete a station. Only the station owner or admin can delete.

**Auth Required:** Yes (station owner or admin)

**Response (204):** No content

---

### `POST /api/v1/stations/:id/ports`

Add a new port to an existing station.

**Auth Required:** Yes (station owner or admin)

**Request Body:** Same as port object above.

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "station": { ... }
  }
}
```

---

### `PATCH /api/v1/stations/:id/occupancy`

Update occupancy for a specific port type at a station.

**Auth Required:** Yes (station owner or admin)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `connectorType` | string | Yes | Which port type to update |
| `occupied` | number | Yes | New occupied count |

**Response (200):** Updated station. Also emits `station_occupancy_changed` WebSocket event.

---

### `PUT /api/v1/stations/:id/occupancy`

Bulk update all port occupancies for a station.

**Auth Required:** Yes (station owner or admin)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ports` | array | Yes | Array of `{ connectorType, occupied }` objects |

**Response (200):** Updated station. Also emits `station_occupancy_changed` WebSocket event for each updated port.

---

## Recommendations

### `GET /api/v1/recommendations/nearby`

Find charging stations near a location. **No authentication required.**

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `longitude` | number | Required | Longitude (-180 to 180) |
| `latitude` | number | Required | Latitude (-90 to 90) |
| `radius` | number | 10 | Search radius in km (max 100) |
| `vehicleType` | string | all | `"bike"` or `"car"` |

**Response (200):**

```json
{
  "status": "success",
  "results": 8,
  "data": {
    "stations": [
      {
        "_id": "665a...",
        "name": "Green Energy Hub",
        "location": {
          "type": "Point",
          "coordinates": [77.209, 28.6139]
        },
        "address": "123 Main Street, New Delhi",
        "ports": [...],
        "operatingHours": "24/7",
        "status": "active",
        "distance_km": 2.5
      }
    ],
    "meta": {
      "searchRadius": 10,
      "vehicleType": "all"
    }
  }
}
```

---

### `POST /api/v1/recommendations`

Get smart charging station recommendations based on vehicle profile and location.

**Auth Required:** No (vehicle profile must be provided in body)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `vehicleProfile` | object | Yes | Vehicle profile (see below) |
| `currentLocation` | object | Yes | `{ longitude: number, latitude: number }` |
| `preferences` | object | No | Scoring preferences |
| `limit` | number | No | Max results (default 10) |

**Vehicle Profile Object:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `vehicleType` | string | Yes | `"bike"` or `"car"` |
| `batteryCapacity_kWh` | number | Yes | Battery capacity |
| `efficiency_kWh_per_km` | number | Yes | Energy consumption per km |
| `batteryPercent` | number | Yes | Current battery level (0-100) |
| `compatibleConnectors` | string[] | Yes | Compatible connector types |

**Preferences Object (optional):**
| Field | Type | Description |
|-------|------|-------------|
| `preferredConnector` | string | Preferred connector type |
| `preferFastCharging` | boolean | Prefer fast charging stations |
| `weights` | object | Custom scoring weights |

**Scoring Weights Object (default values):**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `distance` | number | 0.25 | Distance importance |
| `availability` | number | 0.20 | Port availability importance |
| `waitTime` | number | 0.20 | Wait time importance |
| `power` | number | 0.20 | Charging power importance |
| `cost` | number | 0.15 | Cost importance |

**Response (200):**

```json
{
  "status": "success",
  "results": 5,
  "data": {
    "recommendations": [
      {
        "stationId": "665a...",
        "stationName": "Green Energy Hub",
        "address": "123 Main Street",
        "recommendedPort": "CCS",
        "powerKW": 50,
        "pricePerKWh": 12,
        "freeSlots": 3,
        "totalSlots": 4,
        "distance_km": 2.5,
        "estimatedChargingTime_min": 45,
        "estimatedCost": 180,
        "canReachWithCurrentCharge": true,
        "score": 87,
        "location": {
          "type": "Point",
          "coordinates": [77.209, 28.6139]
        }
      }
    ],
    "meta": {
      "vehicleType": "car",
      "batteryPercent": 30,
      "searchRadius": "calculated based on remaining range"
    }
  }
}
```

---

### `POST /api/v1/recommendations/emergency`

Emergency recommendation for low-battery situations. Prioritizes nearest available station.

**Auth Required:** No

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `vehicleProfile` | object | Yes | Same as recommendations endpoint |
| `currentLocation` | object | Yes | `{ longitude, latitude }` |

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "emergency": true,
    "nearestStation": { ... },
    "alternatives": [...]
  }
}
```

**Error Response (404):**

```json
{
  "status": "error",
  "message": "No charging stations found within reachable distance. Consider calling roadside assistance."
}
```

---

## Admin Routes

### `GET /api/v1/auth/users`

List all users (admin only).

**Auth Required:** Yes (admin only)

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "users": [...]
  }
}
```

---

### `PATCH /api/v1/auth/users/:id/status`

Activate or deactivate a user account.

**Auth Required:** Yes (admin only)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `isActive` | boolean | Yes | Account active status |

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": { ... }
  }
}
```

---

## WebSocket Events

The server uses **Socket.io** for real-time station occupancy updates. Connect to the WebSocket URL (base URL, not the `/api/v1` path).

### Connection Example

```javascript
import { io } from "socket.io-client";

const socket = io("https://0s2djcq5-3000.inc1.devtunnels.ms", {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);
});
```

### Events

#### `station_occupancy_changed`

Emitted when a station's port occupancy is updated (via PATCH or PUT occupancy endpoints).

**Payload:**

```json
{
  "stationId": "665a...",
  "connectorType": "CCS",
  "occupied": 2,
  "total": 4,
  "updatedAt": "2026-03-01T12:00:00.000Z"
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "status": "fail" | "error",
  "message": "Human-readable error message"
}
```

### HTTP Status Codes

| Code  | Description                             |
| ----- | --------------------------------------- |
| `200` | Success                                 |
| `201` | Created                                 |
| `204` | No content (successful deletion)        |
| `400` | Bad request / Validation error          |
| `401` | Unauthorized (missing or invalid token) |
| `403` | Forbidden (insufficient permissions)    |
| `404` | Resource not found                      |
| `409` | Conflict (duplicate entry)              |
| `500` | Internal server error                   |

### Common Error Scenarios

| Error Type    | Status | Example Message                                         |
| ------------- | ------ | ------------------------------------------------------- |
| Validation    | 400    | "Name, email, and password are required"                |
| Auth Missing  | 401    | "Access denied. No token provided."                     |
| Token Expired | 401    | "Token expired. Please login again."                    |
| Token Invalid | 401    | "Invalid token."                                        |
| Permission    | 403    | "Admin accounts can only be created by existing admins" |
| Not Found     | 404    | "Station not found"                                     |
| Duplicate     | 409    | "Email already registered"                              |
| Bad ObjectId  | 400    | "Invalid ID format"                                     |
