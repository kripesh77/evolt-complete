# EV Charging Station API Documentation

**Version:** 3.0.0  
**Base URL:** `http://localhost:3000/api/v1`  
**Last Updated:** February 4, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Role-Based Access Control](#role-based-access-control)
4. [Error Handling](#error-handling)
5. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Authentication Routes](#authentication-routes)
   - [User Profile Routes](#user-profile-routes)
   - [Admin Routes](#admin-routes)
   - [Station Routes](#station-routes)
   - [Recommendation Routes](#recommendation-routes)
6. [Data Models](#data-models)
7. [Examples](#examples)

---

## Overview

The EV Charging Station API provides endpoints for managing electric vehicle charging stations and getting smart recommendations based on vehicle profiles, location, and real-time availability.

### Key Features

- **Role-Based Access Control** - Distinct user, operator, and admin roles with specific permissions
- **Separate bike and car ecosystems** - Different connector types and pricing for bikes vs cars
- **Smart recommendations** - MCDS-style weighted scoring algorithm
- **Real-time occupancy tracking** - Per-port availability management
- **User vehicle profiles** - Save vehicle configurations for personalized recommendations
- **Favorite stations** - Users can save their preferred charging stations
- **Geospatial queries** - Find nearby stations within a radius

### Vehicle Types

| Type   | Connectors          | Typical Power |
| ------ | ------------------- | ------------- |
| `bike` | AC_SLOW             | 2-3 kW        |
| `car`  | Type2, CCS, CHAdeMO | 11-350 kW     |

---

## Authentication

The API uses **JWT (JSON Web Token)** authentication for protected routes.

### Getting a Token

1. Register a new account via `POST /api/v1/auth/register`
2. Or login with existing credentials via `POST /api/v1/auth/login`
3. Include the token in subsequent requests

### Using the Token

Add the token to the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

### Token Expiration

Tokens expire after **7 days** by default. After expiration, you must login again to get a new token.

---

## Role-Based Access Control

The API implements a role-based access control (RBAC) system with three distinct roles:

### User Roles

| Role       | Description                    | Permissions                                          |
| ---------- | ------------------------------ | ---------------------------------------------------- |
| `user`     | Regular EV driver              | View stations, get recommendations, manage favorites |
| `operator` | Charging station owner/manager | All user permissions + create/manage own stations    |
| `admin`    | System administrator           | All permissions + manage all stations and users      |

### Access Levels

| Route Type           | Required Role            | Description                           |
| -------------------- | ------------------------ | ------------------------------------- |
| **Public**           | None                     | View stations, get recommendations    |
| **Authenticated**    | Any logged-in user       | Profile management, favorites         |
| **Operator Only**    | `operator` or `admin`    | Station creation and management       |
| **Admin Only**       | `admin`                  | User management, access all resources |
| **Owner/Admin Only** | Station owner or `admin` | Modify specific station               |

### Role-Specific Registration

- **Users** - Default role when registering without specifying role
- **Operators** - Must specify `role: "operator"` and provide `company` field
- **Admins** - Can only be created by existing admins via `POST /api/v1/auth/users`

---

## Error Handling

### Standard Error Response

```json
{
  "status": "error" | "fail",
  "message": "Human-readable error message"
}
```

### HTTP Status Codes

| Code  | Description                          |
| ----- | ------------------------------------ |
| `200` | Success                              |
| `201` | Created successfully                 |
| `204` | Deleted successfully (no content)    |
| `400` | Bad request / Validation error       |
| `401` | Unauthorized (missing/invalid token) |
| `403` | Forbidden (no permission)            |
| `404` | Resource not found                   |
| `409` | Conflict (e.g., duplicate email)     |
| `500` | Internal server error                |

---

## Endpoints

### Health Check

#### `GET /health`

Check if the API is running.

**Authentication:** None

**Response:**

```json
{
  "status": "success",
  "message": "EV Charging Station API is running",
  "timestamp": "2026-01-27T10:30:00.000Z"
}
```

---

### Authentication Routes

Base path: `/api/v1/auth`

---

#### `POST /auth/register`

Register a new user account.

**Authentication:** None

**Request Body (Regular User):**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Request Body (Operator):**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "role": "operator",
  "company": "EV Networks Pvt Ltd",
  "phone": "+91-9876543210"
}
```

| Field      | Type   | Required           | Description                              |
| ---------- | ------ | ------------------ | ---------------------------------------- |
| `name`     | string | Yes                | User name (2-100 chars)                  |
| `email`    | string | Yes                | Valid email address (unique)             |
| `password` | string | Yes                | Min 8 characters                         |
| `role`     | string | No                 | `user` (default) or `operator`           |
| `company`  | string | Yes (for operator) | Required when role is operator (max 200) |
| `phone`    | string | No                 | Phone number                             |

> **Note:** Admin accounts cannot be created via registration. They must be created by existing admins.

**Success Response (201):**

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

**Error Responses:**

- `400` - Missing required fields, or operator missing company
- `403` - Attempting to register as admin
- `409` - Email already registered

---

#### `POST /auth/login`

Login with existing credentials.

**Authentication:** None

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "operator",
      "company": "EV Networks Pvt Ltd"
    }
  }
}
```

**Error Responses:**

- `400` - Missing email or password
- `401` - Invalid credentials or deactivated account

---

#### `GET /auth/me`

Get current user profile.

**Authentication:** Required

**Headers:**

```
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "operator",
      "company": "EV Networks Pvt Ltd",
      "phone": "+91-9876543210",
      "isActive": true,
      "vehicleProfiles": [],
      "favoriteStations": [],
      "createdAt": "2026-01-27T10:00:00.000Z"
    }
  }
}
```

---

#### `PATCH /auth/me`

Update user profile.

**Authentication:** Required

**Request Body:**

```json
{
  "name": "John Smith",
  "company": "New Company Name",
  "phone": "+91-9876543211"
}
```

| Field     | Type   | Description     |
| --------- | ------ | --------------- |
| `name`    | string | Updated name    |
| `company` | string | Updated company |
| `phone`   | string | Updated phone   |

> **Note:** Email and role cannot be changed through this endpoint.

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Smith",
      "email": "john@example.com",
      "role": "operator",
      "company": "New Company Name",
      "phone": "+91-9876543211"
    }
  }
}
```

---

#### `PATCH /auth/password`

Change password.

**Authentication:** Required

**Request Body:**

```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newsecurepassword456"
}
```

**Success Response (200):**

```json
{
  "status": "success",
  "message": "Password changed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

- `400` - Missing passwords or new password too short
- `401` - Current password incorrect

---

### User Profile Routes

Base path: `/api/v1/auth`

These routes allow users to manage their vehicle profiles and favorite stations.

---

#### `POST /auth/vehicle-profiles`

Add a vehicle profile.

**Authentication:** Required

**Request Body:**

```json
{
  "name": "My Tesla",
  "vehicleType": "car",
  "batteryCapacity": 75,
  "connectors": ["CCS", "Type2"],
  "efficiency": 6.5
}
```

| Field             | Type     | Required | Description                                     |
| ----------------- | -------- | -------- | ----------------------------------------------- |
| `name`            | string   | Yes      | Profile name                                    |
| `vehicleType`     | string   | Yes      | `bike` or `car`                                 |
| `batteryCapacity` | number   | Yes      | Battery capacity in kWh                         |
| `connectors`      | string[] | Yes      | Compatible connectors (AC_SLOW for bike, etc.)  |
| `efficiency`      | number   | No       | km per kWh (default: 4.0 for bike, 6.0 for car) |

**Success Response (201):**

```json
{
  "status": "success",
  "message": "Vehicle profile added",
  "data": {
    "vehicleProfiles": [
      {
        "name": "My Tesla",
        "vehicleType": "car",
        "batteryCapacity": 75,
        "connectors": ["CCS", "Type2"],
        "efficiency": 6.5
      }
    ]
  }
}
```

---

#### `DELETE /auth/vehicle-profiles/:profileId`

Remove a vehicle profile by its ID.

**Authentication:** Required

**Success Response (200):**

```json
{
  "status": "success",
  "message": "Vehicle profile removed",
  "data": {
    "vehicleProfiles": []
  }
}
```

---

#### `POST /auth/favorites/:stationId`

Add a station to favorites.

**Authentication:** Required

**Success Response (201):**

```json
{
  "status": "success",
  "message": "Station added to favorites",
  "data": {
    "favoriteStations": ["507f1f77bcf86cd799439011"]
  }
}
```

---

#### `DELETE /auth/favorites/:stationId`

Remove a station from favorites.

**Authentication:** Required

**Success Response (200):**

```json
{
  "status": "success",
  "message": "Station removed from favorites",
  "data": {
    "favoriteStations": []
  }
}
```

---

### Admin Routes

Base path: `/api/v1/auth`

These routes are only accessible to users with the `admin` role.

---

#### `GET /auth/users`

Get all users (Admin only).

**Authentication:** Required (Admin)

**Query Parameters:**

| Parameter | Type   | Description                                 |
| --------- | ------ | ------------------------------------------- |
| `role`    | string | Filter by role: `user`, `operator`, `admin` |

**Success Response (200):**

```json
{
  "status": "success",
  "results": 10,
  "data": {
    "users": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "operator",
        "company": "EV Networks",
        "isActive": true,
        "createdAt": "2026-01-27T10:00:00.000Z"
      }
    ]
  }
}
```

---

#### `POST /auth/users`

Create a new user with any role (Admin only).

**Authentication:** Required (Admin)

**Request Body:**

```json
{
  "name": "New Admin",
  "email": "newadmin@example.com",
  "password": "securepassword123",
  "role": "admin",
  "company": "Admin Corp"
}
```

> **Note:** This is the only way to create admin accounts.

**Success Response (201):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "New Admin",
      "email": "newadmin@example.com",
      "role": "admin"
    }
  }
}
```

---

#### `PATCH /auth/users/:userId/status`

Update user active status (Admin only).

**Authentication:** Required (Admin)

**Request Body:**

```json
{
  "isActive": false
}
```

**Success Response (200):**

```json
{
  "status": "success",
  "message": "User status updated",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "isActive": false
    }
  }
}
```

---

### Station Routes

Base path: `/api/v1/stations`

---

#### `GET /stations`

Get all stations with optional filters.

**Authentication:** None (Public)

**Query Parameters:**

| Parameter     | Type   | Description                      |
| ------------- | ------ | -------------------------------- |
| `status`      | string | Filter by `active` or `inactive` |
| `vehicleType` | string | Filter by `bike` or `car`        |

**Example:**

```
GET /api/v1/stations?status=active&vehicleType=car
```

**Success Response (200):**

```json
{
  "status": "success",
  "results": 10,
  "data": {
    "stations": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "EV Hub Connaught Place",
        "operatorId": "507f1f77bcf86cd799439012",
        "location": {
          "type": "Point",
          "coordinates": [77.2195, 28.6315]
        },
        "address": "Block A, Connaught Place, New Delhi",
        "ports": [
          {
            "connectorType": "CCS",
            "vehicleType": "car",
            "powerKW": 150,
            "total": 4,
            "pricePerKWh": 18
          }
        ],
        "operatingHours": "24/7",
        "status": "active",
        "createdAt": "2026-01-27T10:00:00.000Z"
      }
    ]
  }
}
```

---

#### `GET /stations/stats`

Get station statistics.

**Authentication:** None (Public)

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "stats": {
      "totalStations": 10,
      "activeStations": 9,
      "inactiveStations": 1,
      "totalBikePorts": 70,
      "totalCarPorts": 78,
      "byConnectorType": {
        "AC_SLOW": 70,
        "Type2": 30,
        "CCS": 28,
        "CHAdeMO": 20
      }
    }
  }
}
```

---

#### `GET /stations/my-stations`

Get stations owned by the authenticated operator.

**Authentication:** Required (Operator or Admin)

> **Note:** Regular users cannot access this endpoint.

**Success Response (200):**

```json
{
  "status": "success",
  "results": 5,
  "data": {
    "stations": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "My Station",
        "operatorId": "507f1f77bcf86cd799439012",
        ...
      }
    ]
  }
}
```

---

#### `GET /stations/:id`

Get a single station by ID with current occupancy.

**Authentication:** None (Public)

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "station": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "EV Hub Connaught Place",
      "operatorId": "507f1f77bcf86cd799439012",
      "location": {
        "type": "Point",
        "coordinates": [77.2195, 28.6315]
      },
      "address": "Block A, Connaught Place, New Delhi",
      "ports": [
        {
          "connectorType": "CCS",
          "vehicleType": "car",
          "powerKW": 150,
          "total": 4,
          "pricePerKWh": 18
        }
      ],
      "operatingHours": "24/7",
      "status": "active"
    },
    "occupancy": [
      {
        "connectorType": "CCS",
        "occupied": 2
      }
    ]
  }
}
```

---

#### `POST /stations`

Create a new charging station.

**Authentication:** Required (Operator or Admin)

> **Access Control:**
>
> - Operators can create stations (station is automatically assigned to them)
> - Admins can create stations (station is assigned to the admin)
> - Regular users cannot create stations (403 Forbidden)

**Request Body:**

```json
{
  "name": "New Charging Hub",
  "location": {
    "type": "Point",
    "coordinates": [77.2195, 28.6315]
  },
  "address": "123 Main Street, New Delhi",
  "ports": [
    {
      "connectorType": "CCS",
      "vehicleType": "car",
      "powerKW": 150,
      "total": 4,
      "pricePerKWh": 18
    },
    {
      "connectorType": "AC_SLOW",
      "vehicleType": "bike",
      "powerKW": 3,
      "total": 6,
      "pricePerKWh": 8
    }
  ],
  "operatingHours": "24/7",
  "status": "active"
}
```

| Field            | Type   | Required | Description                               |
| ---------------- | ------ | -------- | ----------------------------------------- |
| `name`           | string | Yes      | Station name (max 100 chars)              |
| `location`       | object | Yes      | GeoJSON Point with coordinates [lng, lat] |
| `address`        | string | Yes      | Physical address                          |
| `ports`          | array  | Yes      | At least one port required                |
| `operatingHours` | string | No       | Default: "24/7"                           |
| `status`         | string | No       | `active` or `inactive`, default: "active" |

**Port Object:**

| Field           | Type   | Required | Description                     |
| --------------- | ------ | -------- | ------------------------------- |
| `connectorType` | string | Yes      | AC_SLOW, Type2, CCS, or CHAdeMO |
| `vehicleType`   | string | Yes      | `bike` or `car`                 |
| `powerKW`       | number | Yes      | Power output (0.5-350 kW)       |
| `total`         | number | Yes      | Number of ports (min 1)         |
| `pricePerKWh`   | number | Yes      | Price per kWh (₹)               |

**Success Response (201):**

```json
{
  "status": "success",
  "data": {
    "station": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "New Charging Hub",
      "operatorId": "507f1f77bcf86cd799439012",
      ...
    }
  }
}
```

---

#### `PATCH /stations/:id`

Update a station.

**Authentication:** Required (Owner or Admin)

> **Access Control:**
>
> - Station owner can update their own station
> - Admin can update any station
> - Regular users and non-owner operators receive 403 Forbidden

**Request Body:**

```json
{
  "name": "Updated Station Name",
  "status": "inactive",
  "operatingHours": "06:00 - 22:00"
}
```

> **Note:** You cannot change the `operatorId` through this endpoint.

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "station": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Updated Station Name",
      ...
    }
  }
}
```

**Error Responses:**

- `401` - Not authenticated
- `403` - Not the station owner (non-admin)
- `404` - Station not found

---

#### `DELETE /stations/:id`

Delete a station.

**Authentication:** Required (Owner or Admin)

> **Access Control:**
>
> - Station owner can delete their own station
> - Admin can delete any station
> - Regular users and non-owner operators receive 403 Forbidden

**Success Response (204):** No content

**Error Responses:**

- `401` - Not authenticated
- `403` - Not the station owner (non-admin)
- `404` - Station not found

---

#### `POST /stations/:id/ports`

Add a new port to a station.

**Authentication:** Required (Owner or Admin)

**Request Body:**

```json
{
  "connectorType": "Type2",
  "vehicleType": "car",
  "powerKW": 22,
  "total": 4,
  "pricePerKWh": 12
}
```

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "station": {
      "_id": "507f1f77bcf86cd799439011",
      "ports": [...]
    }
  }
}
```

---

#### `PATCH /stations/:id/occupancy`

Update occupancy for a specific connector type.

**Authentication:** Required (Owner or Admin)

**Request Body:**

```json
{
  "connectorType": "CCS",
  "occupied": 2
}
```

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "status": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Downtown Hub",
      "ports": [
        {
          "connectorType": "CCS",
          "vehicleType": "car",
          "powerKW": 150,
          "total": 4,
          "occupied": 2,
          "pricePerKWh": 15
        }
      ],
      "lastStatusUpdate": "2026-01-27T10:30:00.000Z"
    }
  }
}
```

---

#### `PUT /stations/:id/occupancy`

Bulk update occupancy for multiple connector types.

**Authentication:** Required (Owner or Admin)

**Request Body:**

```json
[
  { "connectorType": "CCS", "occupied": 2 },
  { "connectorType": "Type2", "occupied": 3 },
  { "connectorType": "AC_SLOW", "occupied": 5 }
]
```

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "status": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Downtown Hub",
      "ports": [
        {
          "connectorType": "CCS",
          "vehicleType": "car",
          "powerKW": 150,
          "total": 4,
          "occupied": 2,
          "pricePerKWh": 15
        },
        {
          "connectorType": "Type2",
          "vehicleType": "car",
          "powerKW": 22,
          "total": 6,
          "occupied": 3,
          "pricePerKWh": 12
        },
        {
          "connectorType": "AC_SLOW",
          "vehicleType": "bike",
          "powerKW": 3,
          "total": 8,
          "occupied": 5,
          "pricePerKWh": 8
        }
      ],
      "lastStatusUpdate": "2026-01-27T10:30:00.000Z"
    }
  }
}
```

---

### Recommendation Routes

Base path: `/api/v1/recommendations`

---

#### `GET /recommendations/nearby`

Find nearby stations within a radius.

**Authentication:** None (Public)

**Query Parameters:**

| Parameter     | Type   | Required | Description                                |
| ------------- | ------ | -------- | ------------------------------------------ |
| `longitude`   | number | Yes      | Current longitude (-180 to 180)            |
| `latitude`    | number | Yes      | Current latitude (-90 to 90)               |
| `radius`      | number | No       | Search radius in km (default: 10, max: 50) |
| `vehicleType` | string | No       | Filter by `bike` or `car`                  |

**Example:**

```
GET /api/v1/recommendations/nearby?longitude=77.2195&latitude=28.6315&radius=5&vehicleType=car
```

**Success Response (200):**

```json
{
  "status": "success",
  "results": 5,
  "data": {
    "stations": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "EV Hub Connaught Place",
        "distance": 1.5,
        "location": {
          "type": "Point",
          "coordinates": [77.2195, 28.6315]
        },
        "ports": [...],
        "status": "active"
      }
    ]
  }
}
```

---

#### `POST /recommendations`

Get smart station recommendations based on vehicle profile.

**Authentication:** None (Public)

**Request Body:**

```json
{
  "vehicleProfile": {
    "vehicleType": "car",
    "batteryCapacity_kWh": 60,
    "efficiency_kWh_per_km": 0.15,
    "batteryPercent": 25,
    "compatibleConnectors": ["CCS", "Type2"]
  },
  "currentLocation": {
    "longitude": 77.2195,
    "latitude": 28.6315
  },
  "targetBatteryPercent": 80,
  "maxDistanceKm": 20,
  "limit": 5,
  "weights": {
    "distance": 0.25,
    "availability": 0.2,
    "waitTime": 0.2,
    "power": 0.2,
    "cost": 0.15
  }
}
```

| Field                  | Type   | Required | Description                       |
| ---------------------- | ------ | -------- | --------------------------------- |
| `vehicleProfile`       | object | Yes      | Vehicle specifications            |
| `currentLocation`      | object | Yes      | Current GPS coordinates           |
| `targetBatteryPercent` | number | No       | Target charge level (default: 80) |
| `maxDistanceKm`        | number | No       | Max search distance (default: 50) |
| `limit`                | number | No       | Max results (default: 10)         |
| `weights`              | object | No       | Custom scoring weights            |

**Vehicle Profile:**

| Field                   | Type   | Required | Description                   |
| ----------------------- | ------ | -------- | ----------------------------- |
| `vehicleType`           | string | Yes      | `bike` or `car`               |
| `batteryCapacity_kWh`   | number | Yes      | Battery capacity in kWh       |
| `efficiency_kWh_per_km` | number | Yes      | Energy consumption per km     |
| `batteryPercent`        | number | Yes      | Current battery level (0-100) |
| `compatibleConnectors`  | array  | Yes      | List of compatible connectors |

**Scoring Weights (all optional, must sum to 1.0):**

| Weight         | Default | Description                  |
| -------------- | ------- | ---------------------------- |
| `distance`     | 0.25    | Prefer closer stations       |
| `availability` | 0.20    | Prefer more free slots       |
| `waitTime`     | 0.20    | Prefer shorter wait times    |
| `power`        | 0.20    | Prefer higher power chargers |
| `cost`         | 0.15    | Prefer lower prices          |

**Success Response (200):**

```json
{
  "status": "success",
  "results": 5,
  "data": {
    "recommendations": [
      {
        "stationId": "507f1f77bcf86cd799439011",
        "stationName": "EV Hub Connaught Place",
        "address": "Block A, Connaught Place, New Delhi",
        "recommendedPort": "CCS",
        "powerKW": 150,
        "pricePerKWh": 18,
        "freeSlots": 2,
        "totalSlots": 4,
        "estimatedWaitMinutes": 0,
        "distanceKm": 1.5,
        "estimatedCost": 396.0,
        "estimatedChargeTimeMinutes": 22,
        "score": 0.87,
        "location": {
          "longitude": 77.2195,
          "latitude": 28.6315
        }
      }
    ],
    "vehicleInfo": {
      "currentRange": 100,
      "reachableDistance": 80,
      "energyNeeded": 33
    }
  }
}
```

---

#### `POST /recommendations/emergency`

Get emergency recommendations when battery is critically low.

**Authentication:** None (Public)

**Request Body:**

```json
{
  "vehicleProfile": {
    "vehicleType": "car",
    "batteryCapacity_kWh": 60,
    "efficiency_kWh_per_km": 0.15,
    "batteryPercent": 5,
    "compatibleConnectors": ["CCS", "Type2"]
  },
  "currentLocation": {
    "longitude": 77.2195,
    "latitude": 28.6315
  }
}
```

> **Note:** Emergency mode prioritizes:
>
> - Closest reachable stations
> - Stations with available slots
> - Higher power chargers for faster charging

**Success Response (200):**

```json
{
  "status": "success",
  "emergency": true,
  "results": 3,
  "data": {
    "recommendations": [...],
    "warning": "Battery critically low. Closest stations prioritized.",
    "vehicleInfo": {
      "currentRange": 20,
      "reachableDistance": 16
    }
  }
}
```

---

## Data Models

### User

```typescript
{
  _id: ObjectId,
  name: string,
  email: string,
  password: string,  // Hashed, never returned
  role: "user" | "operator" | "admin",
  company?: string,  // Required for operators
  phone?: string,
  isActive: boolean,
  vehicleProfiles: VehicleProfile[],  // For user convenience
  favoriteStations: ObjectId[],       // References to Station
  createdAt: Date,
  updatedAt: Date
}
```

### VehicleProfile (Embedded in User)

```typescript
{
  name: string,
  vehicleType: "bike" | "car",
  batteryCapacity: number,  // kWh
  connectors: string[],     // Compatible connector types
  efficiency?: number       // km per kWh
}
```

### Station

```typescript
{
  _id: ObjectId,
  name: string,
  operatorId: ObjectId,  // Reference to User (operator or admin)
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  address: string,
  ports: Port[],
  operatingHours: string,
  status: "active" | "inactive",
  createdAt: Date,
  updatedAt: Date
}
```

### Port

```typescript
{
  connectorType: "AC_SLOW" | "Type2" | "CCS" | "CHAdeMO",
  vehicleType: "bike" | "car",
  powerKW: number,
  total: number,
  occupied: number,  // Current occupied slots (0 by default)
  pricePerKWh: number
}
```

---

## Examples

### Complete Workflow: Operator Creates and Manages a Station

#### 1. Register as Operator

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EV Networks",
    "email": "admin@evnetworks.com",
    "password": "securepass123",
    "company": "EV Networks Pvt Ltd"
  }'
```

#### 2. Create a Station

```bash
curl -X POST http://localhost:3000/api/v1/stations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "name": "Downtown Charging Hub",
    "location": {
      "type": "Point",
      "coordinates": [77.2195, 28.6315]
    },
    "address": "123 Main Street, New Delhi",
    "ports": [
      {
        "connectorType": "CCS",
        "vehicleType": "car",
        "powerKW": 150,
        "total": 4,
        "pricePerKWh": 18
      }
    ]
  }'
```

#### 3. Update Occupancy

```bash
curl -X PATCH http://localhost:3000/api/v1/stations/<station_id>/occupancy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "connectorType": "CCS",
    "occupied": 2
  }'
```

### User Gets Recommendations

```bash
curl -X POST http://localhost:3000/api/v1/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleProfile": {
      "vehicleType": "car",
      "batteryCapacity_kWh": 60,
      "efficiency_kWh_per_km": 0.15,
      "batteryPercent": 25,
      "compatibleConnectors": ["CCS", "Type2"]
    },
    "currentLocation": {
      "longitude": 77.2195,
      "latitude": 28.6315
    }
  }'
```

### Find Nearby Bike Charging Stations

```bash
curl "http://localhost:3000/api/v1/recommendations/nearby?longitude=77.2195&latitude=28.6315&radius=5&vehicleType=bike"
```

---

## Rate Limiting

Currently, no rate limiting is implemented. For production deployment, consider adding rate limiting middleware.

---

## Environment Variables

| Variable         | Description                          | Default     |
| ---------------- | ------------------------------------ | ----------- |
| `PORT`           | Server port                          | 3000        |
| `MONGODB_URI`    | MongoDB connection string            | -           |
| `NODE_ENV`       | Environment (development/production) | development |
| `JWT_SECRET`     | Secret key for JWT signing           | -           |
| `JWT_EXPIRES_IN` | Token expiration time                | 7d          |

---

## Event-Driven Architecture

The API implements a publish-subscribe event system for loose coupling and extensibility.

### Event Categories

| Category      | Events                                                                           | Description                    |
| ------------- | -------------------------------------------------------------------------------- | ------------------------------ |
| **Station**   | `station.created`, `station.updated`, `station.deleted`, `station.statusChanged` | Station lifecycle events       |
| **Occupancy** | `occupancy.updated`, `occupancy.full`, `occupancy.available`                     | Real-time availability changes |
| **User**      | `user.registered`, `user.loggedIn`, `user.updated`, `user.deactivated`           | User account events            |
| **Vehicle**   | `vehicleProfile.added`, `vehicleProfile.removed`                                 | Vehicle profile changes        |
| **Favorites** | `favorite.added`, `favorite.removed`                                             | Favorite station management    |
| **System**    | `system.error`, `system.startup`, `system.shutdown`                              | System-level events            |

### Event Payloads

Events are automatically emitted when actions occur. Example payloads:

**Station Created Event**

```json
{
  "type": "station.created",
  "timestamp": "2026-02-04T10:30:00.000Z",
  "userId": "65b2c3d4e5f6a7b8",
  "payload": {
    "stationId": "65c3d4e5f6a7b8c9",
    "operatorId": "65b2c3d4e5f6a7b8",
    "name": "EV Hub Connaught Place",
    "location": { "longitude": 77.2195, "latitude": 28.6315 },
    "portCount": 4
  }
}
```

**User Registered Event**

```json
{
  "type": "user.registered",
  "timestamp": "2026-02-04T09:15:00.000Z",
  "payload": {
    "userId": "65a1b2c3d4e5f6a7",
    "email": "newuser@example.com",
    "role": "user",
    "name": "Rahul Sharma"
  }
}
```

**Occupancy Full Event**

```json
{
  "type": "occupancy.full",
  "timestamp": "2026-02-04T18:45:00.000Z",
  "payload": {
    "stationId": "65c3d4e5f6a7b8c9",
    "connectorType": "CCS"
  }
}
```

### Future Webhook Integration

Events can be extended to support webhooks for real-time notifications:

- Push notifications when favorite station becomes available
- Operator alerts for station status changes
- Admin notifications for system errors

---

## Test Credentials

For development/testing:

| Email                      | Password      | Role     | Description          |
| -------------------------- | ------------- | -------- | -------------------- |
| `operator@evhub.com`       | `password123` | operator | Test Operator 1      |
| `operator2@greencharge.in` | `password123` | operator | Test Operator 2      |
| `admin@evcharging.com`     | `admin123`    | admin    | System Administrator |
| `user@test.com`            | `password123` | user     | Test Regular User    |

---

## Changelog

### v3.0.0 (February 2026)

- **Event-Driven Architecture** - Implemented publish-subscribe pattern with EventBus
- **Event Types** - Station, occupancy, user, vehicle, favorite, and system events
- **Event Handlers** - Centralized logging and analytics for all events
- **Loose Coupling** - Controllers emit events without knowing handlers

### v2.0.0 (January 2026)

- **Role-Based Access Control** - Introduced user, operator, and admin roles
- **User Vehicle Profiles** - Users can save vehicle configurations
- **Favorite Stations** - Users can bookmark preferred stations
- **Admin Endpoints** - User management for administrators
- Generalized User model replacing Operator model
- Admin bypass for station ownership restrictions

### v1.0.0 (January 2026)

- Initial release
- Station CRUD operations
- Operator authentication (JWT)
- Smart recommendations with weighted scoring
- Real-time occupancy tracking
- Geospatial queries
- Separate bike/car ecosystems
