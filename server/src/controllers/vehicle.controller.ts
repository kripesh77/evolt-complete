import type { Request, Response, NextFunction } from "express";
import {
  VehicleService,
  VehicleServiceError,
  type CreateVehicleInput,
} from "../services/vehicle.service.js";
import type { VehicleRequestStatus } from "../models/VehicleRequest.js";
import type { VehicleType, ConnectorType } from "../types/vehicle.js";

/**
 * Vehicle Controller - Handles HTTP requests for the vehicle catalog,
 * user requests for missing vehicles, and admin moderation of those requests
 */
export class VehicleController {
  /**
   * Search the vehicle catalog
   * GET /api/v1/vehicles
   *
   * Query params:
   * - q: string (optional, search term across make/model/variant)
   * - vehicleType: "bike" | "car" (optional)
   * - limit: number (optional, default 20, max 50)
   *
   * Public — no authentication required.
   */
  static async searchVehicles(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { q, vehicleType, limit } = req.query;

      const vType =
        vehicleType === "bike" || vehicleType === "car"
          ? (vehicleType as VehicleType)
          : undefined;

      const parsedLimit = limit ? parseInt(limit as string, 10) : 20;

      const vehicles = await VehicleService.searchVehicles(
        (q as string) || "",
        vType,
        isNaN(parsedLimit) ? 20 : parsedLimit,
      );

      res.status(200).json({
        status: "success",
        results: vehicles.length,
        data: { vehicles },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single catalog vehicle by ID
   * GET /api/v1/vehicles/:id
   *
   * Public — no authentication required.
   */
  static async getVehicle(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || Array.isArray(id)) {
        res.status(400).json({
          status: "error",
          message: "Vehicle ID is required",
        });
        return;
      }

      const vehicle = await VehicleService.getVehicleById(id);

      res.status(200).json({
        status: "success",
        data: { vehicle },
      });
    } catch (error) {
      if (error instanceof VehicleServiceError) {
        res.status(error.status).json({
          status: "error",
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Create a catalog vehicle directly
   * POST /api/v1/vehicles
   *
   * Admin-only. Bypasses the request/review flow entirely.
   */
  static async createVehicle(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const {
        make,
        modelName,
        variant,
        vehicleType,
        batteryCapacity_kWh,
        compatibleConnectors,
      } = req.body as CreateVehicleInput;

      if (
        !make ||
        !modelName ||
        !vehicleType ||
        batteryCapacity_kWh === undefined ||
        !compatibleConnectors ||
        compatibleConnectors.length === 0
      ) {
        res.status(400).json({
          status: "error",
          message:
            "make, modelName, vehicleType, batteryCapacity_kWh, efficiency_kWh_per_km, " +
            "and compatibleConnectors are required",
        });
        return;
      }

      const vehicle = await VehicleService.createVehicle({
        make,
        modelName,
        variant,
        vehicleType,
        batteryCapacity_kWh,
        compatibleConnectors,
        addedBy: req.user?.id,
      });

      res.status(201).json({
        status: "success",
        data: { vehicle },
      });
    } catch (error) {
      if (error instanceof VehicleServiceError) {
        res.status(error.status).json({
          status: "error",
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Submit a request for a vehicle missing from the catalog
   * POST /api/v1/vehicles/requests
   *
   * Authenticated users only. Rejected if an identical request is already
   * pending, the vehicle already exists in the catalog, or the user has
   * reached the pending-request cap.
   */
  static async submitVehicleRequest(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: "error",
          message: "Authentication required to request a vehicle",
        });
        return;
      }

      if (!req.body) {
        res.status(400).json({
          status: "error",
          message:
            "Please provide make, modelName, variant, vehicleType, batteryCapacity_kWh, compatibleConnectors,notes",
        });
      }

      const {
        make,
        modelName,
        variant,
        vehicleType,
        batteryCapacity_kWh,
        compatibleConnectors,
        notes,
      } = req.body as {
        make: string;
        modelName: string;
        variant?: string;
        vehicleType: VehicleType;
        batteryCapacity_kWh?: number;
        compatibleConnectors?: ConnectorType[];
        notes?: string;
      };

      if (!make || !modelName || !vehicleType) {
        res.status(400).json({
          status: "error",
          message: "make, modelName, and vehicleType are required",
        });
        return;
      }

      if (vehicleType !== "bike" && vehicleType !== "car") {
        res.status(400).json({
          status: "error",
          message: "vehicleType must be bike or car",
        });
        return;
      }

      const request = await VehicleService.submitVehicleRequest({
        requestedBy: req.user.id,
        make,
        modelName,
        variant,
        vehicleType,
        batteryCapacity_kWh,
        compatibleConnectors,
        notes,
      });

      res.status(201).json({
        status: "success",
        message: "Vehicle request submitted. An admin will review it shortly.",
        data: { request },
      });
    } catch (error) {
      if (error instanceof VehicleServiceError) {
        res.status(error.status).json({
          status: "error",
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * List vehicle requests for moderation
   * GET /api/v1/vehicles/requests
   *
   * Query params:
   * - status: "pending" | "approved" | "rejected" (optional, default all)
   * - limit: number (optional, default 50, max 100)
   *
   * Admin-only.
   */
  static async listVehicleRequests(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { status, limit } = req.query;

      const validStatuses = ["pending", "approved", "rejected"];
      const statusFilter =
        typeof status === "string" && validStatuses.includes(status)
          ? (status as VehicleRequestStatus)
          : undefined;

      const parsedLimit = limit ? parseInt(limit as string, 10) : 50;

      const requests = await VehicleService.listVehicleRequests(
        statusFilter,
        isNaN(parsedLimit) ? 50 : parsedLimit,
      );

      res.status(200).json({
        status: "success",
        results: requests.length,
        data: { requests },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve a vehicle request, creating the catalog entry
   * PATCH /api/v1/vehicles/requests/:id/approve
   *
   * Request body (optional): vehicleData to override/supply specs the user
   * didn't provide, plus an optional reviewNotes string.
   *
   * Admin-only.
   */
  static async approveVehicleRequest(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { vehicleData, reviewNotes } = req.body as {
        vehicleData?: Omit<CreateVehicleInput, "addedBy">;
        reviewNotes?: string;
      };

      if (!id || Array.isArray(id)) {
        res.status(400).json({
          status: "error",
          message: "Request ID is required",
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
        return;
      }

      const result = await VehicleService.approveVehicleRequest(id, {
        reviewedBy: req.user.id,
        reviewNotes,
        vehicleData,
      });

      res.status(200).json({
        status: "success",
        message: "Vehicle request approved and added to catalog",
        data: result,
      });
    } catch (error) {
      if (error instanceof VehicleServiceError) {
        res.status(error.status).json({
          status: "error",
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  static async getMyVehiclesRequest(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: "error",
          message: "Authentication required to request a vehicle",
        });
        return;
      }

      const requestedVehicles = await VehicleService.getMyVehiclesRequest(
        req.user.id,
      );
      res.status(200).json({ status: "success", requestedVehicles });
    } catch (e) {
      if (e instanceof VehicleServiceError) {
        res
          .status(e.status)
          .json({ status: "error", message: "Error getting your requests" });
        return;
      }
      next(e);
    }
  }

  /**
   * Reject a vehicle request
   * PATCH /api/v1/vehicles/requests/:id/reject
   *
   * Request body (optional): reviewNotes explaining the rejection.
   *
   * Admin-only.
   */
  static async rejectVehicleRequest(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body as { reviewNotes?: string };

      if (!id || Array.isArray(id)) {
        res.status(400).json({
          status: "error",
          message: "Request ID is required",
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
        return;
      }

      const request = await VehicleService.rejectVehicleRequest(id, {
        reviewedBy: req.user.id,
        reviewNotes,
      });

      res.status(200).json({
        status: "success",
        message: "Vehicle request rejected",
        data: { request },
      });
    } catch (error) {
      if (error instanceof VehicleServiceError) {
        res.status(error.status).json({
          status: "error",
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }
}

export default VehicleController;
