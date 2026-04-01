import Station, { type StationDocument } from "../models/Station.js";
import type {
  VehicleType,
  ConnectorType,
  Port,
  GeoPolygon,
} from "../types/vehicle.js";

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
   * Find stations within a polygon (for route-aware recommendations)
   * @param polygon - GeoJSON polygon defining the search area
   * @param vehicleType - Vehicle type (bike/car)
   * @param compatibleConnectors - List of compatible connector types
   */
  static async findStationsInPolygon(
    polygon: GeoPolygon,
    vehicleType: VehicleType,
    compatibleConnectors: ConnectorType[],
  ): Promise<StationDocument[]> {
    const query = {
      status: "active" as const,
      location: {
        $geoWithin: {
          $geometry: polygon,
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
   * Find stations within a polygon with straight-line distance calculation
   * Uses aggregation to include distance from a reference point
   */
  static async findStationsInPolygonWithDistance(
    polygon: GeoPolygon,
    referencePoint: { longitude: number; latitude: number },
    vehicleType: VehicleType,
    compatibleConnectors: ConnectorType[],
  ): Promise<
    Array<{
      station: StationDocument;
      straightLineDistanceKm: number;
    }>
  > {
    // First, find stations within polygon
    const stations = await this.findStationsInPolygon(
      polygon,
      vehicleType,
      compatibleConnectors,
    );

    // Calculate straight-line distance for each station using Haversine
    return stations.map((station) => {
      const stationLon = station.location.coordinates[0];
      const stationLat = station.location.coordinates[1];

      const straightLineDistanceKm = this.haversineDistance(
        referencePoint.latitude,
        referencePoint.longitude,
        stationLat,
        stationLon,
      );

      return {
        station,
        straightLineDistanceKm: Math.round(straightLineDistanceKm * 100) / 100,
      };
    });
  }

  /**
   * Calculate Haversine distance between two points
   */
  private static haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
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
