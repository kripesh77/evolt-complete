import Station, { type StationDocument } from "../models/Station.js";
import StationStatus from "../models/StationStatus.js";
import type {
  IStation,
  Port,
  ConnectorType,
  VehicleType,
} from "../types/vehicle.js";

/**
 * StationService - Handles station CRUD operations
 */
export class StationService {
  /**
   * Create a new station
   */
  static async createStation(
    stationData: Omit<IStation, "_id" | "createdAt" | "updatedAt">,
  ): Promise<StationDocument> {
    const station = new Station(stationData);
    await station.save();

    // Initialize station status with zero occupancy for all connector types
    const connectorTypes = station.ports.map(
      (port: Port) => port.connectorType,
    );
    const uniqueConnectorTypes = [
      ...new Set(connectorTypes),
    ] as ConnectorType[];
    await StationStatus.initializeForStation(
      station._id.toString(),
      uniqueConnectorTypes,
    );

    return station;
  }

  /**
   * Get all stations with optional filters
   */
  static async getAllStations(filters?: {
    status?: "active" | "inactive";
    vehicleType?: VehicleType;
  }): Promise<StationDocument[]> {
    const query: Record<string, unknown> = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.vehicleType) {
      query["ports.vehicleType"] = filters.vehicleType;
    }

    return Station.find(query).exec();
  }

  /**
   * Get station by ID
   */
  static async getStationById(
    stationId: string,
  ): Promise<StationDocument | null> {
    return Station.findById(stationId).exec();
  }

  /**
   * Update station
   */
  static async updateStation(
    stationId: string,
    updateData: Partial<IStation>,
  ): Promise<StationDocument | null> {
    return Station.findByIdAndUpdate(stationId, updateData, {
      new: true,
      runValidators: true,
    }).exec();
  }

  /**
   * Delete station
   */
  static async deleteStation(
    stationId: string,
  ): Promise<StationDocument | null> {
    // Also delete associated status
    await StationStatus.deleteOne({ stationId });
    return Station.findByIdAndDelete(stationId).exec();
  }

  /**
   * Add a port to a station
   */
  static async addPort(
    stationId: string,
    port: Port,
  ): Promise<StationDocument | null> {
    const station = await Station.findByIdAndUpdate(
      stationId,
      { $push: { ports: port } },
      { new: true, runValidators: true },
    ).exec();

    if (station) {
      // Update station status to include new connector type
      await StationStatus.initializeForStation(
        stationId,
        station.ports.map((p: Port) => p.connectorType) as ConnectorType[],
      );
    }

    return station;
  }

  /**
   * Remove a port from a station
   */
  static async removePort(
    stationId: string,
    connectorType: ConnectorType,
    vehicleType: VehicleType,
  ): Promise<StationDocument | null> {
    return Station.findByIdAndUpdate(
      stationId,
      {
        $pull: {
          ports: { connectorType, vehicleType },
        },
      },
      { new: true },
    ).exec();
  }

  /**
   * Update station status (active/inactive)
   */
  static async updateStationStatus(
    stationId: string,
    status: "active" | "inactive",
  ): Promise<StationDocument | null> {
    return Station.findByIdAndUpdate(
      stationId,
      { status },
      { new: true },
    ).exec();
  }

  /**
   * Get station statistics
   */
  static async getStationStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    bikePorts: number;
    carPorts: number;
  }> {
    const stats = await Station.aggregate([
      {
        $facet: {
          statusCount: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          portStats: [
            { $unwind: "$ports" },
            {
              $group: {
                _id: "$ports.vehicleType",
                totalPorts: { $sum: "$ports.total" },
              },
            },
          ],
        },
      },
    ]).exec();

    const result = stats[0];
    const statusCounts = result?.statusCount || [];
    const portStats = result?.portStats || [];

    return {
      total: statusCounts.reduce(
        (sum: number, s: { count: number }) => sum + s.count,
        0,
      ),
      active:
        statusCounts.find((s: { _id: string }) => s._id === "active")?.count ||
        0,
      inactive:
        statusCounts.find((s: { _id: string }) => s._id === "inactive")
          ?.count || 0,
      bikePorts:
        portStats.find((p: { _id: string }) => p._id === "bike")?.totalPorts ||
        0,
      carPorts:
        portStats.find((p: { _id: string }) => p._id === "car")?.totalPorts ||
        0,
    };
  }
}

export default StationService;
