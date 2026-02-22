/**
 * ============================================================================
 * RECOMMENDATION ROUTES
 * ============================================================================
 */

const express = require("express");
const router = express.Router();

const {
  recommend,
  quickRecommend,
} = require("../controllers/recommendation.controller");

/**
 * POST /api/v1/recommendations
 * Get charging recommendations with provided vehicle profile
 */
router.post("/", recommend);

/**
 * POST /api/v1/recommendations/quick
 * Quick recommendations using stored vehicle profile (requires auth)
 */
router.post("/quick", quickRecommend);

module.exports = router;
