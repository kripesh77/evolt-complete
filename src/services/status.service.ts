import StationStatus, {
  type StationStatusDocument,
} from "../models/StationStatus.js";
import type {
  ConnectorType,
  PortStatus,
  VehicleType,
  Port,
} from "../types/vehicle.js";

/**
 * StatusService - Handles station occupancy status operations
 */
export class StatusService {
  /**
   * Get status for a station
   */
  static async getStationStatus(
    stationId: string,
  ): Promise<StationStatusDocument | null> {
    return StationStatus.findOne({ stationId }).exec();
  }

  /**
   * Get status for multiple stations
   */
  static async getMultipleStationStatus(
    stationIds: string[],
  ): Promise<Map<string, StationStatusDocument>> {
    const statuses = await StationStatus.find({
      stationId: { $in: stationIds },
    }).exec();

    const statusMap = new Map<string, StationStatusDocument>();
    statuses.forEach((status) => {
      statusMap.set(status.stationId.toString(), status);
    });

    return statusMap;
  }

  /**
   * Update occupancy for a specific connector type
   */
  static async updateOccupancy(
    stationId: string,
    connectorType: ConnectorType,
    occupied: number,
  ): Promise<StationStatusDocument> {
    return StationStatus.updateOccupancy(stationId, connectorType, occupied);
  }

  /**
   * Increment occupancy (when a vehicle starts charging)
   */
  static async incrementOccupancy(
    stationId: string,
    connectorType: ConnectorType,
  ): Promise<StationStatusDocument | null> {
    const status = await StationStatus.findOneAndUpdate(
      { stationId, "portStatus.connectorType": connectorType },
      {
        $inc: { "portStatus.$.occupied": 1 },
        $set: { lastUpdated: new Date() },
      },
      { new: true },
    ).exec();

    return status;
  }

  /**
   * Decrement occupancy (when a vehicle finishes charging)
   */
  static async decrementOccupancy(
    stationId: string,
    connectorType: ConnectorType,
  ): Promise<StationStatusDocument | null> {
    const status = await StationStatus.findOneAndUpdate(
      {
        stationId,
        "portStatus.connectorType": connectorType,
        "portStatus.occupied": { $gt: 0 },
      },
      {
        $inc: { "portStatus.$.occupied": -1 },
        $set: { lastUpdated: new Date() },
      },
      { new: true },
    ).exec();

    return status;
  }

  /**
   * Get occupied count for a specific connector type
   */
  static async getOccupiedCount(
    stationId: string,
    connectorType: ConnectorType,
  ): Promise<number> {
    const status = await StationStatus.findOne({ stationId }).exec();
    if (!status) return 0;

    const portStatus = status.portStatus.find(
      (ps) => ps.connectorType === connectorType,
    );
    return portStatus?.occupied || 0;
  }

  /**
   * Calculate free slots for compatible ports at a station
   */
  static calculateFreeSlots(
    ports: Port[],
    portStatus: PortStatus[],
    vehicleType: VehicleType,
    compatibleConnectors: ConnectorType[],
  ): { freeSlots: number; totalSlots: number; occupiedSlots: number } {
    // Filter ports by vehicle type and compatible connectors
    const compatiblePorts = ports.filter(
      (port) =>
        port.vehicleType === vehicleType &&
        compatibleConnectors.includes(port.connectorType),
    );

    const totalSlots = compatiblePorts.reduce(
      (sum, port) => sum + port.total,
      0,
    );

    const occupiedSlots = compatiblePorts.reduce((sum, port) => {
      const status = portStatus.find(
        (ps) => ps.connectorType === port.connectorType,
      );
      return sum + (status?.occupied || 0);
    }, 0);

    const freeSlots = Math.max(0, totalSlots - occupiedSlots);

    return { freeSlots, totalSlots, occupiedSlots };
  }

  /**
   * Bulk update occupancy for a station
   */
  static async bulkUpdateOccupancy(
    stationId: string,
    updates: Array<{ connectorType: ConnectorType; occupied: number }>,
  ): Promise<StationStatusDocument | null> {
    let status = await StationStatus.findOne({ stationId }).exec();

    if (!status) {
      // Create new status document
      status = await StationStatus.create({
        stationId,
        portStatus: updates,
      });
    } else {
      // Update existing status
      for (const update of updates) {
        const existingPort = status.portStatus.find(
          (ps) => ps.connectorType === update.connectorType,
        );

        if (existingPort) {
          existingPort.occupied = update.occupied;
        } else {
          status.portStatus.push(update);
        }
      }

      status.lastUpdated = new Date();
      await status.save();
    }

    return status;
  }

  /**
   * Reset all occupancy to zero for a station
   */
  static async resetOccupancy(
    stationId: string,
  ): Promise<StationStatusDocument | null> {
    return StationStatus.findOneAndUpdate(
      { stationId },
      {
        $set: {
          "portStatus.$[].occupied": 0,
          lastUpdated: new Date(),
        },
      },
      { new: true },
    ).exec();
  }

  /**
   * Get stations with available slots
   */
  static async getStationsWithAvailability(
    stationIds: string[],
    ports: Map<string, Port[]>,
    vehicleType: VehicleType,
    compatibleConnectors: ConnectorType[],
  ): Promise<
    Map<
      string,
      { freeSlots: number; totalSlots: number; occupiedSlots: number }
    >
  > {
    const statusMap = await this.getMultipleStationStatus(stationIds);
    const availabilityMap = new Map<
      string,
      { freeSlots: number; totalSlots: number; occupiedSlots: number }
    >();

    for (const stationId of stationIds) {
      const stationPorts = ports.get(stationId) || [];
      const status = statusMap.get(stationId);
      const portStatus = status?.portStatus || [];

      const availability = this.calculateFreeSlots(
        stationPorts,
        portStatus,
        vehicleType,
        compatibleConnectors,
      );

      availabilityMap.set(stationId, availability);
    }

    return availabilityMap;
  }
}

export default StatusService;
