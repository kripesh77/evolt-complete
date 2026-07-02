import mongoose, { Schema, Document, Model } from "mongoose";
import type { VehicleType, ConnectorType } from "../types/vehicle.js";

export type VehicleRequestStatus = "pending" | "approved" | "rejected";

// Max number of unresolved (pending) requests a single user may have open at once
export const MAX_PENDING_REQUESTS_PER_USER = 5;

// VehicleRequest Document interface
// NOTE: field is `modelName`, not `model` — same reason as Vehicle.ts:
// `model` collides with the member Mongoose's own Document type exposes.
export interface VehicleRequestDocument extends Document {
  requestedBy: mongoose.Types.ObjectId;
  make: string;
  modelName: string;
  variant?: string;
  vehicleType: VehicleType;
  // Specs are optional on request — the user may not know exact figures,
  // admin fills in/corrects these when approving
  batteryCapacity_kWh?: number;
  efficiency_kWh_per_km?: number;
  compatibleConnectors?: ConnectorType[];
  notes?: string;
  status: VehicleRequestStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewNotes?: string;
  resultingVehicleId?: mongoose.Types.ObjectId; // set when approved & added to catalog
  createdAt: Date;
  updatedAt: Date;
}

const VehicleRequestSchema = new Schema<VehicleRequestDocument>(
  {
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Requesting user is required"],
      index: true,
    },
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
    batteryCapacity_kWh: {
      type: Number,
      min: [0.5, "Battery capacity must be at least 0.5 kWh"],
      max: [200, "Battery capacity cannot exceed 200 kWh"],
    },
    efficiency_kWh_per_km: {
      type: Number,
      min: [0.01, "Efficiency must be at least 0.01 kWh/km"],
      max: [1, "Efficiency cannot exceed 1 kWh/km"],
    },
    compatibleConnectors: {
      type: [String],
      enum: {
        values: ["AC_SLOW", "Type2", "CCS", "CHAdeMO"],
        message: "Connector type must be AC_SLOW, Type2, CCS, or CHAdeMO",
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "approved", "rejected"],
        message: "Status must be pending, approved, or rejected",
      },
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: [500, "Review notes cannot exceed 500 characters"],
    },
    resultingVehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for the duplicate-detection lookup (exact match, pending only)
VehicleRequestSchema.index({ make: 1, modelName: 1, variant: 1, status: 1 });

// Compound index for counting a user's pending requests
VehicleRequestSchema.index({ requestedBy: 1, status: 1 });

// Static method to find an exact-match pending duplicate
// Filter is built as Record<string, unknown> rather than relying on the
// generated strict FilterQuery type: $regex and a mixed-type $in (null +
// strings, used to also match "no variant" requests) on a plain object
// literal don't satisfy Mongoose's per-field filter typing.
VehicleRequestSchema.statics.findPendingDuplicate = function (
  make: string,
  modelName: string,
  variant: string | undefined,
  vehicleType: VehicleType,
) {
  const filter: Record<string, unknown> = {
    make: { $regex: `^${escapeRegex(make.trim())}$`, $options: "i" },
    modelName: { $regex: `^${escapeRegex(modelName.trim())}$`, $options: "i" },
    variant: variant
      ? { $regex: `^${escapeRegex(variant.trim())}$`, $options: "i" }
      : { $in: [null, ""] },
    vehicleType,
    status: "pending",
  };

  return this.findOne(filter);
};

// Static method to count a user's currently unresolved requests
VehicleRequestSchema.statics.countPendingForUser = function (
  userId: string,
) {
  return this.countDocuments({ requestedBy: userId, status: "pending" });
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface VehicleRequestModel extends Model<VehicleRequestDocument> {
  findPendingDuplicate(
    make: string,
    modelName: string,
    variant: string | undefined,
    vehicleType: VehicleType,
  ): ReturnType<Model<VehicleRequestDocument>["findOne"]>;
  countPendingForUser(userId: string): Promise<number>;
}

const VehicleRequest = mongoose.model<
  VehicleRequestDocument,
  VehicleRequestModel
>("VehicleRequest", VehicleRequestSchema);

export default VehicleRequest;
