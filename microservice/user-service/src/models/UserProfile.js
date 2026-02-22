/**
 * ============================================================================
 * USER PROFILE MODEL - User Service
 * ============================================================================
 *
 * LEARNING POINT: Separate User Profile from Auth
 *
 * This model stores user PROFILE data:
 * - Vehicle profiles (for EV recommendations)
 * - Favorite stations
 * - Additional profile information
 *
 * The Auth Service stores credentials (email, password).
 * This service stores everything else about the user.
 *
 * Why separate?
 * 1. Security: Auth data is more sensitive
 * 2. Scaling: Profile reads/writes may scale differently
 * 3. Independence: Can change profile structure without touching auth
 *
 * ============================================================================
 */

const mongoose = require("mongoose");
const { VEHICLE_TYPES, CONNECTOR_TYPES } = require("../../../shared/constants");

// ============================================================================
// VEHICLE PROFILE SUB-SCHEMA
// ============================================================================

/**
 * Vehicle Profile Schema
 *
 * Stores information about a user's electric vehicle.
 * Used for generating personalized charging recommendations.
 */
const vehicleProfileSchema = new mongoose.Schema({
  // Nickname for the vehicle (e.g., "My Tesla", "Work Bike")
  nickname: {
    type: String,
    trim: true,
    maxlength: 50,
  },

  // Type of vehicle
  vehicleType: {
    type: String,
    enum: Object.values(VEHICLE_TYPES),
    required: [true, "Vehicle type is required"],
  },

  // Battery capacity in kilowatt-hours
  batteryCapacity_kWh: {
    type: Number,
    required: [true, "Battery capacity is required"],
    min: [0.5, "Battery capacity must be at least 0.5 kWh"],
    max: [200, "Battery capacity cannot exceed 200 kWh"],
  },

  // Energy efficiency (how many kWh needed per km)
  efficiency_kWh_per_km: {
    type: Number,
    required: [true, "Efficiency is required"],
    min: [0.01, "Efficiency must be at least 0.01 kWh/km"],
    max: [1, "Efficiency cannot exceed 1 kWh/km"],
  },

  // Current battery percentage (can be updated)
  batteryPercent: {
    type: Number,
    min: 0,
    max: 100,
    default: 100,
  },

  // Connectors this vehicle can use
  compatibleConnectors: {
    type: [String],
    enum: Object.values(CONNECTOR_TYPES),
    required: [true, "At least one compatible connector is required"],
    validate: {
      validator: function (connectors) {
        return connectors.length > 0;
      },
      message: "At least one compatible connector is required",
    },
  },

  // Is this the default vehicle for quick recommendations?
  isDefault: {
    type: Boolean,
    default: false,
  },
});

// ============================================================================
// USER PROFILE SCHEMA
// ============================================================================

const userProfileSchema = new mongoose.Schema(
  {
    // Reference to user in Auth Service
    // This links the profile to the auth credentials
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Basic info (mirrored from auth for convenience)
    email: {
      type: String,
      required: true,
      lowercase: true,
    },

    name: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      required: true,
    },

    // Operator-specific info
    company: {
      type: String,
    },

    // User's vehicle profiles
    vehicleProfiles: {
      type: [vehicleProfileSchema],
      default: [],
      validate: {
        validator: function (profiles) {
          return profiles.length <= 10; // Max 10 vehicles
        },
        message: "Cannot have more than 10 vehicle profiles",
      },
    },

    // Favorite station IDs
    favoriteStations: {
      type: [String], // Station IDs as strings
      default: [],
      validate: {
        validator: function (favorites) {
          return favorites.length <= 50; // Max 50 favorites
        },
        message: "Cannot have more than 50 favorite stations",
      },
    },

    // User preferences
    preferences: {
      // Preferred recommendation weights
      scoringWeights: {
        distance: { type: Number, default: 0.35 },
        availability: { type: Number, default: 0.25 },
        waitTime: { type: Number, default: 0.2 },
        price: { type: Number, default: 0.1 },
        power: { type: Number, default: 0.1 },
      },
      // Notification settings
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
    },
  },
  {
    timestamps: true,
  },
);

// ============================================================================
// INDEXES
// ============================================================================

userProfileSchema.index({ email: 1 });

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Get the default vehicle profile
 */
userProfileSchema.methods.getDefaultVehicle = function () {
  return (
    this.vehicleProfiles.find((v) => v.isDefault) || this.vehicleProfiles[0]
  );
};

/**
 * Add a vehicle profile
 */
userProfileSchema.methods.addVehicle = function (vehicleData) {
  // If this is the first vehicle, make it default
  if (this.vehicleProfiles.length === 0) {
    vehicleData.isDefault = true;
  }

  // If new vehicle is marked as default, unset others
  if (vehicleData.isDefault) {
    this.vehicleProfiles.forEach((v) => (v.isDefault = false));
  }

  this.vehicleProfiles.push(vehicleData);
  return this.vehicleProfiles[this.vehicleProfiles.length - 1];
};

/**
 * Remove a vehicle profile
 */
userProfileSchema.methods.removeVehicle = function (vehicleId) {
  const index = this.vehicleProfiles.findIndex(
    (v) => v._id.toString() === vehicleId,
  );

  if (index === -1) {
    throw new Error("Vehicle not found");
  }

  const wasDefault = this.vehicleProfiles[index].isDefault;
  this.vehicleProfiles.splice(index, 1);

  // If removed vehicle was default, make first one default
  if (wasDefault && this.vehicleProfiles.length > 0) {
    this.vehicleProfiles[0].isDefault = true;
  }
};

/**
 * Add a favorite station
 */
userProfileSchema.methods.addFavorite = function (stationId) {
  if (!this.favoriteStations.includes(stationId)) {
    this.favoriteStations.push(stationId);
  }
};

/**
 * Remove a favorite station
 */
userProfileSchema.methods.removeFavorite = function (stationId) {
  const index = this.favoriteStations.indexOf(stationId);
  if (index > -1) {
    this.favoriteStations.splice(index, 1);
  }
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find or create a user profile
 * Called when user registers in Auth Service
 */
userProfileSchema.statics.findOrCreate = async function (userData) {
  let profile = await this.findOne({ userId: userData.userId });

  if (!profile) {
    profile = await this.create(userData);
  }

  return profile;
};

// ============================================================================
// EXPORT MODEL
// ============================================================================

const UserProfile = mongoose.model("UserProfile", userProfileSchema);

module.exports = UserProfile;
