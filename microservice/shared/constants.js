/**
 * ============================================================================
 * SHARED CONSTANTS
 * ============================================================================
 *
 * This file contains constants shared across all microservices.
 * In a microservices architecture, having shared constants helps maintain
 * consistency across services without tight coupling.
 *
 * LEARNING POINT:
 * While microservices should be independent, some things like API versions,
 * event types, and validation rules should be consistent across services.
 * We share these through a common package/module.
 */

// ============================================================================
// SERVICE URLS - Service Discovery
// ============================================================================
// In production, you'd use a service registry (Consul, etcd, Kubernetes DNS)
// For learning, we use simple hardcoded URLs

const SERVICE_URLS = {
  API_GATEWAY: process.env.API_GATEWAY_URL || "http://localhost:3000",
  AUTH_SERVICE: process.env.AUTH_SERVICE_URL || "http://localhost:3001",
  USER_SERVICE: process.env.USER_SERVICE_URL || "http://localhost:3002",
  STATION_SERVICE: process.env.STATION_SERVICE_URL || "http://localhost:3003",
  RECOMMENDATION_SERVICE:
    process.env.RECOMMENDATION_SERVICE_URL || "http://localhost:3004",
};

// ============================================================================
// DATABASE URLS - Each service has its own database
// ============================================================================
// This is the "Database per Service" pattern - a key microservices principle
// Each service owns and manages its data independently

const DATABASE_URLS = {
  AUTH_DB: process.env.AUTH_DB_URL || "mongodb://localhost:27017/ev_auth_db",
  USER_DB: process.env.USER_DB_URL || "mongodb://localhost:27017/ev_users_db",
  STATION_DB:
    process.env.STATION_DB_URL || "mongodb://localhost:27017/ev_stations_db",
};

// ============================================================================
// API VERSION
// ============================================================================
const API_VERSION = "v1";
const API_PREFIX = `/api/${API_VERSION}`;

// ============================================================================
// USER ROLES
// ============================================================================
const USER_ROLES = {
  USER: "user",
  OPERATOR: "operator",
  ADMIN: "admin",
};

// ============================================================================
// VEHICLE TYPES
// ============================================================================
const VEHICLE_TYPES = {
  BIKE: "bike",
  CAR: "car",
};

// ============================================================================
// CONNECTOR TYPES
// ============================================================================
const CONNECTOR_TYPES = {
  AC_SLOW: "AC_SLOW",
  TYPE2: "Type2",
  CCS: "CCS",
  CHADEMO: "CHAdeMO",
};

// ============================================================================
// STATION STATUS
// ============================================================================
const STATION_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

// ============================================================================
// EVENT TYPES - For inter-service communication
// ============================================================================
// These are the events that services can publish and subscribe to
const EVENT_TYPES = {
  // User events
  USER_REGISTERED: "user.registered",
  USER_LOGGED_IN: "user.loggedIn",
  USER_UPDATED: "user.updated",

  // Station events
  STATION_CREATED: "station.created",
  STATION_UPDATED: "station.updated",
  STATION_DELETED: "station.deleted",

  // Occupancy events
  OCCUPANCY_CHANGED: "occupancy.changed",
  OCCUPANCY_FULL: "occupancy.full",
  OCCUPANCY_AVAILABLE: "occupancy.available",

  // Vehicle events
  VEHICLE_ADDED: "vehicle.added",
  VEHICLE_REMOVED: "vehicle.removed",
};

// ============================================================================
// JWT CONFIGURATION
// ============================================================================
const JWT_CONFIG = {
  SECRET:
    process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production",
  EXPIRES_IN: "7d",
  ALGORITHM: "HS256",
};

// ============================================================================
// DEFAULT SCORING WEIGHTS - For recommendation algorithm
// ============================================================================
const DEFAULT_SCORING_WEIGHTS = {
  distance: 0.35, // Closer is better
  availability: 0.25, // More free slots is better
  waitTime: 0.2, // Less wait time is better
  price: 0.1, // Cheaper is better
  power: 0.1, // Higher power is better
};

// ============================================================================
// HTTP STATUS CODES - For consistent error handling
// ============================================================================
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
  SERVICE_URLS,
  DATABASE_URLS,
  API_VERSION,
  API_PREFIX,
  USER_ROLES,
  VEHICLE_TYPES,
  CONNECTOR_TYPES,
  STATION_STATUS,
  EVENT_TYPES,
  JWT_CONFIG,
  DEFAULT_SCORING_WEIGHTS,
  HTTP_STATUS,
};
