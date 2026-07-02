import { Router } from "express";
import { VehicleController } from "../controllers/vehicle.controller.js";
import { authenticate, adminOnly } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * Vehicle Routes
 *
 * Base path: /api/v1/vehicles
 *
 * PUBLIC ROUTES (no auth required):
 * - GET /api/v1/vehicles - Search the vehicle catalog
 * - GET /api/v1/vehicles/:id - Get single catalog vehicle by ID
 *
 * AUTHENTICATED ROUTES (any logged-in user):
 * - POST /api/v1/vehicles/requests - Request a vehicle missing from the catalog
 *
 * ADMIN-ONLY ROUTES:
 * - POST /api/v1/vehicles - Create a catalog vehicle directly
 * - GET /api/v1/vehicles/requests - List vehicle requests for moderation
 * - PATCH /api/v1/vehicles/requests/:id/approve - Approve a request
 * - PATCH /api/v1/vehicles/requests/:id/reject - Reject a request
 */

// Vehicle request moderation (must be before /:id so "requests" isn't read as an ID)
router
  .route("/listrequests")
  .get(authenticate, adminOnly, VehicleController.listVehicleRequests);

// get requested vehicles of user
router
  .route("/requests")
  .get(authenticate, VehicleController.getMyVehiclesRequest)
  .post(authenticate, VehicleController.submitVehicleRequest);

router.patch(
  "/requests/:id/approve",
  authenticate,
  adminOnly,
  VehicleController.approveVehicleRequest,
);

router.patch(
  "/requests/:id/reject",
  authenticate,
  adminOnly,
  VehicleController.rejectVehicleRequest,
);

// Catalog search (public) & direct creation (admin-only)
router
  .route("/")
  .get(VehicleController.searchVehicles)
  .post(authenticate, adminOnly, VehicleController.createVehicle);

// Single catalog vehicle (public)
router.get("/:id", VehicleController.getVehicle);

export { router as vehicleRouter };
export default router;
