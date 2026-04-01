# EV Charging Station Recommendation System

## System Design Document

**Version:** 3.0.0  
**Project Title:** Smart EV Charging Station Recommendation System  
**Created:** January 27, 2026  
**Updated:** February 4, 2026  
**Tech Stack:** Node.js | Express 5 | MongoDB | TypeScript

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Feasibility Study](#3-feasibility-study)
4. [System Architecture](#4-system-architecture)
5. [UML Diagrams](#5-uml-diagrams)
   - [Use Case Diagram](#51-use-case-diagram)
   - [Class Diagram](#52-class-diagram)
   - [Sequence Diagrams](#53-sequence-diagrams)
   - [Activity Diagrams](#54-activity-diagrams)
   - [State Diagram](#55-state-diagram)
   - [Component Diagram](#56-component-diagram)
   - [Deployment Diagram](#57-deployment-diagram)
   - [Object Diagram](#58-object-diagram)
6. [Data Flow Diagram](#6-data-flow-diagram)
7. [Entity Relationship Diagram](#7-entity-relationship-diagram)
8. [Database Design](#8-database-design)
9. [API Design](#9-api-design)
10. [Event-Driven Architecture](#10-event-driven-architecture)
11. [Security Design](#11-security-design)
12. [Testing Strategy](#12-testing-strategy)

---

## 1. Introduction

### 1.1 Purpose

This document provides a comprehensive system design for the Smart EV Charging Station Recommendation System. It describes the architecture, components, data models, and interactions that enable electric vehicle users to find optimal charging stations based on their location, vehicle profile, and real-time availability.

### 1.2 Scope

The system provides:

- Smart station recommendations using Multi-Criteria Decision Support (MCDS) algorithm
- Real-time occupancy tracking and availability updates
- Role-based access control (User, Operator, Admin)
- Vehicle profile management for personalized recommendations
- Event-driven architecture for loose coupling and scalability
- Geospatial queries for location-based station discovery

### 1.3 Definitions and Abbreviations

| Term | Definition                        |
| ---- | --------------------------------- |
| EV   | Electric Vehicle                  |
| MCDS | Multi-Criteria Decision Support   |
| RBAC | Role-Based Access Control         |
| JWT  | JSON Web Token                    |
| API  | Application Programming Interface |
| CRUD | Create, Read, Update, Delete      |
| ODM  | Object Document Mapper            |

---

## 2. System Overview

### 2.1 Problem Statement

Electric vehicle owners face challenges in finding suitable charging stations that match their:

- Current location and remaining battery range
- Vehicle type (two-wheeler/bike vs four-wheeler/car)
- Compatible connector types
- Preference for charging speed vs cost
- Real-time port availability

### 2.2 Proposed Solution

A backend API system that provides intelligent recommendations using:

| Feature                          | Description                                        |
| -------------------------------- | -------------------------------------------------- |
| 🔋 **Smart Recommendations**     | MCDS-style weighted scoring algorithm              |
| 🚗 **Separate Ecosystems**       | Different handling for bikes vs cars               |
| 📍 **Geospatial Queries**        | Find stations within radius using MongoDB 2dsphere |
| ⚡ **Real-time Availability**    | Live port occupancy tracking                       |
| 🔐 **Role-Based Access**         | User, Operator, and Admin roles                    |
| 📡 **Event-Driven Architecture** | Loose coupling via publish-subscribe pattern       |

### 2.3 System Users

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SYSTEM ACTORS                                    │
├─────────────────┬──────────────────┬────────────────────┬───────────────────┤
│   👤 EV User    │  🏢 Operator     │   🔧 Admin         │   📱 Anonymous    │
│   (role: user)  │  (role: operator)│   (role: admin)    │   (no auth)       │
├─────────────────┼──────────────────┼────────────────────┼───────────────────┤
│ • Get nearby    │ • All User       │ • All Operator     │ • View stations   │
│   stations      │   permissions    │   permissions      │ • Get public      │
│ • Get smart     │ • Create own     │ • Manage ANY       │   recommendations │
│   recommendations│  stations       │   station          │ • Search nearby   │
│ • View station  │ • Update own     │ • Manage ALL users │                   │
│   details       │   stations       │ • Create admins    │                   │
│ • Save vehicle  │ • Track own      │ • Deactivate users │                   │
│   profiles      │   occupancy      │ • View analytics   │                   │
│ • Save favorite │                  │                    │                   │
│   stations      │                  │                    │                   │
└─────────────────┴──────────────────┴────────────────────┴───────────────────┘
```

---

## 3. Feasibility Study

### 3.1 Technical Feasibility

| Component      | Technology     | Justification                       |
| -------------- | -------------- | ----------------------------------- |
| Runtime        | Node.js 22.x   | Non-blocking I/O, large ecosystem   |
| Framework      | Express 5.2    | Mature, async/await support         |
| Database       | MongoDB 7.x    | Geospatial indexes, flexible schema |
| Language       | TypeScript 5.x | Type safety, better maintainability |
| Authentication | JWT            | Stateless, scalable                 |

### 3.2 Operational Feasibility

- **User Interface**: RESTful API for mobile/web integration
- **Response Time**: < 200ms for recommendations
- **Availability**: Designed for 99.9% uptime
- **Scalability**: Horizontal scaling with load balancer

### 3.3 Economic Feasibility

| Item           | Cost     | Notes                             |
| -------------- | -------- | --------------------------------- |
| Development    | Low      | Open-source stack                 |
| Infrastructure | Variable | MongoDB Atlas free tier available |
| Maintenance    | Low      | Automated testing (107 tests)     |

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
                                    ┌─────────────────────────────────────┐
                                    │           CLIENTS                   │
                                    ├─────────────┬───────────────────────┤
                                    │  📱 Mobile  │  💻 Web Dashboard     │
                                    │    App      │    (Operators)        │
                                    └──────┬──────┴───────────┬───────────┘
                                           │                  │
                                           ▼                  ▼
                              ┌────────────────────────────────────────────┐
                              │              🌐 API GATEWAY                │
                              │         http://localhost:3000              │
                              └────────────────────┬───────────────────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
                    ▼                              ▼                              ▼
        ┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐
        │   🔐 Auth Routes  │        │ 📍 Station Routes │        │ 💡 Recommendation │
        │   /api/v1/auth    │        │ /api/v1/stations  │        │     Routes        │
        └─────────┬─────────┘        └─────────┬─────────┘        └─────────┬─────────┘
                  │                            │                            │
                  └────────────────────────────┼────────────────────────────┘
                                               │
                                               ▼
                              ┌────────────────────────────────────────────┐
                              │            🎮 CONTROLLERS                  │
                              ├──────────────┬──────────────┬──────────────┤
                              │    Auth      │   Station    │ Recommendation│
                              │  Controller  │  Controller  │  Controller  │
                              └──────┬───────┴──────┬───────┴──────┬───────┘
                                     │              │              │
                                     ▼              ▼              ▼
                              ┌────────────────────────────────────────────┐
                              │             📡 EVENT BUS                   │
                              │      (Publish-Subscribe Pattern)           │
                              └────────────────────┬───────────────────────┘
                                                   │
                                     ┌─────────────┼─────────────┐
                                     ▼             ▼             ▼
                              ┌──────────┐  ┌──────────┐  ┌──────────┐
                              │ Station  │  │ User     │  │ System   │
                              │ Handlers │  │ Handlers │  │ Handlers │
                              └──────────┘  └──────────┘  └──────────┘
                                     │             │             │
                                     └─────────────┼─────────────┘
                                                   ▼
                              ┌────────────────────────────────────────────┐
                              │             ⚙️ SERVICES                    │
                              ├──────────────┬──────────────┬──────────────┤
                              │   Station    │    Status    │    Geo       │
                              │   Service    │   Service    │   Service    │
                              ├──────────────┴──────────────┴──────────────┤
                              │          Recommendation Service            │
                              └────────────────────┬───────────────────────┘
                                                   │
                                                   ▼
                              ┌─────────────────────────────────────┐
                              │          📊 MODELS                 │
                              ├─────────────────┬───────────────────┤
                              │      User       │      Station      │
                              │    (roles)      │ (embedded ports)  │
                              └────────┬────────┴─────────┬─────────┘
                                       │                  │
                                       └────────┬─────────┘
                                                │
                                                ▼
                              ┌────────────────────────────────────────────┐
                              │           🗄️ MongoDB Database              │
                              │        mongodb://127.0.0.1:27017           │
                              │            ev_charging_station             │
                              └────────────────────────────────────────────┘
```

### 4.2 Directory Structure

```
📁 src/
├── 📄 app.ts                      # Express app configuration
├── 📄 server.ts                   # Server entry point
├── 📁 config/
│   └── 📄 database.ts             # MongoDB connection
├── 📁 controllers/
│   ├── 📄 authController.ts       # Authentication & user management
│   ├── 📄 station.controller.ts   # Station CRUD operations
│   └── 📄 recommendation.controller.ts
├── 📁 events/                     # Event-Driven Architecture
│   ├── 📄 EventBus.ts             # Singleton event bus
│   ├── 📄 types.ts                # Event type definitions
│   ├── 📄 index.ts                # Module exports
│   └── 📁 handlers/
│       ├── 📄 station.handler.ts  # Station event handlers
│       ├── 📄 occupancy.handler.ts
│       ├── 📄 user.handler.ts
│       └── 📄 system.handler.ts
├── 📁 middleware/
│   └── 📄 auth.middleware.ts      # JWT verification & RBAC
├── 📁 models/
│   ├── 📄 user.ts                 # User schema (with roles)
│   └── 📄 Station.ts              # Station schema (with embedded occupancy)
├── 📁 routes/
│   ├── 📄 authenticatedRoute.ts
│   ├── 📄 station.routes.ts
│   └── 📄 recommendation.routes.ts
├── 📁 services/
│   ├── 📄 geo.service.ts          # Geospatial calculations
│   ├── 📄 station.service.ts
│   ├── 📄 status.service.ts
│   └── 📄 recommendation.service.ts
├── 📁 types/
│   └── 📄 vehicle.ts              # TypeScript interfaces
└── 📁 utils/
    ├── 📄 calculations.ts         # Battery/distance math
    └── 📄 scoring.ts              # MCDS scoring algorithm
```

---

## 5. UML Diagrams

### 5.1 Use Case Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          USE CASE DIAGRAM                                       │
│                   EV Charging Station Recommendation System                     │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────────────────────────────┐
                              │           SYSTEM BOUNDARY               │
                              │                                         │
    ┌──────┐                  │                                         │
    │      │                  │    ┌─────────────────────┐              │
    │  👤  │──────────────────┼───▶│   View Stations     │              │
    │      │                  │    └─────────────────────┘              │
    │ Anon │                  │               │                         │
    │ User │                  │               │ <<include>>             │
    │      │                  │               ▼                         │
    └──────┘                  │    ┌─────────────────────┐              │
        │                     │    │  Search by Location │              │
        │                     │    └─────────────────────┘              │
        │                     │                                         │
        │                     │    ┌─────────────────────┐              │
        └─────────────────────┼───▶│ Get Recommendations │              │
                              │    └─────────────────────┘              │
                              │               │                         │
                              │               │ <<extend>>              │
                              │               ▼                         │
                              │    ┌─────────────────────┐              │
                              │    │ Emergency Recommend │              │
                              │    └─────────────────────┘              │
                              │                                         │
    ┌──────┐                  │    ┌─────────────────────┐              │
    │      │──────────────────┼───▶│     Register        │              │
    │  👤  │                  │    └─────────────────────┘              │
    │      │                  │                                         │
    │  EV  │                  │    ┌─────────────────────┐              │
    │ User │──────────────────┼───▶│      Login          │              │
    │      │                  │    └─────────────────────┘              │
    └──────┘                  │                                         │
        │                     │    ┌─────────────────────┐              │
        │                     │    │  Manage Profile     │              │
        ├─────────────────────┼───▶│                     │              │
        │                     │    └─────────────────────┘              │
        │                     │               │                         │
        │                     │               │ <<include>>             │
        │                     │    ┌──────────┴──────────┐              │
        │                     │    ▼                     ▼              │
        │                     │ ┌──────────┐      ┌──────────┐          │
        │                     │ │  Update  │      │  Change  │          │
        │                     │ │ Password │      │  Details │          │
        │                     │ └──────────┘      └──────────┘          │
        │                     │                                         │
        │                     │    ┌─────────────────────┐              │
        ├─────────────────────┼───▶│ Manage Vehicle      │              │
        │                     │    │    Profiles         │              │
        │                     │    └─────────────────────┘              │
        │                     │               │                         │
        │                     │    ┌──────────┴──────────┐              │
        │                     │    ▼                     ▼              │
        │                     │ ┌──────────┐      ┌──────────┐          │
        │                     │ │   Add    │      │  Remove  │          │
        │                     │ │ Profile  │      │ Profile  │          │
        │                     │ └──────────┘      └──────────┘          │
        │                     │                                         │
        │                     │    ┌─────────────────────┐              │
        └─────────────────────┼───▶│ Manage Favorites    │              │
                              │    └─────────────────────┘              │
                              │                                         │
    ┌──────┐                  │    ┌─────────────────────┐              │
    │      │──────────────────┼───▶│  Create Station     │              │
    │  🏢  │                  │    └─────────────────────┘              │
    │      │                  │                                         │
    │Oper- │                  │    ┌─────────────────────┐              │
    │ator  │──────────────────┼───▶│  Manage Own Station │              │
    │      │                  │    └─────────────────────┘              │
    └──────┘                  │               │                         │
        │                     │    ┌──────────┼──────────┐              │
        │                     │    ▼          ▼          ▼              │
        │                     │ ┌───────┐ ┌───────┐ ┌───────┐           │
        │                     │ │Update │ │Delete │ │Manage │           │
        │                     │ │Station│ │Station│ │ Ports │           │
        │                     │ └───────┘ └───────┘ └───────┘           │
        │                     │                                         │
        │                     │    ┌─────────────────────┐              │
        └─────────────────────┼───▶│  Update Occupancy   │              │
                              │    └─────────────────────┘              │
                              │                                         │
    ┌──────┐                  │    ┌─────────────────────┐              │
    │      │──────────────────┼───▶│ Manage All Stations │              │
    │  🔧  │                  │    └─────────────────────┘              │
    │      │                  │                                         │
    │Admin │                  │    ┌─────────────────────┐              │
    │      │──────────────────┼───▶│   Manage Users      │              │
    │      │                  │    └─────────────────────┘              │
    └──────┘                  │               │                         │
        │                     │    ┌──────────┼──────────┐              │
        │                     │    ▼          ▼          ▼              │
        │                     │ ┌───────┐ ┌───────┐ ┌───────┐           │
        │                     │ │ View  │ │Create │ │Deact- │           │
        │                     │ │ All   │ │ Admin │ │ivate  │           │
        │                     │ │ Users │ │       │ │ User  │           │
        │                     │ └───────┘ └───────┘ └───────┘           │
        │                     │                                         │
        │                     │    ┌─────────────────────┐              │
        └─────────────────────┼───▶│  View System Events │              │
                              │    └─────────────────────┘              │
                              │                                         │
                              └─────────────────────────────────────────┘
```

### 5.2 Class Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLASS DIAGRAM                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│            <<model>>                │
│              User                   │
├─────────────────────────────────────┤
│ - _id: ObjectId                     │
│ - name: String                      │
│ - email: String                     │
│ - password: String                  │
│ - role: UserRole                    │
│ - company?: String                  │
│ - phone?: String                    │
│ - isActive: Boolean                 │
│ - vehicleProfiles: VehicleProfile[] │
│ - favoriteStations: ObjectId[]      │
│ - lastLogin?: Date                  │
│ - createdAt: Date                   │
│ - updatedAt: Date                   │
├─────────────────────────────────────┤
│ + comparePassword(pwd): Boolean     │
│ + generateAuthToken(): String       │
│ + isOperator(): Boolean             │
│ + isAdmin(): Boolean                │
│ + findByEmail(email): User          │
│ + findOperators(): User[]           │
│ + findAdmins(): User[]              │
└─────────────────────────────────────┘
                │
                │ 1:N (if operator)
                ▼
┌─────────────────────────────────────┐
│            <<model>>                │
│             Station                 │
├─────────────────────────────────────┤
│ - _id: ObjectId                     │
│ - name: String                      │
│ - operatorId: ObjectId              │
│ - location: GeoJSON Point           │
│ - address: String                   │
│ - ports: Port[]                     │
│ - operatingHours: String            │
│ - status: StationStatus             │
│ - lastStatusUpdate: Date            │
│ - createdAt: Date                   │
│ - updatedAt: Date                   │
├─────────────────────────────────────┤
│ + findNearby(lng, lat, r): Station[]│
│ + totalPorts: Number                │
│ + bikePorts: Port[]                 │
│ + carPorts: Port[]                  │
│ + getOccupiedCount(ct): Number      │
│ + getTotalOccupied(): Number        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐       ┌─────────────────────────────────┐
│          <<embedded>>               │       │         <<embedded>>            │
│         VehicleProfile              │       │             Port                │
├─────────────────────────────────────┤       ├─────────────────────────────────┤
│ - _id?: ObjectId                    │       │ - connectorType: ConnectorType  │
│ - vehicleType: VehicleType          │       │ - vehicleType: VehicleType      │
│ - batteryCapacity_kWh: Number       │       │ - powerKW: Number               │
│ - efficiency_kWh_per_km: Number     │       │ - total: Number                 │
│ - batteryPercent: Number            │       │ - occupied: Number (default: 0) │
│ - compatibleConnectors: String[]    │       │ - pricePerKWh: Number           │
└─────────────────────────────────────┘       └─────────────────────────────────┘

┌─────────────────────────────────────┐       ┌─────────────────────────────────┐
│         <<enumeration>>             │       │        <<enumeration>>          │
│            UserRole                 │       │         ConnectorType           │
├─────────────────────────────────────┤       ├─────────────────────────────────┤
│ user                                │       │ AC_SLOW                         │
│ operator                            │       │ Type2                           │
│ admin                               │       │ CCS                             │
└─────────────────────────────────────┘       │ CHAdeMO                         │
                                              └─────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SERVICES                                           │
├─────────────────────────────────────┬───────────────────────────────────────────┤
│           <<service>>               │              <<service>>                  │
│          StationService             │           RecommendationService           │
├─────────────────────────────────────┤───────────────────────────────────────────┤
│ + createStation(data): Station      │ + getRecommendations(req): Recommend[]    │
│ + getAllStations(filter): Station[] │ + getEmergencyStation(req): Recommend     │
│ + getStationById(id): Station       │ + scoreStation(station, profile): Number  │
│ + updateStation(id, data): Station  │ + calculateDistance(a, b): Number         │
│ + deleteStation(id): void           │ + calculateChargingTime(p, e): Number     │
│ + addPort(id, port): Station        │ + calculateCost(e, p): Number             │
└─────────────────────────────────────┴───────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EVENT BUS                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│           <<singleton>>                                                         │
│             EventBus                                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│ - instance: EventBus                                                            │
│ - handlers: Map<EventType, Set<Handler>>                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ + getInstance(): EventBus                                                       │
│ + publish<T>(event: T): void                                                    │
│ + subscribe<T>(type: EventType, handler: Handler<T>): UnsubscribeFn             │
│ + subscribeOnce<T>(type: EventType, handler: Handler<T>): UnsubscribeFn         │
│ + subscribeAll(handler: Handler): UnsubscribeFn                                 │
│ + publishAsync<T>(event: T): Promise<void>                                      │
│ + getHandlerCount(type: EventType): Number                                      │
│ + clearHandlers(type?: EventType): void                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Sequence Diagrams

#### 5.3.1 User Registration Sequence

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Client  │     │  Route  │     │Controller│     │  Model  │     │   DB    │     │EventBus │
└────┬────┘     └────┬────┘     └────┬─────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │               │               │
     │ POST /register│               │               │               │               │
     │ {name,email,  │               │               │               │               │
     │  password}    │               │               │               │               │
     │──────────────▶│               │               │               │               │
     │               │               │               │               │               │
     │               │  register()   │               │               │               │
     │               │──────────────▶│               │               │               │
     │               │               │               │               │               │
     │               │               │ validateInput │               │               │
     │               │               │──────┐        │               │               │
     │               │               │      │        │               │               │
     │               │               │◀─────┘        │               │               │
     │               │               │               │               │               │
     │               │               │ findByEmail() │               │               │
     │               │               │──────────────▶│               │               │
     │               │               │               │  findOne()    │               │
     │               │               │               │──────────────▶│               │
     │               │               │               │               │               │
     │               │               │               │     null      │               │
     │               │               │               │◀──────────────│               │
     │               │               │  null (unique)│               │               │
     │               │               │◀──────────────│               │               │
     │               │               │               │               │               │
     │               │               │   create()    │               │               │
     │               │               │──────────────▶│               │               │
     │               │               │               │               │               │
     │               │               │               │ hashPassword  │               │
     │               │               │               │──────┐        │               │
     │               │               │               │      │bcrypt  │               │
     │               │               │               │◀─────┘        │               │
     │               │               │               │               │               │
     │               │               │               │   insert()    │               │
     │               │               │               │──────────────▶│               │
     │               │               │               │               │               │
     │               │               │               │     user      │               │
     │               │               │               │◀──────────────│               │
     │               │               │     user      │               │               │
     │               │               │◀──────────────│               │               │
     │               │               │               │               │               │
     │               │               │generateToken()│               │               │
     │               │               │──────────────▶│               │               │
     │               │               │     JWT       │               │               │
     │               │               │◀──────────────│               │               │
     │               │               │               │               │               │
     │               │               │               │               │  publish()    │
     │               │               │───────────────┼───────────────┼──────────────▶│
     │               │               │               │               │ user.registered
     │               │               │               │               │               │
     │               │ {token, user} │               │               │               │
     │               │◀──────────────│               │               │               │
     │               │               │               │               │               │
     │ 201 Created   │               │               │               │               │
     │ {token, user} │               │               │               │               │
     │◀──────────────│               │               │               │               │
     │               │               │               │               │               │
```

#### 5.3.2 Get Recommendations Sequence

```
┌─────────┐   ┌─────────┐   ┌──────────┐   ┌───────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│ Client  │   │  Route  │   │Controller│   │ Recommend │   │  Geo    │   │ Station │   │  Status │
│         │   │         │   │          │   │  Service  │   │ Service │   │ Service │   │ Service │
└────┬────┘   └────┬────┘   └────┬─────┘   └─────┬─────┘   └────┬────┘   └────┬────┘   └────┬────┘
     │             │             │               │               │             │             │
     │ POST /recommendations     │               │               │             │             │
     │ {vehicleProfile,          │               │               │             │             │
     │  currentLocation}         │               │               │             │             │
     │────────────▶│             │               │               │             │             │
     │             │             │               │               │             │             │
     │             │ getRecommend│               │               │             │             │
     │             │────────────▶│               │               │             │             │
     │             │             │               │               │             │             │
     │             │             │ getRecommendations()          │             │             │
     │             │             │──────────────▶│               │             │             │
     │             │             │               │               │             │             │
     │             │             │               │ calculateReachable()        │             │
     │             │             │               │──────────────▶│             │             │
     │             │             │               │     range     │             │             │
     │             │             │               │◀──────────────│             │             │
     │             │             │               │               │             │             │
     │             │             │               │               │findNearby() │             │
     │             │             │               │───────────────┼────────────▶│             │
     │             │             │               │               │  stations[] │             │
     │             │             │               │◀──────────────┼─────────────│             │
     │             │             │               │               │             │             │
     │             │             │               │               │             │getStatus()  │
     │             │             │               │───────────────┼─────────────┼────────────▶│
     │             │             │               │               │             │  status[]   │
     │             │             │               │◀──────────────┼─────────────┼─────────────│
     │             │             │               │               │             │             │
     │             │             │               │ filterCompatible()          │             │
     │             │             │               │──────┐        │             │             │
     │             │             │               │      │        │             │             │
     │             │             │               │◀─────┘        │             │             │
     │             │             │               │               │             │             │
     │             │             │               │ scoreStations()             │             │
     │             │             │               │──────┐        │             │             │
     │             │             │               │      │ MCDS   │             │             │
     │             │             │               │◀─────┘        │             │             │
     │             │             │               │               │             │             │
     │             │             │               │ sortByScore() │             │             │
     │             │             │               │──────┐        │             │             │
     │             │             │               │      │        │             │             │
     │             │             │               │◀─────┘        │             │             │
     │             │             │               │               │             │             │
     │             │             │ recommendations[]             │             │             │
     │             │             │◀──────────────│               │             │             │
     │             │             │               │               │             │             │
     │             │   response  │               │               │             │             │
     │             │◀────────────│               │               │             │             │
     │             │             │               │               │             │             │
     │ 200 OK      │             │               │               │             │             │
     │ {recommendations}         │               │               │             │             │
     │◀────────────│             │               │               │             │             │
     │             │             │               │               │             │             │
```

#### 5.3.3 Station Creation with Events Sequence

```
┌─────────┐   ┌────────┐   ┌──────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│Operator │   │  Auth  │   │Controller│   │ Service │   │  Model  │   │EventBus │   │Handlers │
│ Client  │   │Midware │   │          │   │         │   │         │   │         │   │         │
└────┬────┘   └────┬───┘   └────┬─────┘   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘
     │             │            │              │             │             │             │
     │ POST /stations           │              │             │             │             │
     │ Auth: Bearer token       │              │             │             │             │
     │ {name, location,         │              │             │             │             │
     │  address, ports}         │              │             │             │             │
     │────────────▶│            │              │             │             │             │
     │             │            │              │             │             │             │
     │             │ verify JWT │              │             │             │             │
     │             │───┐        │              │             │             │             │
     │             │   │        │              │             │             │             │
     │             │◀──┘        │              │             │             │             │
     │             │            │              │             │             │             │
     │             │ check role │              │             │             │             │
     │             │ (operator) │              │             │             │             │
     │             │───┐        │              │             │             │             │
     │             │   │ ✓      │              │             │             │             │
     │             │◀──┘        │              │             │             │             │
     │             │            │              │             │             │             │
     │             │ req.user = │              │             │             │             │
     │             │ {id, role} │              │             │             │             │
     │             │───────────▶│              │             │             │             │
     │             │            │              │             │             │             │
     │             │            │createStation │              │             │             │
     │             │            │─────────────▶│             │             │             │
     │             │            │              │             │             │             │
     │             │            │              │ create()    │             │             │
     │             │            │              │────────────▶│             │             │
     │             │            │              │             │             │             │
     │             │            │              │   station   │             │             │
     │             │            │              │◀────────────│             │             │
     │             │            │              │             │             │             │
     │             │            │   station    │             │             │             │
     │             │            │◀─────────────│             │             │             │
     │             │            │              │             │             │             │
     │             │            │              │             │  publish()  │             │
     │             │            │──────────────┼─────────────┼────────────▶│             │
     │             │            │              │             │station.created            │
     │             │            │              │             │             │  notify()   │
     │             │            │              │             │             │────────────▶│
     │             │            │              │             │             │   [log,     │
     │             │            │              │             │             │    index,   │
     │             │            │              │             │             │    etc.]    │
     │             │            │              │             │             │             │
     │    201 Created           │              │             │             │             │
     │    {station}             │              │             │             │             │
     │◀────────────┼────────────│              │             │             │             │
     │             │            │              │             │             │             │
```

### 5.4 Activity Diagrams

#### 5.4.1 User Registration Activity

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     ACTIVITY DIAGRAM: User Registration                         │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────────────┐
                              │      START        │
                              │        ●          │
                              └─────────┬─────────┘
                                        │
                                        ▼
                              ┌───────────────────┐
                              │  Receive Request  │
                              │  (name, email,    │
                              │   password, role) │
                              └─────────┬─────────┘
                                        │
                                        ▼
                              ┌───────────────────┐
                              │ Validate Required │
                              │     Fields        │
                              └─────────┬─────────┘
                                        │
                          ┌─────────────┴─────────────┐
                          │                           │
                          ▼                           ▼
                    ┌──────────┐               ┌──────────┐
                    │  Valid?  │───── No ─────▶│  Return  │
                    │    ◇     │               │   400    │
                    └────┬─────┘               │  Error   │
                         │                     └──────────┘
                         │ Yes
                         ▼
                    ┌───────────────────┐
                    │   Validate Role   │
                    │ (user|operator|   │
                    │     admin)        │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
              ┌──────────┐        ┌──────────┐
              │role=admin│        │role!=admin│
              │    ◇     │        │    ◇     │
              └────┬─────┘        └─────┬────┘
                   │                    │
                   ▼                    │
              ┌──────────┐              │
              │ Requester│              │
              │ is admin?│              │
              └────┬─────┘              │
                   │                    │
          ┌────────┴────────┐           │
          │ No              │ Yes       │
          ▼                 │           │
    ┌──────────┐            │           │
    │  Return  │            │           │
    │   403    │            │           │
    │ Forbidden│            │           │
    └──────────┘            │           │
                            ▼           ▼
                    ┌───────────────────┐
                    │  Check Email      │
                    │  Uniqueness       │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
              ┌──────────┐        ┌──────────┐
              │  Exists  │        │Not Exists│
              │    ◇     │        │    ◇     │
              └────┬─────┘        └─────┬────┘
                   │                    │
                   ▼                    ▼
             ┌──────────┐        ┌───────────────────┐
             │  Return  │        │  Hash Password    │
             │   409    │        │  (bcrypt 12       │
             │ Conflict │        │   rounds)         │
             └──────────┘        └─────────┬─────────┘
                                           │
                                           ▼
                                 ┌───────────────────┐
                                 │   Create User     │
                                 │   in Database     │
                                 └─────────┬─────────┘
                                           │
                                           ▼
                                 ┌───────────────────┐
                                 │   Generate JWT    │
                                 │     Token         │
                                 └─────────┬─────────┘
                                           │
                                           ▼
                                 ┌───────────────────┐
                                 │  Publish Event    │
                                 │ 'user.registered' │
                                 └─────────┬─────────┘
                                           │
                                           ▼
                                 ┌───────────────────┐
                                 │  Return 201       │
                                 │  {token, user}    │
                                 └─────────┬─────────┘
                                           │
                                           ▼
                                 ┌───────────────────┐
                                 │       END         │
                                 │        ◉          │
                                 └───────────────────┘
```

#### 5.4.2 Recommendation Engine Activity

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                  ACTIVITY DIAGRAM: Get Recommendations                          │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────────────┐
                              │      START        │
                              │        ●          │
                              └─────────┬─────────┘
                                        │
                                        ▼
                    ┌───────────────────────────────────────┐
                    │         Receive Request               │
                    │  {vehicleProfile, currentLocation,    │
                    │   preferences, limit}                 │
                    └───────────────────┬───────────────────┘
                                        │
                                        ▼
                              ┌───────────────────┐
                              │ Calculate Battery │
                              │ Remaining Energy  │
                              │ = capacity × %    │
                              └─────────┬─────────┘
                                        │
                                        ▼
                              ┌───────────────────┐
                              │ Calculate Reachable│
                              │ Distance           │
                              │ = energy/efficiency│
                              │   × safety_buffer  │
                              └─────────┬─────────┘
                                        │
                                        ▼
                              ┌───────────────────┐
                              │ Query Stations    │
                              │ Within Radius     │
                              │ (MongoDB $geoNear)│
                              └─────────┬─────────┘
                                        │
                                        ▼
                          ┌─────────────┴─────────────┐
                          │                           │
                          ▼                           ▼
                    ┌──────────┐               ┌──────────┐
                    │ Stations │───── No ─────▶│  Return  │
                    │  Found?  │               │  Empty   │
                    │    ◇     │               │  Array   │────┐
                    └────┬─────┘               └──────────┘    │
                         │ Yes                                 │
                         ▼                                     │
                  ┌───────────────────┐                        │
                  │ Get Real-time     │                        │
                  │ Status for Each   │                        │
                  │ Station           │                        │
                  └─────────┬─────────┘                        │
                            │                                  │
                            ▼                                  │
        ┌───────────────────────────────────────┐              │
        │   FOR EACH Station                    │              │
        │   ┌───────────────────────────────┐   │              │
        │   │                               │   │              │
        │   │   Filter Compatible Ports     │   │              │
        │   │   (vehicleType + connectors)  │   │              │
        │   │                               │   │              │
        │   └───────────────┬───────────────┘   │              │
        │                   │                   │              │
        │                   ▼                   │              │
        │   ┌───────────────────────────────┐   │              │
        │   │ Has Compatible  │─── No ──────┼───┼──▶ Skip      │
        │   │    Ports?       │             │   │              │
        │   └───────┬─────────┘             │   │              │
        │           │ Yes                   │   │              │
        │           ▼                       │   │              │
        │   ┌───────────────────────────────┐   │              │
        │   │  Select Best Port             │   │              │
        │   │  (highest power compatible)   │   │              │
        │   └───────────────┬───────────────┘   │              │
        │                   │                   │              │
        │                   ▼                   │              │
        │   ┌───────────────────────────────┐   │              │
        │   │  Calculate Metrics:           │   │              │
        │   │  • Distance score             │   │              │
        │   │  • Availability score         │   │              │
        │   │  • Wait time score            │   │              │
        │   │  • Power score                │   │              │
        │   │  • Price score                │   │              │
        │   └───────────────┬───────────────┘   │              │
        │                   │                   │              │
        │                   ▼                   │              │
        │   ┌───────────────────────────────┐   │              │
        │   │  Calculate Weighted Score     │   │              │
        │   │  MCDS Algorithm               │   │              │
        │   └───────────────────────────────┘   │              │
        │                                       │              │
        └───────────────────────────────────────┘              │
                            │                                  │
                            ▼                                  │
                  ┌───────────────────┐                        │
                  │ Sort Stations     │                        │
                  │ by Score DESC     │                        │
                  └─────────┬─────────┘                        │
                            │                                  │
                            ▼                                  │
                  ┌───────────────────┐                        │
                  │ Apply Limit       │                        │
                  │ (default: 5)      │                        │
                  └─────────┬─────────┘                        │
                            │                                  │
                            ▼                                  │
                  ┌───────────────────┐                        │
                  │ Format Response   │◀───────────────────────┘
                  │ with Estimates    │
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │       END         │
                  │        ◉          │
                  └───────────────────┘
```

### 5.5 State Diagram

#### 5.5.1 Station Status State Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    STATE DIAGRAM: Station Lifecycle                             │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────────────┐
                              │     [START]       │
                              │        ●          │
                              └─────────┬─────────┘
                                        │
                                        │ create station
                                        ▼
                              ┌───────────────────┐
                              │                   │
                              │     INACTIVE      │
                              │    (initial)      │
                              │                   │
                              └─────────┬─────────┘
                                        │
                                        │ admin/operator
                                        │ activates
                                        ▼
        ┌──────────────────────────────────────────────────────────────┐
        │                                                              │
        │                        ACTIVE                                │
        │                                                              │
        │  ┌────────────────────────────────────────────────────────┐  │
        │  │                                                        │  │
        │  │  ┌──────────────────────────────────────────────────┐  │  │
        │  │  │                 AVAILABLE                         │  │  │
        │  │  │              (freeSlots > 0)                      │  │  │
        │  │  │                                                   │  │  │
        │  │  │   [entry] emit 'occupancy.available'              │  │  │
        │  │  │                                                   │  │  │
        │  │  └──────────────────────┬────────────────────────────┘  │  │
        │  │                         │                               │  │
        │  │                         │ all slots filled              │  │
        │  │                         │                               │  │
        │  │                         ▼                               │  │
        │  │  ┌──────────────────────────────────────────────────┐  │  │
        │  │  │                   FULL                            │  │  │
        │  │  │              (freeSlots = 0)                      │  │  │
        │  │  │                                                   │  │  │
        │  │  │   [entry] emit 'occupancy.full'                   │  │  │
        │  │  │                                                   │  │  │
        │  │  └──────────────────────┬────────────────────────────┘  │  │
        │  │                         │                               │  │
        │  │                         │ slot freed                    │  │
        │  │                         │                               │  │
        │  │                         ▼                               │  │
        │  │                  (back to AVAILABLE)                    │  │
        │  │                                                        │  │
        │  └────────────────────────────────────────────────────────┘  │
        │                                                              │
        └──────────────────────────────────┬───────────────────────────┘
                                           │
                                           │ admin/operator
                                           │ deactivates
                                           ▼
                              ┌───────────────────┐
                              │                   │
                              │     INACTIVE      │
                              │                   │
                              │  [entry] emit     │
                              │  'station.status  │
                              │   Changed'        │
                              │                   │
                              └─────────┬─────────┘
                                        │
                                        │ delete station
                                        ▼
                              ┌───────────────────┐
                              │     DELETED       │
                              │                   │
                              │  [entry] emit     │
                              │  'station.deleted'│
                              │                   │
                              └─────────┬─────────┘
                                        │
                                        ▼
                              ┌───────────────────┐
                              │      [END]        │
                              │        ◉          │
                              └───────────────────┘
```

#### 5.5.2 User Account State Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    STATE DIAGRAM: User Account Lifecycle                        │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────────────┐
                              │     [START]       │
                              │        ●          │
                              └─────────┬─────────┘
                                        │
                                        │ register
                                        │ emit 'user.registered'
                                        ▼
                              ┌───────────────────┐
                              │                   │
                              │     ACTIVE        │
                              │   (isActive=true) │
                              │                   │
                              └─────────┬─────────┘
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            │                           │                           │
            │ login                     │                           │ admin
            │ emit 'user.loggedIn'      │                           │ deactivates
            ▼                           │                           ▼
  ┌───────────────────┐                 │               ┌───────────────────┐
  │                   │                 │               │                   │
  │   AUTHENTICATED   │                 │               │   DEACTIVATED     │
  │  (has valid JWT)  │                 │               │ (isActive=false)  │
  │                   │                 │               │                   │
  └─────────┬─────────┘                 │               │ [entry] emit      │
            │                           │               │ 'user.deactivated'│
            │ token expires             │               │                   │
            │ or logout                 │               └─────────┬─────────┘
            ▼                           │                         │
  ┌───────────────────┐                 │                         │ admin
  │                   │                 │                         │ reactivates
  │   UNAUTHENTICATED │◀────────────────┘                         │
  │  (no valid JWT)   │                                           │
  │                   │◀──────────────────────────────────────────┘
  └───────────────────┘
```

### 5.6 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           COMPONENT DIAGRAM                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                       │
│  ┌──────────────────────┐    ┌──────────────────────┐                          │
│  │    📱 Mobile App     │    │  💻 Web Dashboard    │                          │
│  │    (EV Users)        │    │    (Operators)       │                          │
│  └──────────┬───────────┘    └──────────┬───────────┘                          │
│             │                           │                                       │
│             └────────────┬──────────────┘                                       │
│                          │ HTTP/REST                                            │
└──────────────────────────┼──────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                    │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                        Express Application                                │  │
│  │                          (app.ts)                                         │  │
│  └────────────────────────────────┬─────────────────────────────────────────┘  │
│                                   │                                             │
│  ┌────────────────────────────────┼─────────────────────────────────────────┐  │
│  │                            ROUTES                                         │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │  │
│  │  │  Auth Routes    │  │ Station Routes  │  │  Recommendation Routes  │   │  │
│  │  │                 │  │                 │  │                         │   │  │
│  │  │ /api/v1/auth    │  │/api/v1/stations │  │ /api/v1/recommendations │   │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘   │  │
│  │           │                    │                        │                │  │
│  └───────────┼────────────────────┼────────────────────────┼────────────────┘  │
│              │                    │                        │                   │
│  ┌───────────┴────────────────────┴────────────────────────┴───────────────┐   │
│  │                         MIDDLEWARE                                       │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │   │
│  │  │ Body Parser     │  │ Auth Middleware │  │   Error Handler         │  │   │
│  │  │ (JSON/URL)      │  │ (JWT + RBAC)    │  │                         │  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BUSINESS LOGIC LAYER                                  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                          CONTROLLERS                                      │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │  │
│  │  │ Auth Controller │  │Station Controller│  │ Recommend Controller   │   │  │
│  │  │                 │  │                 │  │                         │   │  │
│  │  │ • register      │  │ • createStation │  │ • getRecommendations    │   │  │
│  │  │ • login         │  │ • updateStation │  │ • getEmergency          │   │  │
│  │  │ • getMe         │  │ • deleteStation │  │ • getNearby             │   │  │
│  │  │ • updateProfile │  │ • addPort       │  │                         │   │  │
│  │  │ • addVehicle    │  │ • updateOccupancy│ │                         │   │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘   │  │
│  └───────────┼────────────────────┼────────────────────────┼────────────────┘  │
│              │                    │                        │                   │
│              └────────────────────┼────────────────────────┘                   │
│                                   │                                            │
│                                   ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                           EVENT BUS                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │  │
│  │  │                    EventBus (Singleton)                             │ │  │
│  │  │                                                                     │ │  │
│  │  │  publish() ─────▶ [station.*, user.*, occupancy.*, system.*]       │ │  │
│  │  │                                                                     │ │  │
│  │  └──────────────────────────────────┬──────────────────────────────────┘ │  │
│  │                                     │                                    │  │
│  │  ┌──────────────────────────────────┼───────────────────────────────┐    │  │
│  │  │                            HANDLERS                              │    │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │    │  │
│  │  │  │  Station    │  │  Occupancy  │  │    User     │  │ System  │ │    │  │
│  │  │  │  Handler    │  │   Handler   │  │   Handler   │  │ Handler │ │    │  │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │    │  │
│  │  └──────────────────────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                   │                                            │
│                                   ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                           SERVICES                                        │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │  │
│  │  │ Station Service │  │  Status Service │  │    Geo Service          │   │  │
│  │  │                 │  │                 │  │                         │   │  │
│  │  │ • createStation │  │ • getStatus     │  │ • calculateDistance     │   │  │
│  │  │ • updateStation │  │ • updateOccupancy│ │ • findNearby            │   │  │
│  │  │ • deleteStation │  │ • increment     │  │ • isWithinRadius        │   │  │
│  │  └─────────────────┘  │ • decrement     │  └─────────────────────────┘   │  │
│  │                       └─────────────────┘                                │  │
│  │  ┌───────────────────────────────────────────────────────────────────┐   │  │
│  │  │              Recommendation Service                                │   │  │
│  │  │                                                                    │   │  │
│  │  │  • getRecommendations    • scoreStation    • calculateWaitTime    │   │  │
│  │  └───────────────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                           UTILITIES                                       │  │
│  │  ┌─────────────────────────────┐  ┌─────────────────────────────────┐    │  │
│  │  │      calculations.ts        │  │         scoring.ts              │    │  │
│  │  │                             │  │                                 │    │  │
│  │  │ • calculateDistance         │  │ • normalizeInverse              │    │  │
│  │  │ • calculateChargingTime     │  │ • normalizeDirect               │    │  │
│  │  │ • calculateCost             │  │ • calculateDistanceScore        │    │  │
│  │  │ • calculateReachableDistance│  │ • calculateAvailabilityScore    │    │  │
│  │  │ • calculateEnergyNeeded     │  │ • calculateFinalScore (MCDS)    │    │  │
│  │  └─────────────────────────────┘  └─────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DATA ACCESS LAYER                                     │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                           MODELS (Mongoose)                               │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │  │
│  │  │   User Model    │  │  Station Model  │  │  StationStatus Model    │   │  │
│  │  │                 │  │                 │  │                         │   │  │
│  │  │ Schema + Methods│  │ Schema + Indexes│  │  Schema + Methods       │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                        │                                       │
│                                        │ Mongoose ODM                          │
│                                        ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                           MongoDB Driver                                  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE LAYER                                        │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                        MongoDB Database                                   │  │
│  │                    ev_charging_station                                    │  │
│  │                                                                           │  │
│  │  ┌─────────────────┐  ┌──────────────────────────────────────────────┐   │  │
│  │  │  users          │  │   stations                                   │   │  │
│  │  │  Collection     │  │   Collection (with embedded port occupancy)  │   │  │
│  │  │                 │  │                                              │   │  │
│  │  │ • email idx     │  │ • 2dsphere idx                               │   │  │
│  │  │ • role idx      │  │ • status idx                                 │   │  │
│  │  └─────────────────┘  └──────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.7 Deployment Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DEPLOYMENT DIAGRAM                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                           │
└───────────────────────────────────┬─────────────────────────────────────────────┘
                                    │
                                    │ HTTPS (443)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         <<cloud>>                                               │
│                    Load Balancer / Reverse Proxy                                │
│                         (NGINX / AWS ALB)                                       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ • SSL Termination                                                        │   │
│  │ • Request Distribution                                                   │   │
│  │ • Health Checks                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└───────────────────────────────────┬─────────────────────────────────────────────┘
                                    │
                                    │ HTTP (3000)
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                            <<execution environment>>                          │
│                              Application Tier                                  │
│                                                                               │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │  <<device>>         │  │  <<device>>         │  │  <<device>>         │   │
│  │  API Server 1       │  │  API Server 2       │  │  API Server N       │   │
│  │                     │  │                     │  │                     │   │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────┐  │   │
│  │  │ <<artifact>>  │  │  │  │ <<artifact>>  │  │  │  │ <<artifact>>  │  │   │
│  │  │ Node.js 22.x  │  │  │  │ Node.js 22.x  │  │  │  │ Node.js 22.x  │  │   │
│  │  │               │  │  │  │               │  │  │  │               │  │   │
│  │  │ Express 5.2.x │  │  │  │ Express 5.2.x │  │  │  │ Express 5.2.x │  │   │
│  │  │               │  │  │  │               │  │  │  │               │  │   │
│  │  │ ev-api.js     │  │  │  │ ev-api.js     │  │  │  │ ev-api.js     │  │   │
│  │  └───────────────┘  │  │  └───────────────┘  │  │  └───────────────┘  │   │
│  │                     │  │                     │  │                     │   │
│  │  Port: 3000         │  │  Port: 3000         │  │  Port: 3000         │   │
│  │  RAM: 512MB         │  │  RAM: 512MB         │  │  RAM: 512MB         │   │
│  │  CPU: 1 vCPU        │  │  CPU: 1 vCPU        │  │  CPU: 1 vCPU        │   │
│  │                     │  │                     │  │                     │   │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘   │
│                                                                               │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                    │
                                    │ MongoDB Protocol (27017)
                                    ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                            <<execution environment>>                          │
│                               Database Tier                                    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                     <<device>>                                           │  │
│  │                   MongoDB Atlas Cluster                                  │  │
│  │                                                                          │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │  │
│  │  │  <<artifact>>   │  │  <<artifact>>   │  │     <<artifact>>        │  │  │
│  │  │    PRIMARY      │  │   SECONDARY     │  │      SECONDARY          │  │  │
│  │  │                 │  │                 │  │                         │  │  │
│  │  │  MongoDB 7.x    │  │  MongoDB 7.x    │  │     MongoDB 7.x         │  │  │
│  │  │                 │  │                 │  │                         │  │  │
│  │  │  Read/Write     │  │  Read Replica   │  │     Read Replica        │  │  │
│  │  │                 │  │                 │  │                         │  │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │  │
│  │                                                                          │  │
│  │  Database: ev_charging_station                                           │  │
│  │  Storage: SSD                                                            │  │
│  │  Backup: Continuous                                                      │  │
│  │                                                                          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│                           DEVELOPMENT ENVIRONMENT                             │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                     <<device>>                                           │  │
│  │                  Developer Machine                                       │  │
│  │                                                                          │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │  │
│  │  │  <<artifact>>   │  │  <<artifact>>   │  │     <<artifact>>        │  │  │
│  │  │   VS Code       │  │   Node.js 22    │  │     MongoDB Local       │  │  │
│  │  │                 │  │                 │  │                         │  │  │
│  │  │ + ESLint        │  │  ts-node-dev    │  │     Port: 27017         │  │  │
│  │  │ + TypeScript    │  │  (hot reload)   │  │                         │  │  │
│  │  │ + Jest          │  │  Port: 3000     │  │     ev_charging_station │  │  │
│  │  │                 │  │                 │  │                         │  │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │  │
│  │                                                                          │  │
│  │  ┌───────────────────────────────────────────────────────────────────┐   │  │
│  │  │                        config.env                                  │   │  │
│  │  │  PORT=3000                                                        │   │  │
│  │  │  MONGODB_URI=mongodb://127.0.0.1:27017/ev_charging_station        │   │  │
│  │  │  NODE_ENV=development                                             │   │  │
│  │  │  JWT_SECRET=your-secret-key                                       │   │  │
│  │  │  JWT_EXPIRES_IN=7d                                                │   │  │
│  │  └───────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 5.8 Object Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           OBJECT DIAGRAM                                        │
│                    (Runtime Instance Example)                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER OBJECTS                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────────────┐      ┌───────────────────────────────┐      │
│  │ :User                         │      │ :User                         │      │
│  │ <<EV User>>                   │      │ <<Operator>>                  │      │
│  ├───────────────────────────────┤      ├───────────────────────────────┤      │
│  │ _id = "65b1a2b3c4d5e6f7"      │      │ _id = "65b2c3d4e5f6a7b8"      │      │
│  │ name = "Rahul Sharma"         │      │ name = "Priya Patel"          │      │
│  │ email = "rahul@example.com"   │      │ email = "priya@evcharge.com"  │      │
│  │ role = "user"                 │      │ role = "operator"             │      │
│  │ isActive = true               │      │ company = "EV Charge India"   │      │
│  │ vehicleProfiles = [...]       │      │ isActive = true               │      │
│  │ favoriteStations = [...]      │      │ phone = "+91-9876543210"      │      │
│  └───────────────────────────────┘      └───────────────────────────────┘      │
│         │                                        │                             │
│         │ has                                    │ owns                        │
│         ▼                                        │                             │
│  ┌───────────────────────────────┐              │                             │
│  │ :VehicleProfile               │              │                             │
│  ├───────────────────────────────┤              │                             │
│  │ _id = "6abc123..."            │              │                             │
│  │ vehicleType = "car"           │              │                             │
│  │ batteryCapacity_kWh = 60      │              │                             │
│  │ efficiency_kWh_per_km = 0.18  │              │                             │
│  │ batteryPercent = 35           │              │                             │
│  │ compatibleConnectors =        │              │                             │
│  │   ["CCS", "Type2"]            │              │                             │
│  └───────────────────────────────┘              │                             │
│                                                  │                             │
└──────────────────────────────────────────────────┼─────────────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             STATION OBJECTS                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ :Station                                                                   │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │ _id = "65c3d4e5f6a7b8c9"                                                  │ │
│  │ name = "EV Hub Connaught Place"                                           │ │
│  │ operatorId = "65b2c3d4e5f6a7b8" ─────────────────────────▶ :User (Priya)  │ │
│  │ location = { type: "Point", coordinates: [77.2195, 28.6315] }             │ │
│  │ address = "Block A, Connaught Place, New Delhi - 110001"                  │ │
│  │ operatingHours = "24/7"                                                   │ │
│  │ status = "active"                                                         │ │
│  │ ports = [...]                                                             │ │
│  └─────────────────────────────────────────────────────────────────┬─────────┘ │
│                                                                     │          │
│            ┌────────────────────────────────────────────────────────┘          │
│            │ has                                                               │
│            ▼                                                                   │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                     │
│  │ :Port                   │  │ :Port                   │                     │
│  ├─────────────────────────┤  ├─────────────────────────┤                     │
│  │ connectorType = "CCS"   │  │ connectorType = "Type2" │                     │
│  │ vehicleType = "car"     │  │ vehicleType = "car"     │                     │
│  │ powerKW = 150           │  │ powerKW = 22            │                     │
│  │ total = 4               │  │ total = 8               │                     │
│  │ occupied = 2            │  │ occupied = 3            │                     │
│  │ pricePerKWh = 18        │  │ pricePerKWh = 12        │                     │
│  └─────────────────────────┘  └─────────────────────────┘                     │
│                                                                                 │
│  Note: Occupancy is tracked directly in each Port with the `occupied` field.   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          EVENT BUS RUNTIME                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ :EventBus <<singleton>>                                                    │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │ handlers = Map {                                                          │ │
│  │   "station.created" => Set { handler1, handler2 }                         │ │
│  │   "station.updated" => Set { handler3 }                                   │ │
│  │   "station.deleted" => Set { handler4 }                                   │ │
│  │   "occupancy.updated" => Set { handler5, handler6 }                       │ │
│  │   "occupancy.full" => Set { handler7 }                                    │ │
│  │   "user.registered" => Set { handler8 }                                   │ │
│  │   "user.loggedIn" => Set { handler9 }                                     │ │
│  │   "*" => Set { monitorHandler }                                           │ │
│  │ }                                                                         │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  Recent Events:                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ :StationCreatedEvent                                                       │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │ type = "station.created"                                                  │ │
│  │ timestamp = 2026-02-04T10:25:00Z                                          │ │
│  │ userId = "65b2c3d4e5f6a7b8"                                               │ │
│  │ payload = {                                                               │ │
│  │   stationId: "65c3d4e5f6a7b8c9",                                          │ │
│  │   operatorId: "65b2c3d4e5f6a7b8",                                         │ │
│  │   name: "EV Hub Connaught Place",                                         │ │
│  │   location: { longitude: 77.2195, latitude: 28.6315 },                    │ │
│  │   portCount: 2                                                            │ │
│  │ }                                                                         │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Flow Diagram

### 6.1 Context Diagram (Level 0)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    DATA FLOW DIAGRAM - LEVEL 0 (Context)                        │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────────┐
                              │                     │
      ┌───────┐               │                     │               ┌───────┐
      │       │  Location,    │                     │   Station     │       │
      │  EV   │  Vehicle ────▶│                     │◀──── Info ────│Station│
      │ User  │  Profile      │                     │               │       │
      │       │◀──────────────│                     │               └───────┘
      │       │ Recommendations│        0           │
      └───────┘               │                     │
                              │   EV Charging       │
      ┌───────┐               │   Station           │               ┌───────┐
      │       │  Credentials  │   Recommendation    │   Create/     │       │
      │Operator│─────────────▶│   System            │◀── Update ────│Station│
      │       │               │                     │   Station     │Status │
      │       │◀──────────────│                     │               │       │
      │       │  Auth Token,  │                     │               └───────┘
      └───────┘  Station Data │                     │
                              │                     │
      ┌───────┐               │                     │
      │       │  Admin        │                     │
      │ Admin │  Commands ───▶│                     │
      │       │               │                     │
      │       │◀──────────────│                     │
      │       │ System Data,  │                     │
      └───────┘ User List     │                     │
                              │                     │
                              └─────────────────────┘
```

### 6.2 Level 1 DFD

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    DATA FLOW DIAGRAM - LEVEL 1                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐                                                      ┌─────────┐
    │         │                                                      │         │
    │ EV User │                                                      │Operator │
    │         │                                                      │         │
    └────┬────┘                                                      └────┬────┘
         │                                                                │
         │ credentials                                                    │ credentials
         ▼                                                                ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                                                                         │
    │                           1.0                                           │
    │                    Authentication                                       │
    │                       Process                                           │
    │                                                                         │
    └────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     │ authenticated user
                                     ▼
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
    ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
    │                 │      │                 │      │                 │
    │      2.0        │      │      3.0        │      │      4.0        │
    │   Get Station   │      │    Manage       │      │   Generate      │
    │   Information   │      │   Stations      │      │ Recommendations │
    │                 │      │                 │      │                 │
    └────────┬────────┘      └────────┬────────┘      └────────┬────────┘
             │                        │                        │
             │                        │                        │
             ▼                        ▼                        │
    ┌─────────────────────────────────────────┐               │
    │              D1                          │               │
    │           stations                       │◀──────────────┘
    │  (MongoDB - with embedded occupancy)     │
    │                                          │
    └─────────────────────────────────────────┘

    ┌─────────────────────────────────────────┐
    │              D2                          │
    │            users                         │
    │          (MongoDB)                       │
    │                                          │
    └─────────────────────────────────────────┘
```

---

## 7. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIP DIAGRAM                              │
│                          (Role-Based Access Control)                            │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────────────┐
    │                           USER                                       │
    ├──────────────────────────────────────────────────────────────────────┤
    │ PK  _id: ObjectId                                                    │
    │     name: String                                                     │
    │     email: String ◉ (unique)                                         │
    │     password: String (hashed)                                        │
    │     role: "user" | "operator" | "admin"  ◄── RBAC                   │
    │     company?: String (required for operators)                        │
    │     phone?: String                                                   │
    │     isActive: Boolean                                                │
    │     vehicleProfiles: [VehicleProfile]  ◄── Embedded                 │
    │     favoriteStations: [ObjectId] ──────────┐                         │
    │     createdAt, updatedAt                   │                         │
    └──────────────┬─────────────────────────────┼─────────────────────────┘
                   │                             │
                   │ 1:N (operators/admins)      │ N:M (favorites)
                   │ "owns"                      │ "favorites"
                   ▼                             │
    ┌──────────────────────────────────────┐     │
    │              STATION                 │     │
    ├──────────────────────────────────────┤     │
    │ PK  _id: ObjectId                    │◀────┘
    │ FK  operatorId: ObjectId ◄── owner   │
    │     name: String                     │
    │     location: GeoJSON Point          │
    │     address: String                  │
    │     ports: [Port] ◄── Embedded       │
    │     operatingHours: String           │
    │     status: "active" | "inactive"    │
    │     lastStatusUpdate: Date           │
    │     createdAt, updatedAt             │
    └──────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────────────┐
    │              EMBEDDED DOCUMENTS                                       │
    ├──────────────────────────────────────────────────────────────────────┤
    │                                                                      │
    │  VEHICLE_PROFILE (embedded in User)    │  PORT (embedded in Station) │
    │  ─────────────────────────────────     │  ─────────────────────────  │
    │  _id: ObjectId                         │  connectorType: enum        │
    │  vehicleType: "bike" | "car"           │  vehicleType: "bike"|"car"  │
    │  batteryCapacity_kWh: Number           │  powerKW: Number            │
    │  efficiency_kWh_per_km: Number         │  total: Number              │
    │  batteryPercent: Number                │  occupied: Number (def: 0)  │
    │  compatibleConnectors: [String]        │  pricePerKWh: Number        │
    │                                                                      │
    └──────────────────────────────────────────────────────────────────────┘

    RELATIONSHIP SUMMARY:
    ─────────────────────
    • User (1) ───owns───▶ (N) Station        [Only if role = operator/admin]
    • User (N) ◀──favorites──▶ (M) Station    [Any user can favorite]
    • VehicleProfile ───embedded in───▶ User
    • Port (with occupancy) ───embedded in───▶ Station
```

---

## 8. Database Design

### 8.1 Collections

| Collection | Description                          | Indexes                                 |
| ---------- | ------------------------------------ | --------------------------------------- |
| `users`    | User accounts with roles             | email (unique), role                    |
| `stations` | Charging station data with occupancy | location (2dsphere), status, operatorId |

### 8.2 Schema Details

#### User Schema

```javascript
{
  name: { type: String, required: true, min: 2, max: 100 },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, min: 8, select: false },
  role: { type: String, enum: ['user', 'operator', 'admin'], default: 'user' },
  company: { type: String, max: 200 },
  phone: { type: String },
  isActive: { type: Boolean, default: true },
  vehicleProfiles: [{
    vehicleType: { type: String, enum: ['bike', 'car'] },
    batteryCapacity_kWh: Number,
    efficiency_kWh_per_km: Number,
    batteryPercent: Number,
    compatibleConnectors: [String]
  }],
  favoriteStations: [{ type: ObjectId, ref: 'Station', max: 20 }],
  lastLogin: Date
}
```

#### Station Schema

```javascript
{
  name: { type: String, required: true, max: 100 },
  operatorId: { type: ObjectId, ref: 'User', required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  address: { type: String, required: true },
  ports: [{
    connectorType: { type: String, enum: ['AC_SLOW', 'Type2', 'CCS', 'CHAdeMO'] },
    vehicleType: { type: String, enum: ['bike', 'car'] },
    powerKW: { type: Number, min: 0.5, max: 350 },
    total: { type: Number, min: 1 },
    occupied: { type: Number, min: 0, default: 0 },  // Current occupancy
    pricePerKWh: { type: Number, min: 0 }
  }],
  operatingHours: { type: String, default: '24/7' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}
```

---

## 9. API Design

### 9.1 RESTful Endpoints

| Method   | Endpoint                            | Access        | Description         |
| -------- | ----------------------------------- | ------------- | ------------------- |
| `GET`    | `/health`                           | Public        | Health check        |
| `POST`   | `/api/v1/auth/register`             | Public        | Register user       |
| `POST`   | `/api/v1/auth/login`                | Public        | Login               |
| `GET`    | `/api/v1/auth/me`                   | Authenticated | Get profile         |
| `PATCH`  | `/api/v1/auth/me`                   | Authenticated | Update profile      |
| `POST`   | `/api/v1/auth/vehicle-profiles`     | Authenticated | Add vehicle         |
| `DELETE` | `/api/v1/auth/vehicle-profiles/:id` | Authenticated | Remove vehicle      |
| `POST`   | `/api/v1/auth/favorites/:stationId` | Authenticated | Add favorite        |
| `DELETE` | `/api/v1/auth/favorites/:stationId` | Authenticated | Remove favorite     |
| `GET`    | `/api/v1/auth/users`                | Admin         | List users          |
| `POST`   | `/api/v1/auth/users`                | Admin         | Create admin        |
| `PATCH`  | `/api/v1/auth/users/:id/status`     | Admin         | Deactivate user     |
| `GET`    | `/api/v1/stations`                  | Public        | List stations       |
| `GET`    | `/api/v1/stations/:id`              | Public        | Get station         |
| `GET`    | `/api/v1/stations/my-stations`      | Operator      | Own stations        |
| `POST`   | `/api/v1/stations`                  | Operator      | Create station      |
| `PATCH`  | `/api/v1/stations/:id`              | Owner/Admin   | Update station      |
| `DELETE` | `/api/v1/stations/:id`              | Owner/Admin   | Delete station      |
| `POST`   | `/api/v1/stations/:id/ports`        | Owner/Admin   | Add port            |
| `PATCH`  | `/api/v1/stations/:id/occupancy`    | Owner/Admin   | Update occupancy    |
| `GET`    | `/api/v1/recommendations/nearby`    | Public        | Nearby stations     |
| `POST`   | `/api/v1/recommendations`           | Public        | Get recommendations |
| `POST`   | `/api/v1/recommendations/emergency` | Public        | Emergency mode      |

### 9.2 Role-Based Access Matrix

| Endpoint            | Anonymous | User | Operator | Admin |
| ------------------- | :-------: | :--: | :------: | :---: |
| View stations       |    ✅     |  ✅  |    ✅    |  ✅   |
| Get recommendations |    ✅     |  ✅  |    ✅    |  ✅   |
| Manage profile      |    ❌     |  ✅  |    ✅    |  ✅   |
| Create station      |    ❌     |  ❌  |    ✅    |  ✅   |
| Manage own station  |    ❌     |  ❌  |    ✅    |  ✅   |
| Manage any station  |    ❌     |  ❌  |    ❌    |  ✅   |
| Manage users        |    ❌     |  ❌  |    ❌    |  ✅   |

---

## 10. Event-Driven Architecture

### 10.1 Overview

The system implements a publish-subscribe pattern using a singleton EventBus for loose coupling between components.

### 10.2 Event Categories

| Category      | Events                                                                                                         | Description              |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **Station**   | `station.created`, `station.updated`, `station.deleted`, `station.statusChanged`                               | Station lifecycle events |
| **Occupancy** | `occupancy.updated`, `occupancy.incremented`, `occupancy.decremented`, `occupancy.full`, `occupancy.available` | Real-time availability   |
| **User**      | `user.registered`, `user.loggedIn`, `user.updated`, `user.deactivated`                                         | User lifecycle           |
| **Vehicle**   | `vehicleProfile.added`, `vehicleProfile.removed`                                                               | Profile changes          |
| **Favorites** | `favorite.added`, `favorite.removed`                                                                           | Favorite management      |
| **System**    | `system.error`, `system.startup`, `system.shutdown`                                                            | System events            |

### 10.3 Event Flow

```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   Controller     │      │    EventBus      │      │    Handlers      │
│                  │      │   (Singleton)    │      │                  │
│  • Creates event │─────▶│  • Receives      │─────▶│  • Logging       │
│  • Publishes     │      │  • Routes to     │      │  • Analytics     │
│                  │      │    subscribers   │      │  • Notifications │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

### 10.4 Benefits

1. **Loose Coupling**: Controllers don't know about handlers
2. **Extensibility**: Add new handlers without modifying controllers
3. **Audit Trail**: All significant actions emit events
4. **Real-time Ready**: Foundation for WebSocket notifications
5. **Testability**: Easy to mock event bus in tests

---

## 11. Security Design

### 11.1 Authentication Flow

```
Client → POST /login → Validate Credentials → Generate JWT → Return Token
Client → Request + Bearer Token → Verify JWT → Extract User → Process Request
```

### 11.2 Security Measures

| Category       | Measure             | Implementation         |
| -------------- | ------------------- | ---------------------- |
| Authentication | JWT with expiration | 7-day tokens           |
| Password       | Bcrypt hashing      | 12 salt rounds         |
| Authorization  | Role-based access   | Middleware checks      |
| Input          | Schema validation   | Mongoose validators    |
| Errors         | Sanitized responses | No stack in production |

### 11.3 JWT Structure

```javascript
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "role": "operator",
  "iat": 1706356800,
  "exp": 1706961600
}
```

---

## 12. Testing Strategy

### 12.1 Test Coverage

| Category                |  Tests  | Status |
| ----------------------- | :-----: | :----: |
| Unit - Calculations     |   21    |   ✅   |
| Unit - Scoring          |   21    |   ✅   |
| Unit - Recommendation   |    8    |   ✅   |
| Integration - API       |   13    |   ✅   |
| Integration - Auth      |   12    |   ✅   |
| Integration - Ownership |   32    |   ✅   |
| **Total**               | **107** |   ✅   |

### 12.2 Testing Tools

- **Jest 30.2.0**: Test runner with TypeScript support
- **Supertest**: HTTP assertions
- **MongoDB Memory Server**: In-memory database for tests

---

## Appendix A: Technology Stack

| Layer     | Technology   | Version |
| --------- | ------------ | ------- |
| Runtime   | Node.js      | 22.x    |
| Framework | Express      | 5.2.x   |
| Language  | TypeScript   | 5.x     |
| Database  | MongoDB      | 7.x     |
| ODM       | Mongoose     | 9.1.x   |
| Auth      | jsonwebtoken | 9.x     |
| Hashing   | bcryptjs     | 3.x     |
| Testing   | Jest         | 30.x    |

---

**Document Version:** 3.0.0  
**Last Updated:** February 4, 2026  
**Author:** System Design Team
