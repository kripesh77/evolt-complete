/**
 * ============================================================================
 * AUTH ROUTES - Gateway routes for authentication
 * ============================================================================
 *
 * These routes forward authentication requests to the Auth Service.
 *
 * LEARNING POINT: Route Forwarding
 *
 * The gateway doesn't process auth logic itself. It:
 * 1. Receives the request
 * 2. Forwards it to Auth Service
 * 3. Returns the response to client
 *
 * This keeps authentication logic in ONE place (Auth Service).
 *
 * ============================================================================
 */

const express = require("express");
const axios = require("axios");
const router = express.Router();

const { SERVICE_URLS } = require("../../../shared/constants");
const { asyncHandler } = require("../middleware/error.middleware");

// Auth Service base URL
const AUTH_SERVICE = SERVICE_URLS.AUTH_SERVICE;

/**
 * POST /api/v1/auth/register
 * Register a new user
 *
 * Body: { name, email, password, role?, company?, phone? }
 */
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const response = await axios.post(
      `${AUTH_SERVICE}/api/v1/auth/register`,
      req.body,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": req.requestId,
        },
      },
    );

    res.status(response.status).json(response.data);
  }),
);

/**
 * POST /api/v1/auth/login
 * Login a user
 *
 * Body: { email, password }
 */
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const response = await axios.post(
      `${AUTH_SERVICE}/api/v1/auth/login`,
      req.body,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": req.requestId,
        },
      },
    );

    res.status(response.status).json(response.data);
  }),
);

/**
 * GET /api/v1/auth/verify
 * Verify JWT token
 *
 * Headers: Authorization: Bearer <token>
 */
router.get(
  "/verify",
  asyncHandler(async (req, res) => {
    const response = await axios.get(`${AUTH_SERVICE}/api/v1/auth/verify`, {
      headers: {
        Authorization: req.headers.authorization,
        "X-Request-ID": req.requestId,
      },
    });

    res.status(response.status).json(response.data);
  }),
);

/**
 * POST /api/v1/auth/logout
 * Logout (client-side token invalidation)
 * In a real app, you might blacklist the token
 */
router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    // For JWT, logout is typically client-side (delete token)
    // Server-side would involve token blacklisting
    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  }),
);

// Error handler for axios errors
router.use((err, req, res, next) => {
  if (err.response) {
    // Forward error from auth service
    return res.status(err.response.status).json(err.response.data);
  }

  if (err.code === "ECONNREFUSED") {
    return res.status(503).json({
      status: "error",
      message: "Auth service is unavailable",
    });
  }

  next(err);
});

module.exports = router;
