/**
 * ============================================================================
 * USER SERVICE - Server Entry Point
 * ============================================================================
 *
 * LEARNING POINT: Domain Separation
 *
 * The User Service handles user PROFILE data:
 * - Vehicle profiles (what cars/bikes they have)
 * - Favorite stations
 * - Profile updates
 *
 * It does NOT handle:
 * - Authentication (that's Auth Service)
 * - Password changes (that's Auth Service)
 * - Login/logout (that's Auth Service)
 *
 * This separation follows the Single Responsibility Principle -
 * each service has one clear domain of responsibility.
 *
 * ============================================================================
 */

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Import routes
const userRoutes = require("./routes/user.routes");

// Import event handlers
const { setupEventHandlers } = require("./events/handlers");

// Database URL
const DATABASE_URL =
  process.env.USER_DB_URL || "mongodb://localhost:27017/ev_users_db";

// ============================================================================
// CREATE EXPRESS APP
// ============================================================================

const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`📨 [User] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "user-service",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ============================================================================
// ROUTES
// ============================================================================

app.use("/api/v1/users", userRoutes);

// ============================================================================
// EVENT RECEIVER ENDPOINT
// ============================================================================

/**
 * LEARNING POINT: Event Receiver
 *
 * This endpoint receives events from other services via HTTP.
 * In production, you'd use a message broker (RabbitMQ, Kafka).
 * This simple HTTP webhook approach works for learning.
 */
app.post("/events", async (req, res) => {
  const event = req.body;
  console.log(`📬 [User] Event received: ${event.type}`);

  // Process event
  const { handleEvent } = require("./events/handlers");
  await handleEvent(event);

  res.status(200).json({ received: true });
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err, req, res, next) => {
  console.error("❌ [User] Error:", err.message);

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    status: "error",
    message: err.message || "Internal server error",
    code: err.code || "INTERNAL_ERROR",
  });
});

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use("*", (req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route ${req.originalUrl} not found in User Service`,
  });
});

// ============================================================================
// DATABASE CONNECTION & SERVER START
// ============================================================================

const PORT = process.env.USER_PORT || 3002;

async function startServer() {
  try {
    // Connect to MongoDB
    console.log("🔌 [User] Connecting to database...");
    await mongoose.connect(DATABASE_URL);
    console.log("✅ [User] Database connected");

    // Setup event handlers
    setupEventHandlers();

    // Start server
    app.listen(PORT, () => {
      console.log("╔════════════════════════════════════════════════════════╗");
      console.log("║                    USER SERVICE                        ║");
      console.log("╠════════════════════════════════════════════════════════╣");
      console.log(
        `║  🚀 Running on http://localhost:${PORT}                  ║`,
      );
      console.log("║  📦 Database: ev_users_db                              ║");
      console.log("║                                                        ║");
      console.log("║  Endpoints:                                            ║");
      console.log("║    GET  /api/v1/users/:id           - Get profile      ║");
      console.log("║    PATCH /api/v1/users/:id          - Update profile   ║");
      console.log("║    GET  /api/v1/users/:id/vehicles  - Get vehicles     ║");
      console.log("║    POST /api/v1/users/:id/vehicles  - Add vehicle      ║");
      console.log("╚════════════════════════════════════════════════════════╝");
    });
  } catch (error) {
    console.error("❌ [User] Failed to start server:", error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("👋 [User] Shutting down gracefully...");
  await mongoose.connection.close();
  process.exit(0);
});

startServer();

module.exports = app;
