import mongoose, { Schema, Document, Model } from "mongoose";
import type { IStation, Port, VehicleType } from "../types/vehicle.js";

// Port Schema (subdocument)
const PortSchema = new Schema<Port>(
  {
    connectorType: {
      type: String,
      required: [true, "Connector type is required"],
      enum: {
        values: ["AC_SLOW", "Type2", "CCS", "CHAdeMO"],
        message: "Connector type must be AC_SLOW, Type2, CCS, or CHAdeMO",
      },
    },
    vehicleType: {
      type: String,
      required: [true, "Vehicle type is required"],
      enum: {
        values: ["bike", "car"],
        message: "Vehicle type must be bike or car",
      },
    },
    powerKW: {
      type: Number,
      required: [true, "Power (kW) is required"],
      min: [0.5, "Power must be at least 0.5 kW"],
      max: [350, "Power cannot exceed 350 kW"],
    },
    total: {
      type: Number,
      required: [true, "Total ports count is required"],
      min: [1, "Must have at least 1 port"],
    },
    pricePerKWh: {
      type: Number,
      required: [true, "Price per kWh is required"],
      min: [0, "Price cannot be negative"],
    },
  },
  { _id: false },
);

// Station Document interface (extends IStation with Mongoose Document)
export interface StationDocument extends Omit<IStation, "_id">, Document {}

// Station Schema
const StationSchema = new Schema<StationDocument>(
  {
    name: {
      type: String,
      required: [true, "Station name is required"],
      trim: true,
      maxlength: [100, "Station name cannot exceed 100 characters"],
    },
    operatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Operator ID is required"],
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: [true, "Coordinates are required"],
        validate: {
          validator: function (coords: number[]) {
            return (
              coords.length === 2 &&
              coords[0]! >= -180 &&
              coords[0]! <= 180 && // longitude
              coords[1]! >= -90 &&
              coords[1]! <= 90 // latitude
            );
          },
          message: "Invalid coordinates. Must be [longitude, latitude]",
        },
      },
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    ports: {
      type: [PortSchema],
      required: [true, "At least one port is required"],
      validate: {
        validator: function (ports: Port[]) {
          return ports.length > 0;
        },
        message: "Station must have at least one port",
      },
    },
    operatingHours: {
      type: String,
      default: "24/7",
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "Status must be active or inactive",
      },
      default: "active",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Create 2dsphere index for geospatial queries
StationSchema.index({ location: "2dsphere" });

// Index for status filtering
StationSchema.index({ status: 1 });

// Compound index for common query patterns
StationSchema.index({ status: 1, "ports.vehicleType": 1 });

// Virtual to get total port count
StationSchema.virtual("totalPorts").get(function (this: StationDocument) {
  return this.ports.reduce((sum: number, port: Port) => sum + port.total, 0);
});

// Virtual to get bike port count
StationSchema.virtual("bikePorts").get(function (this: StationDocument) {
  return this.ports
    .filter((port: Port) => port.vehicleType === "bike")
    .reduce((sum: number, port: Port) => sum + port.total, 0);
});

// Virtual to get car port count
StationSchema.virtual("carPorts").get(function (this: StationDocument) {
  return this.ports
    .filter((port: Port) => port.vehicleType === "car")
    .reduce((sum: number, port: Port) => sum + port.total, 0);
});

// Static method to find stations near a location
StationSchema.statics.findNearby = function (
  longitude: number,
  latitude: number,
  maxDistanceKm: number,
  vehicleType?: VehicleType,
) {
  const query: Record<string, unknown> = {
    status: "active",
    location: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistanceKm * 1000, // Convert km to meters
      },
    },
  };

  if (vehicleType) {
    query["ports.vehicleType"] = vehicleType;
  }

  return this.find(query);
};

// Model with statics type
interface StationModel extends Model<StationDocument> {
  findNearby(
    longitude: number,
    latitude: number,
    maxDistanceKm: number,
    vehicleType?: VehicleType,
  ): ReturnType<Model<StationDocument>["find"]>;
}

const Station = mongoose.model<StationDocument, StationModel>(
  "Station",
  StationSchema,
);

export default Station;
