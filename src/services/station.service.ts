import Station, { type StationDocument } from "../models/Station.js";
import type {
  IStation,
  Port,
  VehicleType,
  ConnectorType,
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
    // Initialize occupied=0 for each port if not provided
    const portsWithOccupancy = stationData.ports.map((port) => ({
      ...port,
      occupied: port.occupied ?? 0,
    }));

    const station = new Station({
      ...stationData,
      ports: portsWithOccupancy,
      lastStatusUpdate: new Date(),
    });
    await station.save();

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
    return Station.findByIdAndDelete(stationId).exec();
  }

  /**
   * Add a port to a station
   */
  static async addPort(
    stationId: string,
    port: Port,
  ): Promise<StationDocument | null> {
    const station = await Station.findById(stationId).exec();
    if (!station) return null;

    // Add the port with occupied=0 if not provided
    station.ports.push({
      ...port,
      occupied: port.occupied ?? 0,
    });

    await station.save();
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
