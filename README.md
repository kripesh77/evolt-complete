# EV Charging Station Recommendation API

A smart EV charging station recommendation backend system built with Node.js, Express, MongoDB, and TypeScript. The system recommends the best charging stations and compatible charging ports to EV users based on various factors.

## 🚀 Features

- **Smart Recommendations**: AI-powered station recommendations based on multiple criteria
- **Vehicle Support**: Separate handling for bikes (two-wheelers) and cars (four-wheelers)
- **Per-Port Pricing**: Realistic pricing model per charging port
- **Real-time Availability**: Track occupancy per connector type
- **Geospatial Queries**: MongoDB 2dsphere index for efficient location-based search
- **Scoring Algorithm**: Multi-criteria decision support (MCDS) style weighted scoring

## 📋 API Endpoints

### Health Check

```
GET /health
```

### Stations

```
GET    /api/v1/stations           - Get all stations
GET    /api/v1/stations/stats     - Get station statistics
GET    /api/v1/stations/:id       - Get station by ID
POST   /api/v1/stations           - Create new station
PATCH  /api/v1/stations/:id       - Update station
DELETE /api/v1/stations/:id       - Delete station
POST   /api/v1/stations/:id/ports - Add port to station
PATCH  /api/v1/stations/:id/occupancy - Update port occupancy
PUT    /api/v1/stations/:id/occupancy - Bulk update occupancy
```

### Recommendations

```
GET  /api/v1/recommendations/nearby    - Get nearby stations (quick overview)
POST /api/v1/recommendations           - Get smart recommendations
POST /api/v1/recommendations/emergency - Emergency recommendation (low battery)
```

## 📊 Recommendation Request Format

```json
{
  "vehicleProfile": {
    "vehicleType": "car",
    "batteryCapacity_kWh": 60,
    "efficiency_kWh_per_km": 0.2,
    "batteryPercent": 30,
    "compatibleConnectors": ["CCS", "Type2"]
  },
  "currentLocation": {
    "longitude": 77.2195,
    "latitude": 28.6315
  },
  "preferences": {
    "preferFastCharging": true
  },
  "limit": 5
}
```

## 📤 Recommendation Response Format

```json
{
  "status": "success",
  "results": 5,
  "data": {
    "recommendations": [
      {
        "stationId": "...",
        "stationName": "EV Hub Connaught Place",
        "address": "Block A, Connaught Place, New Delhi",
        "recommendedPort": "CCS",
        "powerKW": 150,
        "pricePerKWh": 18,
        "freeSlots": 3,
        "totalSlots": 4,
        "estimatedWaitMinutes": 0,
        "distanceKm": 2.5,
        "estimatedCost": 540,
        "estimatedChargeTimeMinutes": 24,
        "score": 0.87,
        "location": {
          "longitude": 77.2195,
          "latitude": 28.6315
        }
      }
    ]
  }
}
```

## 🛠️ Setup

### Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or Atlas)

### Installation

```bash
# Install dependencies
npm install

# Configure environment variables
# Edit config.env with your MongoDB URI
```

### Environment Variables (config.env)

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ev_charging_station
NODE_ENV=development
```

### Running the Server

```bash
# Build TypeScript
npm run build

# Start server
npm start

# Development mode (build + start)
npm run dev

# Seed database with sample data
npm run seed
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

## 📁 Project Structure

```
src/
├── app.ts                 # Express app setup
├── server.ts              # Server entry point
├── config/
│   └── db.ts              # MongoDB connection
├── types/
│   └── vehicle.ts         # TypeScript interfaces
├── models/
│   ├── Station.ts         # Station Mongoose model
│   └── StationStatus.ts   # Station status model
├── services/
│   ├── geo.service.ts     # Geospatial queries
│   ├── station.service.ts # Station CRUD
│   ├── status.service.ts  # Occupancy management
│   └── recommendation.service.ts  # Core recommendation logic
├── controllers/
│   ├── station.controller.ts
│   └── recommendation.controller.ts
├── routes/
│   ├── station.routes.ts
│   └── recommendation.routes.ts
├── utils/
│   ├── calculations.ts    # Range, cost, time calculations
│   └── scoring.ts         # MCDS scoring algorithm
└── scripts/
    └── seed.ts            # Database seeding script

tests/
├── setup.ts               # Jest setup
├── unit/                  # Unit tests
│   ├── calculations.test.ts
│   ├── scoring.test.ts
│   └── recommendation.service.test.ts
└── integration/           # Integration tests
    └── api.test.ts
```

## 🔌 Connector Types

| Type    | Vehicle | Typical Power |
| ------- | ------- | ------------- |
| AC_SLOW | Bike    | 1-5 kW        |
| Type2   | Car     | 7-22 kW       |
| CCS     | Car     | 50-350 kW     |
| CHAdeMO | Car     | 50-100 kW     |

## 📐 Scoring Weights (Default)

| Factor       | Weight | Description                  |
| ------------ | ------ | ---------------------------- |
| Distance     | 0.25   | Closer stations score higher |
| Availability | 0.20   | More free slots score higher |
| Wait Time    | 0.20   | Lower wait scores higher     |
| Power        | 0.20   | Higher power scores higher   |
| Cost         | 0.15   | Lower cost scores higher     |

## 🔄 Key Calculations

### Remaining Energy

```
remainingEnergy = batteryCapacity × (batteryPercent / 100)
```

### Remaining Range

```
remainingRange = remainingEnergy / efficiency
```

### Reachable Distance (with safety buffer)

```
reachableKm = remainingRange × 0.8
```

### Estimated Charge Time

```
chargeTime = energyNeeded / (power × efficiency)
```

## 🚦 Vehicle Type Differences

| Aspect             | Bike    | Car                 |
| ------------------ | ------- | ------------------- |
| Battery Size       | 1-5 kWh | 30-100+ kWh         |
| Charging Power     | 1-5 kW  | 7-350 kW            |
| Typical Connectors | AC_SLOW | Type2, CCS, CHAdeMO |
| Cost Sensitivity   | High    | Moderate            |

## 📝 License

ISC
