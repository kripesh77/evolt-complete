import type { Request, Response, NextFunction } from "express";
import { StationService } from "../services/station.service.js";
import { StatusService } from "../services/status.service.js";
import Station from "../models/Station.js";
import type {
  IStation,
  Port,
  ConnectorType,
  VehicleType,
} from "../types/vehicle.js";

/**
 * Helper function to check station ownership
 */
async function checkOwnership(
  stationId: string,
  operatorId: string,
): Promise<{ station: typeof Station.prototype | null; isOwner: boolean }> {
  const station = await Station.findById(stationId);
  if (!station) {
    return { station: null, isOwner: false };
  }
  const isOwner = station.operatorId?.toString() === operatorId;
  return { station, isOwner };
}

/**
 * Station Controller - Handles HTTP requests for station operations
 */
export class StationController {
  /**
   * Create a new station
   * POST /api/v1/stations
   * Requires authentication - station will be assigned to the authenticated operator
   */
  static async createStation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // User must be authenticated (operator or admin)
      if (!req.user) {
        res.status(401).json({
          status: "error",
          message: "Authentication required to create a station",
        });
        return;
      }

      const stationData = req.body as Omit<
        IStation,
        "_id" | "createdAt" | "updatedAt"
      >;

      // Validate required fields
      if (!stationData.name || !stationData.location || !stationData.ports) {
        res.status(400).json({
          status: "error",
          message:
            "Missing required fields: name, location, and ports are required",
        });
        return;
      }

      // Assign station to authenticated operator
      const stationWithOperator = {
        ...stationData,
        operatorId: req.user.id,
      };

      const station = await StationService.createStation(stationWithOperator);

      res.status(201).json({
        status: "success",
        data: {
          station,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get operator's own stations
   * GET /api/v1/stations/my-stations
   * Requires authentication
   */
  static async getMyStations(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
        return;
      }

      const stations = await Station.find({ operatorId: req.user.id }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        status: "success",
        results: stations.length,
        data: {
          stations,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all stations
   * GET /api/v1/stations
   */
  static async getAllStations(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { status, vehicleType } = req.query;

      const filters: {
        status?: "active" | "inactive";
        vehicleType?: VehicleType;
      } = {};

      if (status === "active" || status === "inactive") {
        filters.status = status;
      }

      if (vehicleType === "bike" || vehicleType === "car") {
        filters.vehicleType = vehicleType;
      }

      const stations = await StationService.getAllStations(filters);

      res.status(200).json({
        status: "success",
        results: stations.length,
        data: {
          stations,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single station by ID
   * GET /api/v1/stations/:id
   */
  static async getStation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = req.params.id as string;

      if (!id) {
        res.status(400).json({
          status: "error",
          message: "Station ID is required",
        });
        return;
      }

      const station = await StationService.getStationById(id);

      if (!station) {
        res.status(404).json({
          status: "error",
          message: "Station not found",
        });
        return;
      }

      // Get current status
      const status = await StatusService.getStationStatus(id);

      res.status(200).json({
        status: "success",
        data: {
          station,
          occupancy: status?.portStatus || [],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a station
   * PATCH /api/v1/stations/:id
   * Requires authentication and ownership
   */
  static async updateStation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Check authentication
      if (!req.user) {
        res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
        return;
      }

      const id = req.params.id as string;
      const updateData = req.body as Partial<IStation>;

      if (!id) {
        res.status(400).json({
          status: "error",
          message: "Station ID is required",
        });
        return;
      }

      // Check ownership (admins can update any station)
      const { station: existingStation, isOwner } = await checkOwnership(
        id,
        req.user.id,
      );

      if (!existingStation) {
        res.status(404).json({
          status: "error",
          message: "Station not found",
        });
        return;
      }

      if (!isOwner && req.user.role !== "admin") {
        res.status(403).json({
          status: "error",
          message: "You do not have permission to update this station",
        });
        return;
      }

      // Prevent changing operatorId
      delete updateData.operatorId;

      const station = await StationService.updateStation(id, updateData);

      res.status(200).json({
        status: "success",
        data: {
          station,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a station
   * DELETE /api/v1/stations/:id
   * Requires authentication and ownership
   */
  static async deleteStation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Check authentication
      if (!req.user) {
        res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
        return;
      }

      const id = req.params.id as string;

      if (!id) {
        res.status(400).json({
          status: "error",
          message: "Station ID is required",
        });
        return;
      }

      // Check ownership (admins can delete any station)
      const { station: existingStation, isOwner } = await checkOwnership(
        id,
        req.user.id,
      );

      if (!existingStation) {
        res.status(404).json({
          status: "error",
          message: "Station not found",
        });
        return;
      }

      if (!isOwner && req.user.role !== "admin") {
        res.status(403).json({
          status: "error",
          message: "You do not have permission to delete this station",
        });
        return;
      }

      await StationService.deleteStation(id);

      res.status(204).json({
        status: "success",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a port to a station
   * POST /api/v1/stations/:id/ports
   * Requires authentication and ownership
   */
  static async addPort(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Check authentication
      if (!req.user) {
        res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
        return;
      }

      const id = req.params.id as string;
      const port = req.body as Port;

      if (!id) {
        res.status(400).json({
          status: "error",
          message: "Station ID is required",
        });
        return;
      }

      // Check ownership
      const { station: existingStation, isOwner } = await checkOwnership(
        id,
        req.user.id,
      );

      if (!existingStation) {
        res.status(404).json({
          status: "error",
          message: "Station not found",
        });
        return;
      }

      if (!isOwner && req.user.role !== "admin") {
        res.status(403).json({
          status: "error",
          message: "You do not have permission to modify this station",
        });
        return;
      }

      if (
        !port.connectorType ||
        !port.vehicleType ||
        !port.powerKW ||
        !port.total ||
        port.pricePerKWh === undefined
      ) {
        res.status(400).json({
          status: "error",
          message:
            "Missing required port fields: connectorType, vehicleType, powerKW, total, pricePerKWh",
        });
        return;
      }

      const station = await StationService.addPort(id, port);

      res.status(200).json({
        status: "success",
        data: {
          station,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update occupancy for a station
   * PATCH /api/v1/stations/:id/occupancy
   * Requires authentication and ownership
   */
  static async updateOccupancy(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Check authentication
      if (!req.user) {
        res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
        return;
      }

      const id = req.params.id as string;
      const { connectorType, occupied } = req.body as {
        connectorType: ConnectorType;
        occupied: number;
      };

      if (!id) {
        res.status(400).json({
          status: "error",
          message: "Station ID is required",
        });
        return;
      }

      // Check ownership
      const { station: existingStation, isOwner } = await checkOwnership(
        id,
        req.user.id,
      );

      if (!existingStation) {
        res.status(404).json({
          status: "error",
          message: "Station not found",
        });
        return;
      }

      if (!isOwner && req.user.role !== "admin") {
        res.status(403).json({
          status: "error",
          message:
            "You do not have permission to update this station's occupancy",
        });
        return;
      }

      if (!connectorType || occupied === undefined) {
        res.status(400).json({
          status: "error",
          message: "connectorType and occupied are required",
        });
        return;
      }

      const status = await StatusService.updateOccupancy(
        id,
        connectorType,
        occupied,
      );

      res.status(200).json({
        status: "success",
        data: {
          status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update occupancy for a station
   * PUT /api/v1/stations/:id/occupancy
   * Requires authentication and ownership
   */
  static async bulkUpdateOccupancy(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Check authentication
      if (!req.user) {
        res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
        return;
      }

      const id = req.params.id as string;
      const updates = req.body as Array<{
        connectorType: ConnectorType;
        occupied: number;
      }>;

      if (!id) {
        res.status(400).json({
          status: "error",
          message: "Station ID is required",
        });
        return;
      }

      // Check ownership
      const { station: existingStation, isOwner } = await checkOwnership(
        id,
        req.user.id,
      );

      if (!existingStation) {
        res.status(404).json({
          status: "error",
          message: "Station not found",
        });
        return;
      }

      if (!isOwner && req.user.role !== "admin") {
        res.status(403).json({
          status: "error",
          message:
            "You do not have permission to update this station's occupancy",
        });
        return;
      }

      if (!Array.isArray(updates) || updates.length === 0) {
        res.status(400).json({
          status: "error",
          message: "Updates array is required",
        });
        return;
      }

      const status = await StatusService.bulkUpdateOccupancy(id, updates);

      res.status(200).json({
        status: "success",
        data: {
          status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get station statistics
   * GET /api/v1/stations/stats
   */
  static async getStats(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const stats = await StationService.getStationStats();

      res.status(200).json({
        status: "success",
        data: {
          stats,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default StationController;
