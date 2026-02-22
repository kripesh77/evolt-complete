# EV Charging Station - Microservices Architecture

## 🏗️ Architecture Overview

This project demonstrates a **microservices architecture** for an EV Charging Station recommendation system. The monolithic application has been decomposed into independent, loosely-coupled services that communicate with each other.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT APPLICATIONS                            │
│                    (Mobile App, Web App, Third-party Apps)                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                    │
│                           (Port: 3000)                                      │
│  • Single entry point for all client requests                               │
│  • Routes requests to appropriate microservices                             │
│  • Handles authentication verification                                      │
│  • Rate limiting & request logging                                          │
└─────────────────────────────────────────────────────────────────────────────┘
          │                    │                    │                    │
          ▼                    ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│    AUTH     │      │    USER     │      │   STATION   │      │RECOMMENDATION│
│   SERVICE   │      │   SERVICE   │      │   SERVICE   │      │   SERVICE   │
│ (Port: 3001)│      │ (Port: 3002)│      │ (Port: 3003)│      │ (Port: 3004)│
├─────────────┤      ├─────────────┤      ├─────────────┤      ├─────────────┤
│• Register   │      │• Get Profile│      │• CRUD Ops   │      │• Smart Recs │
│• Login      │      │• Update User│      │• Port Mgmt  │      │• Geo Search │
│• JWT Tokens │      │• Vehicles   │      │• Occupancy  │      │• Scoring    │
│• Validation │      │• Favorites  │      │• Statistics │      │             │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
          │                    │                    │                    │
          ▼                    ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MESSAGE BUS (Event Bus)                           │
│                  • Inter-service communication                              │
│                  • Event publishing & subscribing                           │
│                  • Async operations                                         │
└─────────────────────────────────────────────────────────────────────────────┘
          │                    │                    │                    │
          ▼                    ▼                    ▼                    ▼
     ┌─────────┐         ┌─────────┐         ┌─────────┐         ┌─────────┐
     │ MongoDB │         │ MongoDB │         │ MongoDB │         │ MongoDB │
     │auth_db  │         │users_db │         │stations │         │  (uses  │
     │         │         │         │         │   _db   │         │stations)│
     └─────────┘         └─────────┘         └─────────┘         └─────────┘
```

## 🎯 Key Concepts

### 1. **Service Independence**

Each service:

- Has its own codebase and can be deployed independently
- Has its own database (Database per Service pattern)
- Can be scaled independently based on load
- Can use different technologies if needed

### 2. **API Gateway Pattern**

- Single entry point for all client requests
- Routes requests to appropriate services
- Handles cross-cutting concerns (auth, logging, rate limiting)
- Provides API composition for complex queries

### 3. **Inter-Service Communication**

- **Synchronous**: HTTP/REST calls between services
- **Asynchronous**: Event Bus for loosely-coupled communication

### 4. **Service Discovery**

- Services register their URLs in a configuration
- Gateway knows where to route requests

## 📁 Project Structure

```
microservice/
├── api-gateway/           # Entry point - routes to all services
│   ├── src/
│   │   ├── server.js      # Gateway server
│   │   ├── routes/        # Route definitions
│   │   └── middleware/    # Auth, logging, rate limiting
│   └── package.json
│
├── auth-service/          # Handles authentication
│   ├── src/
│   │   ├── server.js
│   │   ├── models/        # User credentials model
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── utils/         # JWT utilities
│   └── package.json
│
├── user-service/          # Manages user profiles
│   ├── src/
│   │   ├── server.js
│   │   ├── models/        # User profile model
│   │   ├── controllers/
│   │   └── routes/
│   └── package.json
│
├── station-service/       # Station management
│   ├── src/
│   │   ├── server.js
│   │   ├── models/        # Station model
│   │   ├── controllers/
│   │   ├── services/      # Business logic
│   │   └── routes/
│   └── package.json
│
├── recommendation-service/ # Smart recommendations
│   ├── src/
│   │   ├── server.js
│   │   ├── controllers/
│   │   ├── services/      # Recommendation logic
│   │   └── routes/
│   └── package.json
│
├── shared/                # Shared utilities
│   ├── event-bus.js       # Inter-service events
│   ├── http-client.js     # Service-to-service HTTP
│   └── constants.js       # Shared constants
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB running locally on `mongodb://localhost:27017`

### Installation & Running

**Option 1: Run All Services (Recommended for Development)**

```bash
cd microservice
npm run install-all    # Install dependencies for all services
npm run start-all      # Start all services (requires concurrently)
```

**Option 2: Run Services Individually**

```bash
# Terminal 1 - API Gateway
cd api-gateway && npm install && npm start

# Terminal 2 - Auth Service
cd auth-service && npm install && npm start

# Terminal 3 - User Service
cd user-service && npm install && npm start

# Terminal 4 - Station Service
cd station-service && npm install && npm start

# Terminal 5 - Recommendation Service
cd recommendation-service && npm install && npm start
```

## 🔌 API Endpoints

All requests go through the **API Gateway** at `http://localhost:3000`

### Authentication

| Method | Endpoint                | Description       |
| ------ | ----------------------- | ----------------- |
| POST   | `/api/v1/auth/register` | Register new user |
| POST   | `/api/v1/auth/login`    | Login user        |
| GET    | `/api/v1/auth/verify`   | Verify JWT token  |

### Users

| Method | Endpoint                     | Description      |
| ------ | ---------------------------- | ---------------- |
| GET    | `/api/v1/users/profile`      | Get user profile |
| PATCH  | `/api/v1/users/profile`      | Update profile   |
| POST   | `/api/v1/users/vehicles`     | Add vehicle      |
| DELETE | `/api/v1/users/vehicles/:id` | Remove vehicle   |

### Stations

| Method | Endpoint                         | Description               |
| ------ | -------------------------------- | ------------------------- |
| GET    | `/api/v1/stations`               | List all stations         |
| GET    | `/api/v1/stations/:id`           | Get station details       |
| POST   | `/api/v1/stations`               | Create station (operator) |
| PATCH  | `/api/v1/stations/:id`           | Update station (owner)    |
| DELETE | `/api/v1/stations/:id`           | Delete station (owner)    |
| POST   | `/api/v1/stations/:id/ports`     | Add port                  |
| PATCH  | `/api/v1/stations/:id/occupancy` | Update occupancy          |

### Recommendations

| Method | Endpoint                  | Description               |
| ------ | ------------------------- | ------------------------- |
| POST   | `/api/v1/recommendations` | Get smart recommendations |

## 🔄 Event-Driven Communication

Services communicate through events for loose coupling:

```javascript
// Publishing an event (in auth-service)
eventBus.publish("user.registered", { userId, email, role });

// Subscribing to an event (in user-service)
eventBus.subscribe("user.registered", async (data) => {
  await createUserProfile(data);
});
```

### Event Types

- `user.registered` - New user registered
- `user.loggedIn` - User logged in
- `station.created` - New station created
- `station.updated` - Station updated
- `occupancy.changed` - Occupancy updated

## 🎓 Learning Points

### Advantages of Microservices

1. **Independent Deployment** - Update one service without affecting others
2. **Technology Flexibility** - Each service can use best-fit technology
3. **Scalability** - Scale busy services independently
4. **Fault Isolation** - One service failure doesn't crash everything
5. **Team Autonomy** - Different teams can own different services

### Trade-offs

1. **Complexity** - More moving parts to manage
2. **Network Latency** - Service-to-service calls add latency
3. **Data Consistency** - Harder to maintain across services
4. **Debugging** - Tracing issues across services is harder

### When to Use Microservices

- Large, complex applications
- Need independent scaling
- Multiple development teams
- Different parts need different technologies

### When NOT to Use

- Small applications
- Small team
- Tight budget/timeline
- Strong data consistency requirements

## 📚 Further Reading

- [Microservices Patterns](https://microservices.io/patterns/)
- [API Gateway Pattern](https://microservices.io/patterns/apigateway.html)
- [Database per Service](https://microservices.io/patterns/data/database-per-service.html)
