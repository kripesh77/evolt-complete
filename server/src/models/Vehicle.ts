import mongoose, { Schema, Document, Model } from "mongoose";
import validator from "validator";
import type { VehicleType, ConnectorType } from "../types/vehicle.js";

// Vehicle Document interface (catalog entry, admin-curated)
// NOTE: field is `modelName`, not `model` — `model` is a member Mongoose's
// own Document type already exposes (the function used to register/
// retrieve models), so reusing it as a schema field name breaks the
// Document interface extension at compile time.
export interface VehicleDocument extends Document {
  make: string;
  modelName: string;
  variant?: string;
  vehicleType: VehicleType;
  image: string;
  batteryCapacity_kWh: number;
  efficiency_kWh_per_km: number;
  compatibleConnectors: ConnectorType[];
  isActive: boolean;
  addedBy?: mongoose.Types.ObjectId; // admin who verified/added this entry
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<VehicleDocument>(
  {
    make: {
      type: String,
      required: [true, "Make is required"],
      trim: true,
      maxlength: [50, "Make cannot exceed 50 characters"],
    },
    modelName: {
      type: String,
      required: [true, "Model is required"],
      trim: true,
      maxlength: [50, "Model cannot exceed 50 characters"],
    },
    variant: {
      type: String,
      trim: true,
      maxlength: [50, "Variant cannot exceed 50 characters"],
    },
    vehicleType: {
      type: String,
      required: [true, "Vehicle type is required"],
      enum: {
        values: ["bike", "car"],
        message: "Vehicle type must be bike or car",
      },
    },
    image: { type: String, validate: validator.isURL },
    batteryCapacity_kWh: {
      type: Number,
      required: [true, "Battery capacity is required"],
      min: [0.5, "Battery capacity must be at least 0.5 kWh"],
      max: [200, "Battery capacity cannot exceed 200 kWh"],
    },
    compatibleConnectors: {
      type: [String],
      required: [true, "At least one compatible connector is required"],
      enum: {
        values: ["AC_SLOW", "Type2", "CCS", "CHAdeMO"],
        message: "Connector type must be AC_SLOW, Type2, CCS, or CHAdeMO",
      },
      validate: {
        validator: function (connectors: ConnectorType[]) {
          return connectors.length > 0;
        },
        message: "Vehicle must support at least one connector type",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Text index for search (make + modelName + variant)
VehicleSchema.index({ make: "text", modelName: "text", variant: "text" });

// Compound index for filtering by type + active status (common query pattern)
VehicleSchema.index({ vehicleType: 1, isActive: 1 });

// Prevent exact duplicate catalog entries (same make/modelName/variant/type)
VehicleSchema.index(
  { make: 1, modelName: 1, variant: 1, vehicleType: 1 },
  { unique: true },
);

// Static method to search the catalog by free-text query
// Filter is built as Record<string, unknown> (not the generated strict
// filter type) because $regex/$or query operators on a plain object
// literal don't satisfy Mongoose's per-field FilterQuery typing.
VehicleSchema.statics.search = function (
  query: string,
  vehicleType?: VehicleType,
  limit = 20,
) {
  const filter: Record<string, unknown> = { isActive: true };

  if (vehicleType) {
    filter.vehicleType = vehicleType;
  }

  if (query && query.trim().length > 0) {
    filter.$or = [
      { make: { $regex: query, $options: "i" } },
      { modelName: { $regex: query, $options: "i" } },
      { variant: { $regex: query, $options: "i" } },
    ];
  }

  return this.find(filter).sort({ make: 1, modelName: 1 }).limit(limit);
};

interface VehicleModel extends Model<VehicleDocument> {
  search(
    query: string,
    vehicleType?: VehicleType,
    limit?: number,
  ): ReturnType<Model<VehicleDocument>["find"]>;
}

const Vehicle = mongoose.model<VehicleDocument, VehicleModel>(
  "Vehicle",
  VehicleSchema,
);

export default Vehicle;
