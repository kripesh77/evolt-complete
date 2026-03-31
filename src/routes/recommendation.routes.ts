import { Router } from "express";
import { RecommendationController } from "../controllers/recommendation.controller.js";

const router = Router();

/**
 * Recommendation Routes
 *
 * Base path: /api/v1/recommendations
 */

// Get nearby stations (quick overview)
router.get("/nearby", RecommendationController.getNearbyStations);

// Get smart recommendations
router.post("/", RecommendationController.getRecommendations);

// Route-aware recommendations (direction-aware along a route)
router.post("/route", RecommendationController.getRouteRecommendations);

// Emergency recommendation (low battery priority)
router.post("/emergency", RecommendationController.getEmergencyRecommendation);

export { router as recommendationRouter };
export default router;
