/**
 * ============================================================================
 * STATION ROUTES - Gateway routes for station management
 * ============================================================================
 *
 * These routes forward station requests to the Station Service.
 *
 * PUBLIC routes: Get stations, search
 * PROTECTED routes: Create, update, delete (operators/admins only)
 *
 * ============================================================================
 */

const express = require("express");
const axios = require("axios");
const router = express.Router();

const { SERVICE_URLS } = require("../../../shared/constants");
const { asyncHandler } = require("../middleware/error.middleware");
const { authenticate, operatorOnly } = require("../middleware/auth.middleware");

// Station Service base URL
const STATION_SERVICE = SERVICE_URLS.STATION_SERVICE;

/**
 * Helper to forward requests to Station Service
 */
const forwardToStationService = async (req, method, path, data = null) => {
  const config = {
    method,
    url: `${STATION_SERVICE}${path}`,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": req.requestId,
    },
  };

  // Add auth headers if user is authenticated
  if (req.user) {
    config.headers["X-User-ID"] = req.user.id;
    config.headers["X-User-Role"] = req.user.role;
    config.headers["Authorization"] = req.headers.authorization;
  }

  if (data) {
    config.data = data;
  }

  // Forward query parameters
  if (req.query && Object.keys(req.query).length > 0) {
    config.params = req.query;
  }

  return axios(config);
};

// ============================================================================
// PUBLIC ROUTES (no authentication required)
// ============================================================================

/**
 * GET /api/v1/stations/stats
 * Get station statistics
 */
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const response = await forwardToStationService(
      req,
      "GET",
      "/api/v1/stations/stats",
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * GET /api/v1/stations
 * Get all stations (with optional filters)
 *
 * Query params: status, vehicleType, connector, page, limit
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const response = await forwardToStationService(
      req,
      "GET",
      "/api/v1/stations",
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * POST /api/v1/stations/nearby
 * Find stations near a location (public endpoint)
 *
 * Body: { longitude, latitude, maxDistanceKm, vehicleType?, connectors? }
 */
router.post(
  "/nearby",
  asyncHandler(async (req, res) => {
    const response = await forwardToStationService(
      req,
      "POST",
      "/api/v1/stations/nearby",
      req.body,
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * GET /api/v1/stations/:id
 * Get a single station by ID
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const response = await forwardToStationService(
      req,
      "GET",
      `/api/v1/stations/${req.params.id}`,
    );
    res.status(response.status).json(response.data);
  }),
);

// ============================================================================
// PROTECTED ROUTES (require authentication)
// ============================================================================

/**
 * GET /api/v1/stations/my-stations
 * Get operator's own stations
 */
router.get(
  "/operator/my-stations",
  authenticate,
  operatorOnly,
  asyncHandler(async (req, res) => {
    const response = await forwardToStationService(
      req,
      "GET",
      "/api/v1/stations/my-stations",
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * POST /api/v1/stations
 * Create a new station (operators/admins only)
 */
router.post(
  "/",
  authenticate,
  operatorOnly,
  asyncHandler(async (req, res) => {
    const response = await forwardToStationService(
      req,
      "POST",
      "/api/v1/stations",
      req.body,
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * PATCH /api/v1/stations/:id
 * Update a station (owner or admin only)
 */
router.patch(
  "/:id",
  authenticate,
  operatorOnly,
  asyncHandler(async (req, res) => {
    const response = await forwardToStationService(
      req,
      "PATCH",
      `/api/v1/stations/${req.params.id}`,
      req.body,
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * DELETE /api/v1/stations/:id
 * Delete a station (owner or admin only)
 */
router.delete(
  "/:id",
  authenticate,
  operatorOnly,
  asyncHandler(async (req, res) => {
    const response = await forwardToStationService(
      req,
      "DELETE",
      `/api/v1/stations/${req.params.id}`,
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * POST /api/v1/stations/:id/ports
 * Add a port to a station
 */
router.post(
  "/:id/ports",
  authenticate,
  operatorOnly,
  asyncHandler(async (req, res) => {
    const response = await forwardToStationService(
      req,
      "POST",
      `/api/v1/stations/${req.params.id}/ports`,
      req.body,
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * PATCH /api/v1/stations/:id/occupancy
 * Update port occupancy
 */
router.patch(
  "/:id/occupancy",
  authenticate,
  operatorOnly,
  asyncHandler(async (req, res) => {
    const response = await forwardToStationService(
      req,
      "PATCH",
      `/api/v1/stations/${req.params.id}/occupancy`,
      req.body,
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * PUT /api/v1/stations/:id/occupancy
 * Bulk update port occupancy
 */
router.put(
  "/:id/occupancy",
  authenticate,
  operatorOnly,
  asyncHandler(async (req, res) => {
    const response = await forwardToStationService(
      req,
      "PUT",
      `/api/v1/stations/${req.params.id}/occupancy`,
      req.body,
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
      message: "Station service is unavailable",
    });
  }

  next(err);
});

module.exports = router;
