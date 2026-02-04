import mongoose, { Schema, Document, Model, Types } from "mongoose";
import type {
  IStationStatus,
  PortStatus,
  ConnectorType,
} from "../types/vehicle.js";

// Port Status Schema (subdocument)
const PortStatusSchema = new Schema<PortStatus>(
  {
    connectorType: {
      type: String,
      required: [true, "Connector type is required"],
      enum: {
        values: ["AC_SLOW", "Type2", "CCS", "CHAdeMO"],
        message: "Connector type must be AC_SLOW, Type2, CCS, or CHAdeMO",
      },
    },
    occupied: {
      type: Number,
      required: [true, "Occupied count is required"],
      min: [0, "Occupied count cannot be negative"],
      default: 0,
    },
  },
  { _id: false },
);

// Station Status Document interface
export interface StationStatusDocument
  extends Omit<IStationStatus, "_id" | "stationId">, Document {
  stationId: Types.ObjectId;
}

// Station Status Schema
const StationStatusSchema = new Schema<StationStatusDocument>(
  {
    stationId: {
      type: Schema.Types.ObjectId,
      ref: "Station",
      required: [true, "Station ID is required"],
      unique: true,
    },
    portStatus: {
      type: [PortStatusSchema],
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Index for station lookup
StationStatusSchema.index({ stationId: 1 });

// Index for timestamp-based queries
StationStatusSchema.index({ updatedAt: -1 });

// Method to get occupied count for a specific connector type
StationStatusSchema.methods.getOccupiedCount = function (
  connectorType: ConnectorType,
): number {
  const portStatus = this.portStatus.find(
    (ps: PortStatus) => ps.connectorType === connectorType,
  );
  return portStatus ? portStatus.occupied : 0;
};

// Method to get total occupied across all ports
StationStatusSchema.methods.getTotalOccupied = function (): number {
  return this.portStatus.reduce(
    (total: number, ps: PortStatus) => total + ps.occupied,
    0,
  );
};

// Static method to update port occupancy
StationStatusSchema.statics.updateOccupancy = async function (
  stationId: string,
  connectorType: ConnectorType,
  occupied: number,
) {
  const stationStatus = await this.findOne({ stationId });

  if (stationStatus) {
    const existingPort = stationStatus.portStatus.find(
      (ps: PortStatus) => ps.connectorType === connectorType,
    );

    if (existingPort) {
      existingPort.occupied = occupied;
    } else {
      stationStatus.portStatus.push({ connectorType, occupied });
    }

    return stationStatus.save();
  } else {
    return this.create({
      stationId,
      portStatus: [{ connectorType, occupied }],
    });
  }
};

// Static method to initialize status for a station
StationStatusSchema.statics.initializeForStation = async function (
  stationId: string,
  connectorTypes: ConnectorType[],
) {
  const portStatus = connectorTypes.map((connectorType) => ({
    connectorType,
    occupied: 0,
  }));

  return this.findOneAndUpdate(
    { stationId },
    { stationId, portStatus, lastUpdated: new Date() },
    { upsert: true, new: true },
  );
};

// Model interface with statics
interface StationStatusModel extends Model<StationStatusDocument> {
  updateOccupancy(
    stationId: string,
    connectorType: ConnectorType,
    occupied: number,
  ): Promise<StationStatusDocument>;
  initializeForStation(
    stationId: string,
    connectorTypes: ConnectorType[],
  ): Promise<StationStatusDocument>;
}

const StationStatus = mongoose.model<StationStatusDocument, StationStatusModel>(
  "StationStatus",
  StationStatusSchema,
);

export default StationStatus;
