import Station, { type StationDocument } from "../models/Station.js";
import type { VehicleType, ConnectorType, Port } from "../types/vehicle.js";

/**
 * GeoService - Handles geospatial queries for stations
 */
export class GeoService {
  /**
   * Find stations within a given radius from a point
   * @param longitude - Longitude of center point
   * @param latitude - Latitude of center point
   * @param maxDistanceKm - Maximum distance in kilometers
   * @param vehicleType - Optional filter by vehicle type
   * @returns Promise of stations within range
   */
  static async findStationsNearby(
    longitude: number,
    latitude: number,
    maxDistanceKm: number,
    vehicleType?: VehicleType,
  ): Promise<StationDocument[]> {
    const query: Record<string, unknown> = {
      status: "active",
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

    if (vehicleType) {
      query["ports.vehicleType"] = vehicleType;
    }

    return Station.find(query).exec();
  }

  /**
   * Find stations within radius that have compatible connectors
   * @param longitude - Longitude of center point
   * @param latitude - Latitude of center point
   * @param maxDistanceKm - Maximum distance in kilometers
   * @param vehicleType - Vehicle type (bike/car)
   * @param compatibleConnectors - List of compatible connector types
   */
  static async findCompatibleStationsNearby(
    longitude: number,
    latitude: number,
    maxDistanceKm: number,
    vehicleType: VehicleType,
    compatibleConnectors: ConnectorType[],
  ): Promise<StationDocument[]> {
    const query = {
      status: "active" as const,
      location: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistanceKm * 1000,
        },
      },
      ports: {
        $elemMatch: {
          vehicleType: vehicleType,
          connectorType: { $in: compatibleConnectors },
        },
      },
    };

    return Station.find(query).exec();
  }

  /**
   * Find stations using aggregation with distance calculation
   * This returns stations with calculated distance from the point
   */
  static async findStationsWithDistance(
    longitude: number,
    latitude: number,
    maxDistanceKm: number,
    vehicleType: VehicleType,
    compatibleConnectors: ConnectorType[],
  ): Promise<
    Array<{
      station: StationDocument;
      distanceKm: number;
    }>
  > {
    const results = await Station.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          distanceField: "distance",
          maxDistance: maxDistanceKm * 1000, // meters
          spherical: true,
          query: {
            status: "active",
            ports: {
              $elemMatch: {
                vehicleType: vehicleType,
                connectorType: { $in: compatibleConnectors },
              },
            },
          },
        },
      },
      {
        $addFields: {
          distanceKm: { $divide: ["$distance", 1000] }, // Convert to km
        },
      },
      {
        $project: {
          distance: 0, // Remove the raw distance field
        },
      },
    ]).exec();

    return results.map((result: Record<string, unknown>) => ({
      station: result as unknown as StationDocument,
      distanceKm: Math.round((result.distanceKm as number) * 100) / 100,
    }));
  }

  /**
   * Get compatible ports from a station for a given vehicle type and connectors
   */
  static getCompatiblePorts(
    station: StationDocument,
    vehicleType: VehicleType,
    compatibleConnectors: ConnectorType[],
  ): Port[] {
    return station.ports.filter(
      (port: Port) =>
        port.vehicleType === vehicleType &&
        compatibleConnectors.includes(port.connectorType),
    );
  }

  /**
   * Get the best port (highest power) from compatible ports
   */
  static getBestPort(
    station: StationDocument,
    vehicleType: VehicleType,
    compatibleConnectors: ConnectorType[],
  ): Port | null {
    const compatiblePorts = this.getCompatiblePorts(
      station,
      vehicleType,
      compatibleConnectors,
    );

    if (compatiblePorts.length === 0) return null;

    // Sort by power descending and return the best one
    return compatiblePorts.reduce((best, current) =>
      current.powerKW > best.powerKW ? current : best,
    );
  }
}

export default GeoService;
