import { Router } from "express";
import {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  addVehicleProfile,
  removeVehicleProfile,
  addFavoriteStation,
  removeFavoriteStation,
  getAllUsers,
  updateUserStatus,
} from "../controllers/authController.js";
import {
  authenticate,
  optionalAuth,
  adminOnly,
} from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.post("/register", optionalAuth, register); // optionalAuth to allow admin to create admin accounts
router.post("/login", login);

// Protected routes (require authentication)
router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateMe);
router.patch("/password", authenticate, changePassword);

// User-specific routes (for saving vehicle profiles and favorites)
router.post("/vehicle-profiles", authenticate, addVehicleProfile);
router.delete(
  "/vehicle-profiles/:profileId",
  authenticate,
  removeVehicleProfile,
);
router.post("/favorites/:stationId", authenticate, addFavoriteStation);
router.delete("/favorites/:stationId", authenticate, removeFavoriteStation);

// Admin-only routes
router.get("/users", authenticate, adminOnly, getAllUsers);
router.patch("/users/:id/status", authenticate, adminOnly, updateUserStatus);

export default router;
