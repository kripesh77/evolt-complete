import { Router } from "express";
import { StationController } from "../controllers/station.controller.js";
import { authenticate, operatorOnly } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * Station Routes
 *
 * Base path: /api/v1/stations
 *
 * PUBLIC ROUTES (no auth required):
 * - GET /api/v1/stations - List all stations
 * - GET /api/v1/stations/stats - Get station statistics
 * - GET /api/v1/stations/:id - Get single station details
 *
 * PROTECTED ROUTES (operator/admin only):
 * - GET /api/v1/stations/my-stations - Get operator's own stations
 * - POST /api/v1/stations - Create station (operator/admin)
 * - PATCH /api/v1/stations/:id - Update station (owner or admin)
 * - DELETE /api/v1/stations/:id - Delete station (owner or admin)
 * - POST /api/v1/stations/:id/ports - Add port (owner or admin)
 * - PATCH/PUT /api/v1/stations/:id/occupancy - Update occupancy (owner or admin)
 */

// Get station statistics (must be before :id route)
router.get("/stats", StationController.getStats);

// Get operator's own stations (protected - operator/admin only)
router.get(
  "/my-stations",
  authenticate,
  operatorOnly,
  StationController.getMyStations,
);

// List all stations (public) & Create station (protected - operator/admin only)
router
  .route("/")
  .get(StationController.getAllStations)
  .post(authenticate, operatorOnly, StationController.createStation);

// Get single station (public) & Update/Delete (protected, owner or admin only)
router
  .route("/:id")
  .get(StationController.getStation)
  .patch(authenticate, operatorOnly, StationController.updateStation)
  .delete(authenticate, operatorOnly, StationController.deleteStation);

// Port management (protected, owner or admin only)
router.post(
  "/:id/ports",
  authenticate,
  operatorOnly,
  StationController.addPort,
);

// Occupancy management (protected, owner or admin only)
router
  .route("/:id/occupancy")
  .patch(authenticate, operatorOnly, StationController.updateOccupancy)
  .put(authenticate, operatorOnly, StationController.bulkUpdateOccupancy);

export { router as stationRouter };
export default router;
