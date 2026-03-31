import type { Request, Response, NextFunction } from "express";
import { RecommendationService } from "../services/recommendation.service.js";
import type {
  RecommendationRequest,
  RouteRecommendationRequest,
  VehicleProfile,
  GeoLocation,
  ScoringWeights,
  ConnectorType,
} from "../types/vehicle.js";
import { isValidCoordinates } from "../utils/calculations.js";

/**
 * Recommendation Controller - Handles HTTP requests for charging recommendations
 */
export class RecommendationController {
  /**
   * Get smart charging station recommendations
   * POST /api/v1/recommendations
   *
   * Request body:
   * {
   *   vehicleProfile: {
   *     vehicleType: "bike" | "car",
   *     batteryCapacity_kWh: number,
   *     efficiency_kWh_per_km: number,
   *     batteryPercent: number,
   *     compatibleConnectors: string[]
   *   },
   *   currentLocation: {
   *     longitude: number,
   *     latitude: number
   *   },
   *   preferences?: {
   *     preferredConnector?: string,
   *     preferFastCharging?: boolean,
   *     weights?: ScoringWeights
   *   },
   *   limit?: number
   * }
   */
  static async getRecommendations(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { vehicleProfile, currentLocation, preferences, limit } =
        req.body as {
          vehicleProfile: VehicleProfile;
          currentLocation: GeoLocation;
          preferences?: {
            preferredConnector?: ConnectorType;
            preferFastCharging?: boolean;
            weights?: ScoringWeights;
          };
          limit?: number;
        };

      // Validate vehicle profile
      if (!vehicleProfile) {
        res.status(400).json({
          status: "error",
          message: "vehicleProfile is required",
        });
        return;
      }

      const profileErrors =
        RecommendationService.validateVehicleProfile(vehicleProfile);
      if (profileErrors.length > 0) {
        res.status(400).json({
          status: "error",
          message: "Invalid vehicle profile",
          errors: profileErrors,
        });
        return;
      }

      // Validate location
      if (!currentLocation) {
        res.status(400).json({
          status: "error",
          message: "currentLocation is required",
        });
        return;
      }

      if (
        !isValidCoordinates(currentLocation.longitude, currentLocation.latitude)
      ) {
        res.status(400).json({
          status: "error",
          message:
            "Invalid coordinates. Longitude must be -180 to 180, latitude must be -90 to 90",
        });
        return;
      }

      const request: RecommendationRequest = {
        vehicleProfile,
        currentLocation,
      };

      let recommendations;

      if (preferences?.preferredConnector || preferences?.preferFastCharging) {
        recommendations =
          await RecommendationService.getRecommendationsWithPreference(
            request,
            preferences.preferredConnector,
            preferences.preferFastCharging || false,
            preferences.weights,
            limit || 10,
          );
      } else {
        recommendations = await RecommendationService.getRecommendations(
          request,
          preferences?.weights,
          limit || 10,
        );
      }

      res.status(200).json({
        status: "success",
        results: recommendations.length,
        data: {
          recommendations,
          meta: {
            vehicleType: vehicleProfile.vehicleType,
            batteryPercent: vehicleProfile.batteryPercent,
            searchRadius: "calculated based on remaining range",
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get nearby stations (quick overview without full scoring)
   * GET /api/v1/recommendations/nearby
   *
   * Query params:
   * - longitude: number
   * - latitude: number
   * - radius: number (optional, default 10km)
   * - vehicleType: "bike" | "car" (optional)
   */
  static async getNearbyStations(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      console.log("hi");
      const { longitude, latitude, radius, vehicleType } = req.query;

      // Parse and validate coordinates
      const lng = parseFloat(longitude as string);
      const lat = parseFloat(latitude as string);

      if (isNaN(lng) || isNaN(lat)) {
        res.status(400).json({
          status: "error",
          message: "Valid longitude and latitude are required",
        });
        return;
      }

      if (!isValidCoordinates(lng, lat)) {
        res.status(400).json({
          status: "error",
          message:
            "Invalid coordinates. Longitude must be -180 to 180, latitude must be -90 to 90",
        });
        return;
      }

      const radiusKm = radius ? parseFloat(radius as string) : 10;

      if (isNaN(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
        res.status(400).json({
          status: "error",
          message: "Radius must be a positive number up to 100 km",
        });
        return;
      }

      const vType =
        vehicleType === "bike" || vehicleType === "car"
          ? vehicleType
          : undefined;

      const stations = await RecommendationService.getNearbyStations(
        lng,
        lat,
        radiusKm,
        vType,
      );

      res.status(200).json({
        status: "success",
        results: stations.length,
        data: {
          stations,
          meta: {
            searchRadius: radiusKm,
            vehicleType: vType || "all",
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Quick recommendation for emergency (low battery)
   * POST /api/v1/recommendations/emergency
   *
   * Prioritizes nearest station with available slots
   */
  static async getEmergencyRecommendation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { vehicleProfile, currentLocation } = req.body as {
        vehicleProfile: VehicleProfile;
        currentLocation: GeoLocation;
      };

      // Validate
      if (!vehicleProfile || !currentLocation) {
        res.status(400).json({
          status: "error",
          message: "vehicleProfile and currentLocation are required",
        });
        return;
      }

      const profileErrors =
        RecommendationService.validateVehicleProfile(vehicleProfile);
      if (profileErrors.length > 0) {
        res.status(400).json({
          status: "error",
          message: "Invalid vehicle profile",
          errors: profileErrors,
        });
        return;
      }

      // Emergency weights: prioritize distance and availability
      const emergencyWeights: ScoringWeights = {
        distance: 0.4,
        availability: 0.35,
        waitTime: 0.15,
        power: 0.05,
        cost: 0.05,
      };

      const recommendations = await RecommendationService.getRecommendations(
        { vehicleProfile, currentLocation },
        emergencyWeights,
        3, // Only top 3 nearest
      );

      if (recommendations.length === 0) {
        res.status(404).json({
          status: "error",
          message:
            "No charging stations found within reachable distance. Consider calling roadside assistance.",
        });
        return;
      }

      res.status(200).json({
        status: "success",
        data: {
          emergency: true,
          nearestStation: recommendations[0],
          alternatives: recommendations.slice(1),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get route-aware charging station recommendations
   * POST /api/v1/recommendations/route
   *
   * Request body:
   * {
   *   vehicleProfile: { ... },
   *   currentLocation: { longitude, latitude },
   *   destination: { longitude, latitude },
   *   routeOffsetKm: number (how far to deviate from route),
   *   preferences?: { ... },
   *   limit?: number
   * }
   */
  static async getRouteRecommendations(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const {
        vehicleProfile,
        currentLocation,
        destination,
        routeOffsetKm,
        preferences,
        limit,
      } = req.body as {
        vehicleProfile: VehicleProfile;
        currentLocation: GeoLocation;
        destination: GeoLocation;
        routeOffsetKm: number;
        preferences?: {
          weights?: ScoringWeights;
        };
        limit?: number;
      };

      // Validate vehicle profile
      if (!vehicleProfile) {
        res.status(400).json({
          status: "error",
          message: "vehicleProfile is required",
        });
        return;
      }

      const profileErrors =
        RecommendationService.validateVehicleProfile(vehicleProfile);
      if (profileErrors.length > 0) {
        res.status(400).json({
          status: "error",
          message: "Invalid vehicle profile",
          errors: profileErrors,
        });
        return;
      }

      // Validate current location
      if (!currentLocation) {
        res.status(400).json({
          status: "error",
          message: "currentLocation is required",
        });
        return;
      }

      if (
        !isValidCoordinates(currentLocation.longitude, currentLocation.latitude)
      ) {
        res.status(400).json({
          status: "error",
          message: "Invalid currentLocation coordinates",
        });
        return;
      }

      // Validate destination
      if (!destination) {
        res.status(400).json({
          status: "error",
          message: "destination is required",
        });
        return;
      }

      if (!isValidCoordinates(destination.longitude, destination.latitude)) {
        res.status(400).json({
          status: "error",
          message: "Invalid destination coordinates",
        });
        return;
      }

      // Validate route offset
      const offset = routeOffsetKm || 5; // Default 5km offset
      if (offset <= 0 || offset > 50) {
        res.status(400).json({
          status: "error",
          message: "routeOffsetKm must be between 0 and 50 km",
        });
        return;
      }

      const request: RouteRecommendationRequest = {
        vehicleProfile,
        currentLocation,
        destination,
        routeOffsetKm: offset,
      };

      const result = await RecommendationService.getRouteAwareRecommendations(
        request,
        preferences?.weights,
        limit || 10,
      );

      res.status(200).json({
        status: "success",
        results: result.recommendations.length,
        data: {
          recommendations: result.recommendations,
          routeInfo: {
            totalDistanceKm:
              Math.round(result.routeInfo.totalDistanceKm * 100) / 100,
            totalDurationMinutes: Math.round(
              result.routeInfo.totalDurationMinutes,
            ),
            routeOffsetKm: offset,
            stationsFound: result.recommendations.length,
            polyline: result.routeInfo.polyline, // For drawing route on map
          },
          searchArea: result.searchArea, // GeoJSON polygon for highlighting search area
          meta: {
            vehicleType: vehicleProfile.vehicleType,
            batteryPercent: vehicleProfile.batteryPercent,
            from: currentLocation,
            to: destination,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default RecommendationController;
