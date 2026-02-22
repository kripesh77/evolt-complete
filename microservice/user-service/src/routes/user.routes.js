/**
 * ============================================================================
 * USER ROUTES
 * ============================================================================
 */

const express = require("express");
const router = express.Router();

const {
  getProfile,
  updateProfile,
  getVehicles,
  addVehicle,
  removeVehicle,
  getFavorites,
  addFavorite,
  removeFavorite,
  createProfile,
} = require("../controllers/user.controller");

// ============================================================================
// INTERNAL ROUTES (called by other services)
// ============================================================================

/**
 * POST /api/v1/users/internal/create
 * Create a user profile (called when user registers)
 */
router.post("/internal/create", createProfile);

// ============================================================================
// PROFILE ROUTES
// ============================================================================

/**
 * GET /api/v1/users/:id
 * Get user profile
 */
router.get("/:id", getProfile);

/**
 * PATCH /api/v1/users/:id
 * Update user profile
 */
router.patch("/:id", updateProfile);

// ============================================================================
// VEHICLE ROUTES
// ============================================================================

/**
 * GET /api/v1/users/:id/vehicles
 * Get user's vehicle profiles
 */
router.get("/:id/vehicles", getVehicles);

/**
 * POST /api/v1/users/:id/vehicles
 * Add a vehicle profile
 */
router.post("/:id/vehicles", addVehicle);

/**
 * DELETE /api/v1/users/:id/vehicles/:vehicleId
 * Remove a vehicle profile
 */
router.delete("/:id/vehicles/:vehicleId", removeVehicle);

// ============================================================================
// FAVORITES ROUTES
// ============================================================================

/**
 * GET /api/v1/users/:id/favorites
 * Get user's favorite stations
 */
router.get("/:id/favorites", getFavorites);

/**
 * POST /api/v1/users/:id/favorites/:stationId
 * Add a favorite station
 */
router.post("/:id/favorites/:stationId", addFavorite);

/**
 * DELETE /api/v1/users/:id/favorites/:stationId
 * Remove a favorite station
 */
router.delete("/:id/favorites/:stationId", removeFavorite);

module.exports = router;
