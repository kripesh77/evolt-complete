/**
 * ============================================================================
 * RECOMMENDATION ROUTES - Gateway routes for recommendations
 * ============================================================================
 *
 * These routes forward recommendation requests to the Recommendation Service.
 *
 * LEARNING POINT: Service Composition
 *
 * The Recommendation Service is interesting because it needs data from
 * MULTIPLE services:
 * - Station data (from Station Service)
 * - User's vehicle profile (from User Service)
 *
 * This is called "Service Composition" - combining data from multiple sources.
 * The Recommendation Service handles this internally by calling other services.
 *
 * ============================================================================
 */

const express = require("express");
const axios = require("axios");
const router = express.Router();

const { SERVICE_URLS } = require("../../../shared/constants");
const { asyncHandler } = require("../middleware/error.middleware");
const { authenticate, optionalAuth } = require("../middleware/auth.middleware");

// Recommendation Service base URL
const RECOMMENDATION_SERVICE = SERVICE_URLS.RECOMMENDATION_SERVICE;

/**
 * Helper to forward requests to Recommendation Service
 */
const forwardToRecommendationService = async (
  req,
  method,
  path,
  data = null,
) => {
  const config = {
    method,
    url: `${RECOMMENDATION_SERVICE}${path}`,
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

  return axios(config);
};

/**
 * POST /api/v1/recommendations
 * Get smart charging station recommendations
 *
 * Body: {
 *   vehicleProfile: {
 *     vehicleType: 'car' | 'bike',
 *     batteryCapacity_kWh: number,
 *     efficiency_kWh_per_km: number,
 *     batteryPercent: number,
 *     compatibleConnectors: string[]
 *   },
 *   currentLocation: {
 *     longitude: number,
 *     latitude: number
 *   },
 *   weights?: {
 *     distance: number,
 *     availability: number,
 *     waitTime: number,
 *     price: number,
 *     power: number
 *   },
 *   limit?: number
 * }
 *
 * This endpoint can be used with or without authentication:
 * - Without auth: Must provide full vehicleProfile in body
 * - With auth: Can use stored vehicle profile from user's account
 */
router.post(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const response = await forwardToRecommendationService(
      req,
      "POST",
      "/api/v1/recommendations",
      req.body,
    );
    res.status(response.status).json(response.data);
  }),
);

/**
 * POST /api/v1/recommendations/quick
 * Quick recommendation using user's default vehicle
 * Requires authentication
 *
 * Body: {
 *   currentLocation: {
 *     longitude: number,
 *     latitude: number
 *   },
 *   vehicleId?: string (optional - uses default if not provided)
 * }
 */
router.post(
  "/quick",
  authenticate,
  asyncHandler(async (req, res) => {
    const response = await forwardToRecommendationService(
      req,
      "POST",
      "/api/v1/recommendations/quick",
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
      message: "Recommendation service is unavailable",
    });
  }

  next(err);
});

module.exports = router;
