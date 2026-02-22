/**
 * ============================================================================
 * API GATEWAY - The Front Door to Your Microservices
 * ============================================================================
 *
 * LEARNING POINT: API Gateway Pattern
 *
 * The API Gateway is a single entry point for all client requests. It's like
 * a receptionist who:
 *
 * 1. Receives ALL incoming requests from clients
 * 2. Routes them to the appropriate microservice
 * 3. Handles cross-cutting concerns:
 *    - Authentication verification
 *    - Rate limiting
 *    - Request logging
 *    - CORS handling
 *    - Response aggregation
 *
 * WHY USE AN API GATEWAY?
 *
 * Without Gateway:
 * ┌────────┐     ┌────────────────┐
 * │ Client │────▶│ Auth Service   │ (client needs to know all service URLs)
 * │        │────▶│ User Service   │
 * │        │────▶│ Station Service│
 * └────────┘     └────────────────┘
 *
 * With Gateway:
 * ┌────────┐     ┌─────────┐     ┌────────────────┐
 * │ Client │────▶│ Gateway │────▶│ Auth Service   │
 * │        │     │         │────▶│ User Service   │
 * │        │     │         │────▶│ Station Service│
 * └────────┘     └─────────┘     └────────────────┘
 *
 * Benefits:
 * - Clients only need to know ONE URL
 * - Centralized authentication
 * - Centralized logging and monitoring
 * - Easy to add rate limiting
 * - Can transform/aggregate responses
 *
 * ============================================================================
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// Import routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const stationRoutes = require("./routes/station.routes");
const recommendationRoutes = require("./routes/recommendation.routes");

// Import middleware
const { errorHandler } = require("./middleware/error.middleware");
const { requestLogger } = require("./middleware/logging.middleware");

// ============================================================================
// CREATE EXPRESS APP
// ============================================================================

const app = express();

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// HELMET: Security headers
// Adds various HTTP headers to protect against common attacks
app.use(helmet());

// CORS: Cross-Origin Resource Sharing
// Allows requests from different domains (important for frontend apps)
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS || "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// MORGAN: HTTP request logging
// Logs every request in a nice format
app.use(morgan("dev"));

// JSON body parser
app.use(express.json({ limit: "10kb" })); // Limit body size for security

// Custom request logger (logs to file/console with more details)
app.use(requestLogger);

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * LEARNING POINT: Rate Limiting
 *
 * Rate limiting prevents abuse by limiting how many requests a client can make.
 * This protects against:
 * - DDoS attacks
 * - Brute force attacks
 * - API abuse
 *
 * Different rate limits for different endpoints:
 * - Auth endpoints (login/register): Stricter limits
 * - Read endpoints (GET): More lenient
 * - Write endpoints (POST/PATCH): Medium limits
 */

// General rate limiter: 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    status: "error",
    message: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for auth endpoints: 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    status: "error",
    message: "Too many authentication attempts, please try again later",
  },
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * Health check endpoint
 * Used by load balancers and monitoring tools to check if gateway is alive
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Service status endpoint
 * Shows status of all backend services (useful for debugging)
 */
app.get("/api/v1/status", async (req, res) => {
  const { SERVICE_URLS } = require("../../shared/constants");
  const axios = require("axios");

  const checkService = async (name, url) => {
    try {
      const response = await axios.get(`${url}/health`, { timeout: 3000 });
      return { name, status: "up", url };
    } catch (error) {
      return { name, status: "down", url, error: error.message };
    }
  };

  const services = await Promise.all([
    checkService("auth-service", SERVICE_URLS.AUTH_SERVICE),
    checkService("user-service", SERVICE_URLS.USER_SERVICE),
    checkService("station-service", SERVICE_URLS.STATION_SERVICE),
    checkService("recommendation-service", SERVICE_URLS.RECOMMENDATION_SERVICE),
  ]);

  const allHealthy = services.every((s) => s.status === "up");

  res.status(allHealthy ? 200 : 503).json({
    gateway: "healthy",
    services,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * Route Mounting
 *
 * Each route module handles requests for a specific service.
 * The gateway receives the request and forwards it to the appropriate service.
 *
 * /api/v1/auth/*          → Auth Service (port 3001)
 * /api/v1/users/*         → User Service (port 3002)
 * /api/v1/stations/*      → Station Service (port 3003)
 * /api/v1/recommendations → Recommendation Service (port 3004)
 */

// Auth routes with stricter rate limiting
app.use("/api/v1/auth", authLimiter, authRoutes);

// User routes
app.use("/api/v1/users", userRoutes);

// Station routes
app.use("/api/v1/stations", stationRoutes);

// Recommendation routes
app.use("/api/v1/recommendations", recommendationRoutes);

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use("*", (req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route ${req.originalUrl} not found`,
  });
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use(errorHandler);

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                      API GATEWAY                           ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(
    `║  🚀 Gateway running on http://localhost:${PORT}              ║`,
  );
  console.log("║                                                            ║");
  console.log("║  Routes:                                                   ║");
  console.log("║    /api/v1/auth/*          → Auth Service (3001)           ║");
  console.log("║    /api/v1/users/*         → User Service (3002)           ║");
  console.log("║    /api/v1/stations/*      → Station Service (3003)        ║");
  console.log("║    /api/v1/recommendations → Recommendation Service (3004) ║");
  console.log("║                                                            ║");
  console.log("║  Health: GET /health                                       ║");
  console.log("║  Status: GET /api/v1/status                                ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
});

module.exports = app;
