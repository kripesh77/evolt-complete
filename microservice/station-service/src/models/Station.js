/**
 * ============================================================================
 * STATION MODEL - Station Service
 * ============================================================================
 *
 * LEARNING POINT: Geospatial Data Model
 *
 * Stations have location data that supports geospatial queries:
 * - Find stations within X km of a point
 * - Sort by distance
 *
 * MongoDB's 2dsphere index enables efficient geo queries.
 *
 * ============================================================================
 */

const mongoose = require("mongoose");
const {
  VEHICLE_TYPES,
  CONNECTOR_TYPES,
  STATION_STATUS,
} = require("../../../shared/constants");

// ============================================================================
// PORT SUB-SCHEMA
// ============================================================================

/**
 * Port Schema
 *
 * A port is a physical charging connector at a station.
 * Stations can have multiple ports with different:
 * - Connector types (Type2, CCS, etc.)
 * - Power levels (kW)
 * - Vehicle compatibility (car/bike)
 * - Pricing
 */
const portSchema = new mongoose.Schema(
  {
    // Type of connector
    connectorType: {
      type: String,
      required: [true, "Connector type is required"],
      enum: {
        values: Object.values(CONNECTOR_TYPES),
        message: `Connector type must be one of: ${Object.values(CONNECTOR_TYPES).join(", ")}`,
      },
    },

    // What vehicles can use this port
    vehicleType: {
      type: String,
      required: [true, "Vehicle type is required"],
      enum: {
        values: Object.values(VEHICLE_TYPES),
        message: `Vehicle type must be one of: ${Object.values(VEHICLE_TYPES).join(", ")}`,
      },
    },

    // Power output in kilowatts
    powerKW: {
      type: Number,
      required: [true, "Power (kW) is required"],
      min: [0.5, "Power must be at least 0.5 kW"],
      max: [350, "Power cannot exceed 350 kW"],
    },

    // Total number of this type of port
    total: {
      type: Number,
      required: [true, "Total ports count is required"],
      min: [1, "Must have at least 1 port"],
    },

    // Currently occupied ports
    occupied: {
      type: Number,
      min: [0, "Occupied count cannot be negative"],
      default: 0,
      validate: {
        validator: function (value) {
          return value <= this.total;
        },
        message: "Occupied cannot exceed total ports",
      },
    },

    // Price per kilowatt-hour
    pricePerKWh: {
      type: Number,
      required: [true, "Price per kWh is required"],
      min: [0, "Price cannot be negative"],
    },
  },
  { _id: false },
); // No separate _id for subdocuments

// ============================================================================
// STATION SCHEMA
// ============================================================================

const stationSchema = new mongoose.Schema(
  {
    // Station name
    name: {
      type: String,
      required: [true, "Station name is required"],
      trim: true,
      maxlength: [100, "Station name cannot exceed 100 characters"],
    },

    // Owner (operator) ID - references User in auth service
    operatorId: {
      type: String,
      required: [true, "Operator ID is required"],
      index: true,
    },

    /**
     * LEARNING POINT: GeoJSON Location
     *
     * MongoDB uses GeoJSON format for geospatial data:
     * {
     *   type: "Point",
     *   coordinates: [longitude, latitude]  // Note: longitude FIRST!
     * }
     *
     * This enables powerful geo queries like:
     * - $nearSphere: Find points near a location
     * - $geoWithin: Find points within a polygon
     * - $geoNear: Aggregation with distance calculation
     */
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, "Coordinates are required"],
        validate: {
          validator: function (coords) {
            return (
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 && // longitude
              coords[1] >= -90 &&
              coords[1] <= 90 // latitude
            );
          },
          message: "Invalid coordinates. Must be [longitude, latitude]",
        },
      },
    },

    // Human-readable address
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },

    // Array of charging ports
    ports: {
      type: [portSchema],
      required: [true, "At least one port is required"],
      validate: {
        validator: function (ports) {
          return ports.length > 0;
        },
        message: "Station must have at least one port",
      },
    },

    // Operating hours (e.g., "24/7", "6:00-22:00")
    operatingHours: {
      type: String,
      default: "24/7",
      trim: true,
    },

    // Station status
    status: {
      type: String,
      enum: {
        values: Object.values(STATION_STATUS),
        message: `Status must be one of: ${Object.values(STATION_STATUS).join(", ")}`,
      },
      default: STATION_STATUS.ACTIVE,
    },

    // Last occupancy update
    lastStatusUpdate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ============================================================================
// INDEXES
// ============================================================================

/**
 * LEARNING POINT: Database Indexes
 *
 * Indexes speed up queries but slow down writes.
 * Choose indexes based on your query patterns.
 */

// 2dsphere index for geospatial queries (CRITICAL for nearby search)
stationSchema.index({ location: "2dsphere" });

// Index for status filtering
stationSchema.index({ status: 1 });

// Note: operatorId already has index: true in field definition

// Compound index for common query: active stations with specific vehicle type
stationSchema.index({ status: 1, "ports.vehicleType": 1 });

// ============================================================================
// VIRTUALS
// ============================================================================

/**
 * Virtual property for total port count
 */
stationSchema.virtual("totalPorts").get(function () {
  return this.ports.reduce((sum, port) => sum + port.total, 0);
});

/**
 * Virtual property for total occupied
 */
stationSchema.virtual("totalOccupied").get(function () {
  return this.ports.reduce((sum, port) => sum + port.occupied, 0);
});

/**
 * Virtual property for available slots
 */
stationSchema.virtual("availableSlots").get(function () {
  return this.totalPorts - this.totalOccupied;
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Get free slots for a specific connector type
 */
stationSchema.methods.getFreeSlots = function (connectorType, vehicleType) {
  return this.ports
    .filter(
      (port) =>
        (!connectorType || port.connectorType === connectorType) &&
        (!vehicleType || port.vehicleType === vehicleType),
    )
    .reduce((sum, port) => sum + (port.total - port.occupied), 0);
};

/**
 * Update occupancy for a port
 */
stationSchema.methods.updateOccupancy = function (
  connectorType,
  vehicleType,
  occupied,
) {
  const port = this.ports.find(
    (p) => p.connectorType === connectorType && p.vehicleType === vehicleType,
  );

  if (!port) {
    throw new Error("Port not found");
  }

  if (occupied > port.total) {
    throw new Error("Occupied cannot exceed total");
  }

  port.occupied = occupied;
  this.lastStatusUpdate = new Date();
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find stations near a location
 *
 * @param {number} longitude - Center point longitude
 * @param {number} latitude - Center point latitude
 * @param {number} maxDistanceKm - Maximum distance in kilometers
 * @param {object} filters - Additional filters (vehicleType, connectorType)
 */
stationSchema.statics.findNearby = async function (
  longitude,
  latitude,
  maxDistanceKm,
  filters = {},
) {
  const query = {
    status: STATION_STATUS.ACTIVE,
    location: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistanceKm * 1000, // Convert to meters
      },
    },
  };

  // Add vehicle type filter
  if (filters.vehicleType) {
    query["ports.vehicleType"] = filters.vehicleType;
  }

  // Add connector type filter
  if (filters.connectorType) {
    query["ports.connectorType"] = { $in: filters.connectorType };
  }

  return this.find(query);
};

/**
 * Find stations with distance calculation
 * Uses aggregation pipeline for more control
 */
stationSchema.statics.findWithDistance = async function (
  longitude,
  latitude,
  maxDistanceKm,
  filters = {},
) {
  const matchQuery = {
    status: STATION_STATUS.ACTIVE,
  };

  if (filters.vehicleType) {
    matchQuery["ports.vehicleType"] = filters.vehicleType;
  }

  if (filters.connectors && filters.connectors.length > 0) {
    matchQuery["ports.connectorType"] = { $in: filters.connectors };
  }

  const results = await this.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        distanceField: "distance",
        maxDistance: maxDistanceKm * 1000, // meters
        spherical: true,
        query: matchQuery,
      },
    },
    {
      $addFields: {
        distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 2] },
      },
    },
    {
      $project: {
        distance: 0, // Remove raw distance in meters
      },
    },
  ]);

  return results;
};

// ============================================================================
// EXPORT MODEL
// ============================================================================

const Station = mongoose.model("Station", stationSchema);

module.exports = Station;
