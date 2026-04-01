import type {
  RecommendationRequest,
  RouteRecommendationRequest,
  RecommendedStation,
  VehicleProfile,
  ConnectorType,
  Port,
  ScoringWeights,
  GeoLocation,
  RouteInfo,
  RouteAwareResponse,
  OperatingHours,
} from "../types/vehicle.js";
import { DEFAULT_SCORING_WEIGHTS } from "../types/vehicle.js";
import { GeoService } from "./geo.service.js";
import { RouteService } from "./route.service.js";
import { StatusService } from "./status.service.js";
import {
  calculateReachableDistance,
  calculateEnergyNeeded,
  calculateChargingTime,
  calculateChargingCost,
  calculateWaitTime,
  getAverageChargeTime,
} from "../utils/calculations.js";
import { scoreStations, type StationScoreInput } from "../utils/scoring.js";
import type { StationDocument } from "../models/Station.js";

/**
 * RecommendationService - Core service for generating smart charging recommendations
 */
export class RecommendationService {
  /**
   * Get smart charging station recommendations
   */
  static async getRecommendations(
    request: RecommendationRequest,
    weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
    limit: number = 10,
  ): Promise<RecommendedStation[]> {
    const { vehicleProfile, currentLocation } = request;

    // Step 1: Calculate reachable distance with safety buffer
    const reachableKm = calculateReachableDistance(vehicleProfile);

    if (reachableKm <= 0) {
      return []; // Battery too low to reach anywhere
    }

    // Step 2: Find compatible stations within reachable distance
    const stationsWithDistance = await GeoService.findStationsWithDistance(
      currentLocation.longitude,
      currentLocation.latitude,
      reachableKm,
      vehicleProfile.vehicleType,
      vehicleProfile.compatibleConnectors,
    );

    if (stationsWithDistance.length === 0) {
      return []; // No compatible stations in range
    }

    // Step 3: Get ports for all found stations (occupancy is in ports)
    const stationIds = stationsWithDistance.map((s) =>
      (s.station as unknown as { _id: { toString(): string } })._id.toString(),
    );
    const portsMap = await StatusService.getMultipleStationPorts(stationIds);

    // Step 4: Process each station and prepare for scoring
    const stationScoreInputs: Array<
      StationScoreInput & {
        station: StationDocument;
        bestPort: Port;
      }
    > = [];

    for (const { station, distanceKm } of stationsWithDistance) {
      // Get the best compatible port
      const bestPort = GeoService.getBestPort(
        station,
        vehicleProfile.vehicleType,
        vehicleProfile.compatibleConnectors,
      );

      if (!bestPort) continue;

      // Get ports for this station (occupancy is embedded in each port)
      const ports =
        portsMap.get(
          (
            station as unknown as { _id: { toString(): string } }
          )._id.toString(),
        ) || station.ports;

      // Calculate availability for compatible ports
      const availability = StatusService.calculateFreeSlots(
        ports,
        vehicleProfile.vehicleType,
        vehicleProfile.compatibleConnectors,
      );

      // Calculate estimated wait time
      const avgChargeTime = getAverageChargeTime(
        vehicleProfile.vehicleType,
        bestPort.powerKW,
      );
      const waitTime = calculateWaitTime(
        availability.occupiedSlots,
        availability.totalSlots,
        avgChargeTime,
      );

      stationScoreInputs.push({
        stationId: (
          station as unknown as { _id: { toString(): string } }
        )._id.toString(),
        distanceKm,
        freeSlots: availability.freeSlots,
        totalSlots: availability.totalSlots,
        waitTimeMinutes: waitTime,
        powerKW: bestPort.powerKW,
        pricePerKWh: bestPort.pricePerKWh,
        reachableKm,
        station,
        bestPort,
      });
    }

    // Step 5: Score and rank stations
    const scoredStations = scoreStations(
      stationScoreInputs,
      vehicleProfile.vehicleType,
      weights,
    );

    // Step 6: Build response with full details
    const recommendations: RecommendedStation[] = scoredStations
      .slice(0, limit)
      .map((scored) => {
        const originalStation = stationScoreInputs.find(
          (s) => s.stationId === scored.stationId,
        );

        if (!originalStation) {
          throw new Error("Station not found in original list");
        }

        const { station, bestPort } = originalStation;

        // Calculate energy needed and cost
        const energyNeeded = calculateEnergyNeeded(
          vehicleProfile.batteryCapacity_kWh,
          vehicleProfile.batteryPercent,
        );

        const estimatedCost = calculateChargingCost(
          energyNeeded,
          bestPort.pricePerKWh,
        );

        const estimatedChargeTime = calculateChargingTime(
          energyNeeded,
          bestPort.powerKW,
        );

        return {
          stationId: scored.stationId,
          stationName: station.name,
          address: station.address,
          recommendedPort: bestPort.connectorType,
          powerKW: bestPort.powerKW,
          pricePerKWh: bestPort.pricePerKWh,
          freeSlots: scored.freeSlots,
          totalSlots: scored.totalSlots,
          estimatedWaitMinutes: scored.waitTimeMinutes,
          distanceKm: scored.distanceKm,
          estimatedCost,
          estimatedChargeTimeMinutes: estimatedChargeTime,
          score: scored.score,
          location: {
            longitude: station.location.coordinates[0]!,
            latitude: station.location.coordinates[1]!,
          },
          operatingHours: station.operatingHours,
          images: station.images,
        };
      });

    return recommendations;
  }

  /**
   * Get quick nearby stations without full scoring (for overview)
   */
  static async getNearbyStations(
    longitude: number,
    latitude: number,
    radiusKm: number = 10,
    vehicleType?: "bike" | "car",
  ): Promise<
    Array<{
      stationId: string;
      name: string;
      address: string;
      distanceKm: number;
      status: string;
      operatingHours?: OperatingHours;
      images?: string[];
      location: {
        type: "Point";
        coordinates: [number, number];
      };
      portSummary: {
        bikePorts: number;
        carPorts: number;
      };
    }>
  > {
    const stations = await GeoService.findStationsNearby(
      longitude,
      latitude,
      radiusKm,
      vehicleType,
    );

    return stations.map((station) => ({
      stationId: (
        station as unknown as { _id: { toString(): string } }
      )._id.toString(),
      name: station.name,
      address: station.address,
      distanceKm: 0, // Would need aggregation to get actual distance
      status: station.status,
      operatingHours: station.operatingHours,
      images: station.images,
      location: station.location,
      portSummary: {
        bikePorts: station.ports
          .filter((p: Port) => p.vehicleType === "bike")
          .reduce((sum: number, p: Port) => sum + p.total, 0),
        carPorts: station.ports
          .filter((p: Port) => p.vehicleType === "car")
          .reduce((sum: number, p: Port) => sum + p.total, 0),
      },
    }));
  }

  /**
   * Validate vehicle profile
   */
  static validateVehicleProfile(profile: VehicleProfile): string[] {
    const errors: string[] = [];

    if (!["bike", "car"].includes(profile.vehicleType)) {
      errors.push("vehicleType must be 'bike' or 'car'");
    }

    if (profile.batteryCapacity_kWh <= 0) {
      errors.push("batteryCapacity_kWh must be greater than 0");
    }

    if (profile.efficiency_kWh_per_km <= 0) {
      errors.push("efficiency_kWh_per_km must be greater than 0");
    }

    if (profile.batteryPercent < 0 || profile.batteryPercent > 100) {
      errors.push("batteryPercent must be between 0 and 100");
    }

    if (
      !profile.compatibleConnectors ||
      profile.compatibleConnectors.length === 0
    ) {
      errors.push("At least one compatible connector must be specified");
    }

    const validConnectors: ConnectorType[] = [
      "AC_SLOW",
      "Type2",
      "CCS",
      "CHAdeMO",
    ];
    const invalidConnectors = profile.compatibleConnectors.filter(
      (c) => !validConnectors.includes(c),
    );
    if (invalidConnectors.length > 0) {
      errors.push(`Invalid connectors: ${invalidConnectors.join(", ")}`);
    }

    // Validate connector types match vehicle type
    if (profile.vehicleType === "bike") {
      const carConnectors = profile.compatibleConnectors.filter((c) =>
        ["Type2", "CCS", "CHAdeMO"].includes(c),
      );
      if (carConnectors.length > 0) {
        errors.push(
          `Bikes cannot use car connectors: ${carConnectors.join(", ")}`,
        );
      }
    }

    return errors;
  }

  /**
   * Get recommendation with specific port type preference
   */
  static async getRecommendationsWithPreference(
    request: RecommendationRequest,
    preferredConnector?: ConnectorType,
    preferFastCharging: boolean = false,
    weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
    limit: number = 10,
  ): Promise<RecommendedStation[]> {
    // Adjust weights based on preferences
    const adjustedWeights = { ...weights };

    if (preferFastCharging) {
      adjustedWeights.power = weights.power * 1.5;
      adjustedWeights.cost = weights.cost * 0.7;
    }

    // If preferred connector, filter compatible connectors
    let modifiedRequest = { ...request };
    if (
      preferredConnector &&
      request.vehicleProfile.compatibleConnectors.includes(preferredConnector)
    ) {
      modifiedRequest = {
        ...request,
        vehicleProfile: {
          ...request.vehicleProfile,
          compatibleConnectors: [preferredConnector],
        },
      };
    }

    return this.getRecommendations(modifiedRequest, adjustedWeights, limit);
  }

  /**
   * Get route-aware charging station recommendations
   * Uses real driving distances from OpenRouteService
   */
  static async getRouteAwareRecommendations(
    request: RouteRecommendationRequest,
    weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
    limit: number = 10,
  ): Promise<RouteAwareResponse> {
    const { vehicleProfile, currentLocation, destination, routeOffsetKm } =
      request;

    // Step 1: Get the route from OpenRouteService
    const routeInfo = await RouteService.getRoute(currentLocation, destination);

    // Step 2: Simplify polyline for buffer creation (improves performance)
    const simplifiedPolyline = RouteService.simplifyPolyline(
      routeInfo.polyline,
      0.0005, // ~50m tolerance
    );

    // Step 3: Create polygon buffer around the route
    const routeBuffer = RouteService.createRouteBuffer(
      simplifiedPolyline,
      routeOffsetKm,
    );

    // Step 4: Find compatible stations within the route buffer polygon
    const stationsInBuffer = await GeoService.findStationsInPolygonWithDistance(
      routeBuffer,
      currentLocation,
      vehicleProfile.vehicleType,
      vehicleProfile.compatibleConnectors,
    );

    if (stationsInBuffer.length === 0) {
      return {
        recommendations: [],
        routeInfo,
        searchArea: routeBuffer,
      };
    }

    // Step 5: Get real driving distances from current location to all stations
    // Using OpenRouteService Matrix API - ONE request for all stations
    const stationLocations: GeoLocation[] = stationsInBuffer.map((s) => ({
      longitude: s.station.location.coordinates[0],
      latitude: s.station.location.coordinates[1],
    }));

    const distanceMatrix = await RouteService.getDistanceMatrix(
      currentLocation,
      stationLocations,
    );

    // Step 6: Get ports for all found stations
    const stationIds = stationsInBuffer.map((s) =>
      (s.station as unknown as { _id: { toString(): string } })._id.toString(),
    );
    const portsMap = await StatusService.getMultipleStationPorts(stationIds);

    // Step 7: Calculate reachable distance for filtering
    const reachableKm = calculateReachableDistance(vehicleProfile);

    // Step 8: Process each station with real driving distances
    const stationScoreInputs: Array<
      StationScoreInput & {
        station: StationDocument;
        bestPort: Port;
        realDrivingDistanceKm: number;
        realDrivingDurationMinutes: number;
      }
    > = [];

    for (let i = 0; i < stationsInBuffer.length; i++) {
      const { station } = stationsInBuffer[i]!;

      // Get real driving distance from matrix (convert meters to km)
      const realDistanceMeters = distanceMatrix.distances[0]?.[i];
      const realDurationSeconds = distanceMatrix.durations[0]?.[i];

      // Skip if no route found to this station
      if (realDistanceMeters === null || realDistanceMeters === undefined) {
        continue;
      }

      const realDrivingDistanceKm = realDistanceMeters / 1000;
      const realDrivingDurationMinutes = (realDurationSeconds || 0) / 60;

      // Skip if station is beyond reachable distance
      if (realDrivingDistanceKm > reachableKm) {
        continue;
      }

      // Get the best compatible port
      const bestPort = GeoService.getBestPort(
        station,
        vehicleProfile.vehicleType,
        vehicleProfile.compatibleConnectors,
      );

      if (!bestPort) continue;

      // Get ports for this station
      const ports =
        portsMap.get(
          (
            station as unknown as { _id: { toString(): string } }
          )._id.toString(),
        ) || station.ports;

      // Calculate availability for compatible ports
      const availability = StatusService.calculateFreeSlots(
        ports,
        vehicleProfile.vehicleType,
        vehicleProfile.compatibleConnectors,
      );

      const avgChargeTime = getAverageChargeTime(
        vehicleProfile.vehicleType,
        bestPort.powerKW,
      );

      // Calculate estimated wait time
      const waitTime = calculateWaitTime(
        availability.occupiedSlots,
        availability.totalSlots,
        avgChargeTime,
      );

      stationScoreInputs.push({
        stationId: (
          station as unknown as { _id: { toString(): string } }
        )._id.toString(),
        distanceKm: realDrivingDistanceKm, // Using REAL driving distance!
        freeSlots: availability.freeSlots,
        totalSlots: availability.totalSlots,
        waitTimeMinutes: waitTime,
        powerKW: bestPort.powerKW,
        pricePerKWh: bestPort.pricePerKWh,
        reachableKm,
        station,
        bestPort,
        realDrivingDistanceKm,
        realDrivingDurationMinutes,
      });
    }

    // Step 9: Score and rank stations using real distances
    const scoredStations = scoreStations(
      stationScoreInputs,
      vehicleProfile.vehicleType,
      weights,
    );

    // Step 10: Build response with full details
    const recommendations: RecommendedStation[] = scoredStations
      .slice(0, limit)
      .map((scored) => {
        const originalStation = stationScoreInputs.find(
          (s) => s.stationId === scored.stationId,
        );

        if (!originalStation) {
          throw new Error("Station not found in original list");
        }

        const { station, bestPort, realDrivingDurationMinutes } =
          originalStation;

        // Calculate energy needed and cost
        const energyNeeded = calculateEnergyNeeded(
          vehicleProfile.batteryCapacity_kWh,
          vehicleProfile.batteryPercent,
        );

        const estimatedCost = calculateChargingCost(
          energyNeeded,
          bestPort.pricePerKWh,
        );

        const estimatedChargeTime = calculateChargingTime(
          energyNeeded,
          bestPort.powerKW,
        );

        return {
          stationId: scored.stationId,
          stationName: station.name,
          address: station.address,
          recommendedPort: bestPort.connectorType,
          powerKW: bestPort.powerKW,
          pricePerKWh: bestPort.pricePerKWh,
          freeSlots: scored.freeSlots,
          totalSlots: scored.totalSlots,
          estimatedWaitMinutes: scored.waitTimeMinutes,
          distanceKm: scored.distanceKm, // Real driving distance
          drivingDurationMinutes: Math.round(realDrivingDurationMinutes),
          estimatedCost,
          estimatedChargeTimeMinutes: estimatedChargeTime,
          score: scored.score,
          location: {
            longitude: station.location.coordinates[0]!,
            latitude: station.location.coordinates[1]!,
          },
          operatingHours: station.operatingHours,
          images: station.images,
        };
      });

    return {
      recommendations,
      routeInfo,
      searchArea: routeBuffer,
    };
  }
}

export default RecommendationService;
