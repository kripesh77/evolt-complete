# Quick Start Guide

## 🚀 Getting the Microservices Running

### Prerequisites

1. **Node.js** (v16 or higher)
2. **MongoDB** running locally on `mongodb://localhost:27017`
   - Windows: Install MongoDB Community Server and run `mongod`
   - Or use MongoDB Compass to start the service

### Step 1: Install Dependencies

```powershell
# Navigate to microservice folder
cd microservice

# Install root dependencies and all service dependencies
npm run install-all
```

### Step 2: Seed the Database (Optional but Recommended)

This creates sample users and stations:

```powershell
npm run seed
```

This will create:

- 3 sample users (user, operator, admin)
- 5 sample EV charging stations in Kathmandu area

### Step 3: Start All Services

**Option A: Start all at once** (recommended)

```powershell
npm run start-all
```

**Option B: Start individually** (for debugging)
Open 5 separate terminals:

```powershell
# Terminal 1 - API Gateway
npm run start-gateway

# Terminal 2 - Auth Service
npm run start-auth

# Terminal 3 - User Service
npm run start-user

# Terminal 4 - Station Service
npm run start-station

# Terminal 5 - Recommendation Service
npm run start-recommendation
```

### Step 4: Test the API

All requests go through the API Gateway at `http://localhost:3000`

#### Check System Health

```powershell
# Check if gateway is running
curl http://localhost:3000/health

# Check all services status
curl http://localhost:3000/api/v1/status
```

#### Register a User

```powershell
curl -X POST http://localhost:3000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{"name":"Test User","email":"test@test.com","password":"password123"}'
```

#### Login

```powershell
curl -X POST http://localhost:3000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"user@example.com","password":"password123"}'
```

Save the token from the response!

#### Get Stations

```powershell
curl http://localhost:3000/api/v1/stations
```

#### Get Recommendations

```powershell
curl -X POST http://localhost:3000/api/v1/recommendations `
  -H "Content-Type: application/json" `
  -d '{
    "vehicleProfile": {
      "vehicleType": "car",
      "batteryCapacity_kWh": 50,
      "efficiency_kWh_per_km": 0.15,
      "batteryPercent": 30,
      "compatibleConnectors": ["Type2", "CCS"]
    },
    "currentLocation": {
      "longitude": 85.32,
      "latitude": 27.71
    }
  }'
```

## 🔌 Service Ports

| Service                | Port | Description                  |
| ---------------------- | ---- | ---------------------------- |
| API Gateway            | 3000 | Entry point for all requests |
| Auth Service           | 3001 | Authentication & JWT         |
| User Service           | 3002 | User profiles & vehicles     |
| Station Service        | 3003 | Station management           |
| Recommendation Service | 3004 | Smart recommendations        |

## 📊 Databases

| Service                | Database Name               |
| ---------------------- | --------------------------- |
| Auth Service           | ev_auth_db                  |
| User Service           | ev_users_db                 |
| Station Service        | ev_stations_db              |
| Recommendation Service | None (uses Station Service) |

## 🔧 Troubleshooting

### MongoDB Connection Error

Make sure MongoDB is running:

```powershell
# Check if MongoDB is running
mongod --version

# Start MongoDB (if not running as a service)
mongod
```

### Port Already in Use

Change the port in the respective service's server.js or use environment variables:

```powershell
$env:AUTH_PORT = "3011"
npm run start-auth
```

### Service Unavailable Errors

Check that all dependent services are running:

1. Recommendations need Station Service
2. Gateway needs Auth Service for protected routes

## 📚 Learning Resources

1. Read the main [README.md](README.md) for architecture overview
2. Each service has detailed comments explaining the code
3. Look for "LEARNING POINT" comments for key concepts
