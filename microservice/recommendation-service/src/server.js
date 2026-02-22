/**
 * ============================================================================
 * RECOMMENDATION SERVICE - Server Entry Point
 * ============================================================================
 *
 * LEARNING POINT: Service Composition / Orchestration
 *
 * The Recommendation Service is interesting because it:
 * 1. Doesn't have its own database
 * 2. Aggregates data from OTHER services
 * 3. Applies business logic (scoring algorithm)
 *
 * This is called "Service Composition" - combining data and logic
 * from multiple sources to provide a higher-level feature.
 *
 * Pattern used: ORCHESTRATION
 * - This service coordinates calls to other services
 * - Knows the workflow (get stations → calculate scores → return results)
 * - Responsible for error handling across services
 *
 * Alternative: CHOREOGRAPHY
 * - Services react to events without central coordinator
 * - More decoupled but harder to track workflow
 *
 * ============================================================================
 */

const express = require("express");
const cors = require("cors");

// Import routes
const recommendationRoutes = require("./routes/recommendation.routes");

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
  console.log(`📨 [Recommendation] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "recommendation-service",
    timestamp: new Date().toISOString(),
    // No database - this service uses data from other services
    note: "This service aggregates data from Station Service",
  });
});

// ============================================================================
// ROUTES
// ============================================================================

app.use("/api/v1/recommendations", recommendationRoutes);

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err, req, res, next) => {
  console.error("❌ [Recommendation] Error:", err.message);

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
    message: `Route ${req.originalUrl} not found in Recommendation Service`,
  });
});

// ============================================================================
// SERVER START
// ============================================================================

const PORT = process.env.RECOMMENDATION_PORT || 3004;

app.listen(PORT, () => {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                 RECOMMENDATION SERVICE                     ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(
    `║  🚀 Running on http://localhost:${PORT}                      ║`,
  );
  console.log("║  📊 No database - aggregates data from other services      ║");
  console.log("║                                                            ║");
  console.log("║  Endpoints:                                                ║");
  console.log("║    POST /api/v1/recommendations - Get recommendations      ║");
  console.log("║    POST /api/v1/recommendations/quick - Quick rec (auth)   ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
});

module.exports = app;
