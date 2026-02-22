/**
 * ============================================================================
 * AUTH SERVICE - Server Entry Point
 * ============================================================================
 *
 * LEARNING POINT: Single Responsibility Principle
 *
 * The Auth Service has ONE job: Handle authentication.
 * - User registration (create credentials)
 * - User login (verify credentials, issue tokens)
 * - Token verification (validate JWT)
 *
 * It does NOT handle:
 * - User profiles (that's User Service)
 * - Stations (that's Station Service)
 * - Recommendations (that's Recommendation Service)
 *
 * This separation makes the service:
 * - Easier to understand and maintain
 * - Independently scalable
 * - Easier to test
 * - More secure (auth logic isolated)
 *
 * ============================================================================
 */

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Import routes
const authRoutes = require("./routes/auth.routes");

// Import event handlers
const { setupEventHandlers } = require("./events/handlers");

// Database URL (separate database for auth service)
const DATABASE_URL =
  process.env.AUTH_DB_URL || "mongodb://localhost:27017/ev_auth_db";

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
  console.log(`📨 [Auth] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "auth-service",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ============================================================================
// ROUTES
// ============================================================================

app.use("/api/v1/auth", authRoutes);

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err, req, res, next) => {
  console.error("❌ [Auth] Error:", err.message);

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
    message: `Route ${req.originalUrl} not found in Auth Service`,
  });
});

// ============================================================================
// DATABASE CONNECTION & SERVER START
// ============================================================================

const PORT = process.env.AUTH_PORT || 3001;

async function startServer() {
  try {
    // Connect to MongoDB
    console.log("🔌 [Auth] Connecting to database...");
    await mongoose.connect(DATABASE_URL);
    console.log("✅ [Auth] Database connected");

    // Setup event handlers
    setupEventHandlers();

    // Start server
    app.listen(PORT, () => {
      console.log("╔════════════════════════════════════════════════════════╗");
      console.log("║                    AUTH SERVICE                        ║");
      console.log("╠════════════════════════════════════════════════════════╣");
      console.log(
        `║  🚀 Running on http://localhost:${PORT}                  ║`,
      );
      console.log("║  📦 Database: ev_auth_db                               ║");
      console.log("║                                                        ║");
      console.log("║  Endpoints:                                            ║");
      console.log("║    POST /api/v1/auth/register - Register user          ║");
      console.log("║    POST /api/v1/auth/login    - Login user             ║");
      console.log("║    GET  /api/v1/auth/verify   - Verify token           ║");
      console.log("╚════════════════════════════════════════════════════════╝");
    });
  } catch (error) {
    console.error("❌ [Auth] Failed to start server:", error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("👋 [Auth] Shutting down gracefully...");
  await mongoose.connection.close();
  process.exit(0);
});

startServer();

module.exports = app;
