/**
 * ============================================================================
 * STATION SERVICE - Server Entry Point
 * ============================================================================
 *
 * LEARNING POINT: Core Business Service
 *
 * The Station Service is the core of our EV charging application.
 * It manages:
 * - Charging station data (CRUD operations)
 * - Port information (connector types, power, pricing)
 * - Occupancy tracking (real-time availability)
 * - Geospatial queries (find nearby stations)
 *
 * This is typically the service that:
 * - Has the most complex data model
 * - Handles the most business logic
 * - May need the most scaling resources
 *
 * ============================================================================
 */

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Import routes
const stationRoutes = require("./routes/station.routes");

// Import event handlers
const { setupEventHandlers } = require("./events/handlers");

// Database URL
const DATABASE_URL =
  process.env.STATION_DB_URL || "mongodb://localhost:27017/ev_stations_db";

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
  console.log(`📨 [Station] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "station-service",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ============================================================================
// ROUTES
// ============================================================================

app.use("/api/v1/stations", stationRoutes);

// ============================================================================
// EVENT RECEIVER ENDPOINT
// ============================================================================

app.post("/events", async (req, res) => {
  const event = req.body;
  console.log(`📬 [Station] Event received: ${event.type}`);

  const { handleEvent } = require("./events/handlers");
  await handleEvent(event);

  res.status(200).json({ received: true });
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err, req, res, next) => {
  console.error("❌ [Station] Error:", err.message);

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      status: "fail",
      message: messages.join(", "),
      code: "VALIDATION_ERROR",
    });
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      status: "fail",
      message: `Invalid ${err.path}: ${err.value}`,
      code: "INVALID_ID",
    });
  }

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
    message: `Route ${req.originalUrl} not found in Station Service`,
  });
});

// ============================================================================
// DATABASE CONNECTION & SERVER START
// ============================================================================

const PORT = process.env.STATION_PORT || 3003;

async function startServer() {
  try {
    // Connect to MongoDB
    console.log("🔌 [Station] Connecting to database...");
    await mongoose.connect(DATABASE_URL);
    console.log("✅ [Station] Database connected");

    // Setup event handlers
    setupEventHandlers();

    // Start server
    app.listen(PORT, () => {
      console.log(
        "╔════════════════════════════════════════════════════════════╗",
      );
      console.log(
        "║                    STATION SERVICE                         ║",
      );
      console.log(
        "╠════════════════════════════════════════════════════════════╣",
      );
      console.log(
        `║  🚀 Running on http://localhost:${PORT}                      ║`,
      );
      console.log(
        "║  📦 Database: ev_stations_db                               ║",
      );
      console.log(
        "║                                                            ║",
      );
      console.log(
        "║  Endpoints:                                                ║",
      );
      console.log(
        "║    GET   /api/v1/stations           - List stations        ║",
      );
      console.log(
        "║    GET   /api/v1/stations/:id       - Get station          ║",
      );
      console.log(
        "║    POST  /api/v1/stations           - Create station       ║",
      );
      console.log(
        "║    PATCH /api/v1/stations/:id       - Update station       ║",
      );
      console.log(
        "║    POST  /api/v1/stations/nearby    - Find nearby          ║",
      );
      console.log(
        "╚════════════════════════════════════════════════════════════╝",
      );
    });
  } catch (error) {
    console.error("❌ [Station] Failed to start server:", error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("👋 [Station] Shutting down gracefully...");
  await mongoose.connection.close();
  process.exit(0);
});

startServer();

module.exports = app;
