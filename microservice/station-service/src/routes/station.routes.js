/**
 * ============================================================================
 * STATION ROUTES
 * ============================================================================
 */

const express = require("express");
const router = express.Router();

const {
  getAllStations,
  getStation,
  getStats,
  getMyStations,
  createStation,
  updateStation,
  deleteStation,
  addPort,
  updateOccupancy,
  bulkUpdateOccupancy,
  findNearby,
} = require("../controllers/station.controller");

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * GET /api/v1/stations/stats
 * Get station statistics
 */
router.get("/stats", getStats);

/**
 * POST /api/v1/stations/nearby
 * Find stations near a location
 */
router.post("/nearby", findNearby);

/**
 * GET /api/v1/stations
 * List all stations
 */
router.get("/", getAllStations);

/**
 * GET /api/v1/stations/:id
 * Get single station
 */
router.get("/:id", getStation);

// ============================================================================
// PROTECTED ROUTES (auth checked in controller via headers)
// ============================================================================

/**
 * GET /api/v1/stations/my-stations
 * Get operator's own stations
 */
router.get("/operator/my-stations", getMyStations);

/**
 * POST /api/v1/stations
 * Create a new station
 */
router.post("/", createStation);

/**
 * PATCH /api/v1/stations/:id
 * Update a station
 */
router.patch("/:id", updateStation);

/**
 * DELETE /api/v1/stations/:id
 * Delete a station
 */
router.delete("/:id", deleteStation);

/**
 * POST /api/v1/stations/:id/ports
 * Add a port to a station
 */
router.post("/:id/ports", addPort);

/**
 * PATCH /api/v1/stations/:id/occupancy
 * Update port occupancy
 */
router.patch("/:id/occupancy", updateOccupancy);

/**
 * PUT /api/v1/stations/:id/occupancy
 * Bulk update port occupancy
 */
router.put("/:id/occupancy", bulkUpdateOccupancy);

module.exports = router;
