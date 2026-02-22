/**
 * ============================================================================
 * AUTH ROUTES
 * ============================================================================
 *
 * LEARNING POINT: Route Layer
 *
 * Routes define:
 * 1. HTTP method (GET, POST, etc.)
 * 2. URL path
 * 3. Middleware to run
 * 4. Controller function to handle request
 *
 * Routes should be thin - just mapping URLs to controllers.
 *
 * ============================================================================
 */

const express = require("express");
const router = express.Router();

const {
  register,
  login,
  verify,
  getUserById,
} = require("../controllers/auth.controller");

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post("/register", register);

/**
 * POST /api/v1/auth/login
 * Login a user
 */
router.post("/login", login);

/**
 * GET /api/v1/auth/verify
 * Verify JWT token
 */
router.get("/verify", verify);

// ============================================================================
// INTERNAL ROUTES (called by other services)
// ============================================================================

/**
 * GET /api/v1/auth/users/:id
 * Get user by ID (for internal service calls)
 */
router.get("/users/:id", getUserById);

module.exports = router;
