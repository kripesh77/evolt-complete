import mongoose, { Schema, Document, Model } from "mongoose";
import type {
  IStation,
  Port,
  VehicleType,
  ConnectorType,
  OperatingHours,
} from "../types/vehicle.js";

// Port Schema (subdocument with occupancy tracking)
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
    occupied: {
      type: Number,
      min: [0, "Occupied count cannot be negative"],
      default: 0,
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
export interface StationDocument extends Omit<IStation, "_id">, Document {
  getOccupiedCount(connectorType: ConnectorType): number;
  getTotalOccupied(): number;
}

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
      type: {
        type: String,
        enum: ["24/7", "custom"],
        default: "24/7",
      },
      openTime: {
        type: String,
        validate: {
          validator: function (v: string) {
            if (!v) return true; // Allow null/undefined
            return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: "Open time must be in HH:mm format (e.g., 06:00)",
        },
      },
      closeTime: {
        type: String,
        validate: {
          validator: function (v: string) {
            if (!v) return true; // Allow null/undefined
            return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: "Close time must be in HH:mm format (e.g., 22:00)",
        },
      },
      weekdayHours: {
        openTime: String,
        closeTime: String,
      },
      weekendHours: {
        openTime: String,
        closeTime: String,
      },
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (images: string[]) {
          return images.length <= 5; // Max 5 images per station
        },
        message: "Station cannot have more than 5 images",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "Status must be active or inactive",
      },
      default: "active",
    },
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

// Static method to update port occupancy (updates occupied field directly in ports array)
StationSchema.statics.updateOccupancy = async function (
  stationId: string,
  connectorType: ConnectorType,
  occupied: number,
): Promise<StationDocument | null> {
  return this.findOneAndUpdate(
    { _id: stationId, "ports.connectorType": connectorType },
    {
      $set: {
        "ports.$.occupied": occupied,
        lastStatusUpdate: new Date(),
      },
    },
    { new: true },
  ).exec();
};

// Instance method to get occupied count for a specific connector type
StationSchema.methods.getOccupiedCount = function (
  connectorType: ConnectorType,
): number {
  const port = this.ports.find((p: Port) => p.connectorType === connectorType);
  return port ? port.occupied : 0;
};

// Instance method to get total occupied across all ports
StationSchema.methods.getTotalOccupied = function (): number {
  return this.ports.reduce(
    (total: number, port: Port) => total + (port.occupied || 0),
    0,
  );
};

// Model with statics type
interface StationModel extends Model<StationDocument> {
  findNearby(
    longitude: number,
    latitude: number,
    maxDistanceKm: number,
    vehicleType?: VehicleType,
  ): ReturnType<Model<StationDocument>["find"]>;
  updateOccupancy(
    stationId: string,
    connectorType: ConnectorType,
    occupied: number,
  ): Promise<StationDocument | null>;
}

const Station = mongoose.model<StationDocument, StationModel>(
  "Station",
  StationSchema,
);

export default Station;
