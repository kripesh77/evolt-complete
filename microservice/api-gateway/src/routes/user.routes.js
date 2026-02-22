/**
 * ============================================================================
 * USER ROUTES - Gateway routes for user management
 * ============================================================================
 *
 * These routes forward user management requests to the User Service.
 * Most routes require authentication.
 *
 * ============================================================================
 */

const express = require("express");
const axios = require("axios");
const router = express.Router();

const { SERVICE_URLS } = require("../../../shared/constants");
const { asyncHandler } = require("../middleware/error.middleware");
const { authenticate } = require("../middleware/auth.middleware");

// User Service base URL
const USER_SERVICE = SERVICE_URLS.USER_SERVICE;

/**
 * Helper to forward requests to User Service
 */
const forwardToUserService = async (req, method, path, data = null) => {
  const config = {
    method,
    url: `${USER_SERVICE}${path}`,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": req.requestId,
      // Forward user info (set by auth middleware)
      "X-User-ID": req.headers["x-user-id"],
      "X-User-Role": req.headers["x-user-role"],
      "X-User-Email": req.headers["x-user-email"],
      Authorization: req.headers.authorization,
    },
  };

  if (data) {
    config.data = data;
  }

  return axios(config);
};

// ============================================================================
// PROTECTED ROUTES (require authentication)
// ============================================================================

/**
 * GET /api/v1/users/profile
 * Get current user's profile
 */
router.get(
  "/profile",
  authenticate,
  asyncHandler(async (req, res) => {
    const response = await forwardToUserService(
      req,
      "GET",
      `/api/v1/users/${req.user.id}`,
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * PATCH /api/v1/users/profile
 * Update current user's profile
 */
router.patch(
  "/profile",
  authenticate,
  asyncHandler(async (req, res) => {
    const response = await forwardToUserService(
      req,
      "PATCH",
      `/api/v1/users/${req.user.id}`,
      req.body,
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * GET /api/v1/users/vehicles
 * Get user's vehicle profiles
 */
router.get(
  "/vehicles",
  authenticate,
  asyncHandler(async (req, res) => {
    const response = await forwardToUserService(
      req,
      "GET",
      `/api/v1/users/${req.user.id}/vehicles`,
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * POST /api/v1/users/vehicles
 * Add a vehicle profile
 */
router.post(
  "/vehicles",
  authenticate,
  asyncHandler(async (req, res) => {
    const response = await forwardToUserService(
      req,
      "POST",
      `/api/v1/users/${req.user.id}/vehicles`,
      req.body,
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * DELETE /api/v1/users/vehicles/:vehicleId
 * Remove a vehicle profile
 */
router.delete(
  "/vehicles/:vehicleId",
  authenticate,
  asyncHandler(async (req, res) => {
    const response = await forwardToUserService(
      req,
      "DELETE",
      `/api/v1/users/${req.user.id}/vehicles/${req.params.vehicleId}`,
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * GET /api/v1/users/favorites
 * Get user's favorite stations
 */
router.get(
  "/favorites",
  authenticate,
  asyncHandler(async (req, res) => {
    const response = await forwardToUserService(
      req,
      "GET",
      `/api/v1/users/${req.user.id}/favorites`,
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * POST /api/v1/users/favorites/:stationId
 * Add a favorite station
 */
router.post(
  "/favorites/:stationId",
  authenticate,
  asyncHandler(async (req, res) => {
    const response = await forwardToUserService(
      req,
      "POST",
      `/api/v1/users/${req.user.id}/favorites/${req.params.stationId}`,
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * DELETE /api/v1/users/favorites/:stationId
 * Remove a favorite station
 */
router.delete(
  "/favorites/:stationId",
  authenticate,
  asyncHandler(async (req, res) => {
    const response = await forwardToUserService(
      req,
      "DELETE",
      `/api/v1/users/${req.user.id}/favorites/${req.params.stationId}`,
    );
    res.status(response.status).json(response.data);
  }),
);

// ============================================================================
// ERROR HANDLER
// ============================================================================

router.use((err, req, res, next) => {
  if (err.response) {
    return res.status(err.response.status).json(err.response.data);
  }

  if (err.code === "ECONNREFUSED") {
    return res.status(503).json({
      status: "error",
      message: "User service is unavailable",
    });
  }

  next(err);
});

module.exports = router;
