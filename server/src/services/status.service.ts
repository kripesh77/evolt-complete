import Station, { type StationDocument } from "../models/Station.js";
import type { ConnectorType, VehicleType, Port } from "../types/vehicle.js";

/**
 * StatusService - Handles station occupancy status operations
 * Uses occupied field directly in ports array
 */
export class StatusService {
  /**
   * Get station with occupancy (occupied is now in ports)
   */
  static async getStationWithStatus(
    stationId: string,
  ): Promise<StationDocument | null> {
    return Station.findById(stationId).exec();
  }

  /**
   * Get ports with occupancy for multiple stations
   */
  static async getMultipleStationPorts(
    stationIds: string[],
  ): Promise<Map<string, Port[]>> {
    const stations = await Station.find({
      _id: { $in: stationIds },
    })
      .select("_id ports")
      .exec();

    const portsMap = new Map<string, Port[]>();
    stations.forEach((station) => {
      portsMap.set(station._id.toString(), station.ports);
    });

    return portsMap;
  }

  /**
   * Update occupancy for a specific connector type
   */
  static async updateOccupancy(
    stationId: string,
    connectorType: ConnectorType,
    occupied: number,
  ): Promise<StationDocument | null> {
    return Station.updateOccupancy(stationId, connectorType, occupied);
  }

  /**
   * Increment occupancy (when a vehicle starts charging)
   */
  static async incrementOccupancy(
    stationId: string,
    connectorType: ConnectorType,
  ): Promise<StationDocument | null> {
    const station = await Station.findOneAndUpdate(
      { _id: stationId, "ports.connectorType": connectorType },
      {
        $inc: { "ports.$.occupied": 1 },
        $set: { lastStatusUpdate: new Date() },
      },
      { new: true },
    ).exec();

    return station;
  }

  /**
   * Decrement occupancy (when a vehicle finishes charging)
   */
  static async decrementOccupancy(
    stationId: string,
    connectorType: ConnectorType,
  ): Promise<StationDocument | null> {
    const station = await Station.findOneAndUpdate(
      {
        _id: stationId,
        "ports.connectorType": connectorType,
        "ports.occupied": { $gt: 0 },
      },
      {
        $inc: { "ports.$.occupied": -1 },
        $set: { lastStatusUpdate: new Date() },
      },
      { new: true },
    ).exec();

    return station;
  }

  /**
   * Get occupied count for a specific connector type
   */
  static async getOccupiedCount(
    stationId: string,
    connectorType: ConnectorType,
  ): Promise<number> {
    const station = await Station.findById(stationId).select("ports").exec();
    if (!station) return 0;

    const port = station.ports.find((p) => p.connectorType === connectorType);
    return port?.occupied || 0;
  }

  /**
   * Calculate free slots for compatible ports at a station
   */
  static calculateFreeSlots(
    ports: Port[],
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

    const occupiedSlots = compatiblePorts.reduce(
      (sum, port) => sum + (port.occupied || 0),
      0,
    );

    const freeSlots = Math.max(0, totalSlots - occupiedSlots);

    return { freeSlots, totalSlots, occupiedSlots };
  }

  /**
   * Bulk update occupancy for a station
   */
  static async bulkUpdateOccupancy(
    stationId: string,
    updates: Array<{ connectorType: ConnectorType; occupied: number }>,
  ): Promise<StationDocument | null> {
    const station = await Station.findById(stationId).exec();
    if (!station) return null;

    // Update occupied field in matching ports
    for (const update of updates) {
      const port = station.ports.find(
        (p) => p.connectorType === update.connectorType,
      );
      if (port) {
        port.occupied = update.occupied;
      }
    }

    station.lastStatusUpdate = new Date();
    return station.save();
  }

  /**
   * Reset all occupancy to zero for a station
   */
  static async resetOccupancy(
    stationId: string,
  ): Promise<StationDocument | null> {
    return Station.findByIdAndUpdate(
      stationId,
      {
        $set: {
          "ports.$[].occupied": 0,
          lastStatusUpdate: new Date(),
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
    vehicleType: VehicleType,
    compatibleConnectors: ConnectorType[],
  ): Promise<
    Map<
      string,
      { freeSlots: number; totalSlots: number; occupiedSlots: number }
    >
  > {
    const portsMap = await this.getMultipleStationPorts(stationIds);
    const availabilityMap = new Map<
      string,
      { freeSlots: number; totalSlots: number; occupiedSlots: number }
    >();

    for (const stationId of stationIds) {
      const ports = portsMap.get(stationId) || [];

      const availability = this.calculateFreeSlots(
        ports,
        vehicleType,
        compatibleConnectors,
      );

      availabilityMap.set(stationId, availability);
    }

    return availabilityMap;
  }
}

export default StatusService;
