/**
 * ============================================================================
 * USER CONTROLLER - Handles user profile operations
 * ============================================================================
 */

const UserProfile = require("../models/UserProfile");
const { eventBus, EVENT_TYPES } = require("../../../shared/event-bus");

/**
 * Get user profile
 * GET /api/v1/users/:id
 */
const getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify user can only access their own profile (or admin)
    const requesterId = req.headers["x-user-id"];
    const requesterRole = req.headers["x-user-role"];

    if (requesterId !== id && requesterRole !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "You can only access your own profile",
      });
    }

    const profile = await UserProfile.findOne({ userId: id });

    if (!profile) {
      return res.status(404).json({
        status: "fail",
        message: "User profile not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PATCH /api/v1/users/:id
 */
const updateProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verify ownership
    const requesterId = req.headers["x-user-id"];
    const requesterRole = req.headers["x-user-role"];

    if (requesterId !== id && requesterRole !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "You can only update your own profile",
      });
    }

    // Fields that can be updated
    const allowedUpdates = ["name", "preferences"];
    const updateData = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        updateData[key] = updates[key];
      }
    }

    const profile = await UserProfile.findOneAndUpdate(
      { userId: id },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!profile) {
      return res.status(404).json({
        status: "fail",
        message: "User profile not found",
      });
    }

    // Publish event
    eventBus.publish(EVENT_TYPES.USER_UPDATED, {
      userId: id,
      updates: Object.keys(updateData),
    });

    res.status(200).json({
      status: "success",
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's vehicles
 * GET /api/v1/users/:id/vehicles
 */
const getVehicles = async (req, res, next) => {
  try {
    const { id } = req.params;

    const profile = await UserProfile.findOne({ userId: id });

    if (!profile) {
      return res.status(404).json({
        status: "fail",
        message: "User profile not found",
      });
    }

    res.status(200).json({
      status: "success",
      results: profile.vehicleProfiles.length,
      data: { vehicles: profile.vehicleProfiles },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a vehicle
 * POST /api/v1/users/:id/vehicles
 */
const addVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vehicleData = req.body;

    // Verify ownership
    const requesterId = req.headers["x-user-id"];
    if (requesterId !== id) {
      return res.status(403).json({
        status: "fail",
        message: "You can only add vehicles to your own profile",
      });
    }

    // Validate required fields
    if (
      !vehicleData.vehicleType ||
      !vehicleData.batteryCapacity_kWh ||
      !vehicleData.efficiency_kWh_per_km ||
      !vehicleData.compatibleConnectors
    ) {
      return res.status(400).json({
        status: "fail",
        message:
          "Missing required fields: vehicleType, batteryCapacity_kWh, efficiency_kWh_per_km, compatibleConnectors",
      });
    }

    const profile = await UserProfile.findOne({ userId: id });

    if (!profile) {
      return res.status(404).json({
        status: "fail",
        message: "User profile not found",
      });
    }

    // Add vehicle
    const newVehicle = profile.addVehicle(vehicleData);
    await profile.save();

    // Publish event
    eventBus.publish(EVENT_TYPES.VEHICLE_ADDED, {
      userId: id,
      vehicleId: newVehicle._id.toString(),
      vehicleType: newVehicle.vehicleType,
    });

    res.status(201).json({
      status: "success",
      data: { vehicle: newVehicle },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a vehicle
 * DELETE /api/v1/users/:id/vehicles/:vehicleId
 */
const removeVehicle = async (req, res, next) => {
  try {
    const { id, vehicleId } = req.params;

    // Verify ownership
    const requesterId = req.headers["x-user-id"];
    if (requesterId !== id) {
      return res.status(403).json({
        status: "fail",
        message: "You can only remove vehicles from your own profile",
      });
    }

    const profile = await UserProfile.findOne({ userId: id });

    if (!profile) {
      return res.status(404).json({
        status: "fail",
        message: "User profile not found",
      });
    }

    try {
      profile.removeVehicle(vehicleId);
      await profile.save();
    } catch (err) {
      return res.status(404).json({
        status: "fail",
        message: err.message,
      });
    }

    // Publish event
    eventBus.publish(EVENT_TYPES.VEHICLE_REMOVED, {
      userId: id,
      vehicleId,
    });

    res.status(200).json({
      status: "success",
      message: "Vehicle removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's favorite stations
 * GET /api/v1/users/:id/favorites
 */
const getFavorites = async (req, res, next) => {
  try {
    const { id } = req.params;

    const profile = await UserProfile.findOne({ userId: id });

    if (!profile) {
      return res.status(404).json({
        status: "fail",
        message: "User profile not found",
      });
    }

    res.status(200).json({
      status: "success",
      results: profile.favoriteStations.length,
      data: { favorites: profile.favoriteStations },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a favorite station
 * POST /api/v1/users/:id/favorites/:stationId
 */
const addFavorite = async (req, res, next) => {
  try {
    const { id, stationId } = req.params;

    // Verify ownership
    const requesterId = req.headers["x-user-id"];
    if (requesterId !== id) {
      return res.status(403).json({
        status: "fail",
        message: "You can only modify your own favorites",
      });
    }

    const profile = await UserProfile.findOne({ userId: id });

    if (!profile) {
      return res.status(404).json({
        status: "fail",
        message: "User profile not found",
      });
    }

    profile.addFavorite(stationId);
    await profile.save();

    res.status(200).json({
      status: "success",
      message: "Station added to favorites",
      data: { favorites: profile.favoriteStations },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a favorite station
 * DELETE /api/v1/users/:id/favorites/:stationId
 */
const removeFavorite = async (req, res, next) => {
  try {
    const { id, stationId } = req.params;

    // Verify ownership
    const requesterId = req.headers["x-user-id"];
    if (requesterId !== id) {
      return res.status(403).json({
        status: "fail",
        message: "You can only modify your own favorites",
      });
    }

    const profile = await UserProfile.findOne({ userId: id });

    if (!profile) {
      return res.status(404).json({
        status: "fail",
        message: "User profile not found",
      });
    }

    profile.removeFavorite(stationId);
    await profile.save();

    res.status(200).json({
      status: "success",
      message: "Station removed from favorites",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create user profile (internal - called when user registers)
 * POST /api/v1/users/internal/create
 */
const createProfile = async (req, res, next) => {
  try {
    const { userId, email, name, role, company } = req.body;

    // Check if profile already exists
    const existing = await UserProfile.findOne({ userId });
    if (existing) {
      return res.status(200).json({
        status: "success",
        message: "Profile already exists",
        data: { profile: existing },
      });
    }

    const profile = await UserProfile.create({
      userId,
      email,
      name,
      role,
      company,
    });

    res.status(201).json({
      status: "success",
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getVehicles,
  addVehicle,
  removeVehicle,
  getFavorites,
  addFavorite,
  removeFavorite,
  createProfile,
};
