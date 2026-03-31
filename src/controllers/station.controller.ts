import type { Request, Response, NextFunction } from "express";
import { StationService } from "../services/station.service.js";
import { StatusService } from "../services/status.service.js";
import { RouteService } from "../services/route.service.js";
import Station from "../models/Station.js";
import type {
  IStation,
  Port,
  ConnectorType,
  VehicleType,
  GeoLocation,
} from "../types/vehicle.js";
import { eventBus, createEvent } from "../events/index.js";
import type {
  StationCreatedEvent,
  StationUpdatedEvent,
  StationDeletedEvent,
  OccupancyFullEvent,
  OccupancyAvailableEvent,
} from "../events/types.js";
import {
  getCloudinaryConfig,
  deleteCloudinaryImage,
  deleteCloudinaryImages,
} from "../config/cloudinary.js";

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

      console.log(stationData);

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

      // Emit station created event
      eventBus.publish(
        createEvent<StationCreatedEvent>(
          "station.created",
          {
            stationId: station._id.toString(),
            operatorId: req.user.id,
            name: station.name,
            location: {
              longitude: station.location.coordinates[0],
              latitude: station.location.coordinates[1],
            },
            portCount: station.ports.length,
          },
          { userId: req.user.id },
        ),
      );

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

      // occupied is now embedded in each port
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

      // Emit station updated event
      eventBus.publish(
        createEvent<StationUpdatedEvent>(
          "station.updated",
          {
            stationId: id,
            changes: updateData,
          },
          { userId: req.user.id },
        ),
      );

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

      // Delete images from Cloudinary
      const imageUrls = existingStation.images || [];
      if (imageUrls.length > 0) {
        try {
          await deleteCloudinaryImages(imageUrls);
        } catch (cloudinaryError) {
          console.error(
            "Error deleting images from Cloudinary:",
            cloudinaryError,
          );
          // Continue with station deletion even if image deletion fails
        }
      }

      await StationService.deleteStation(id);

      // Emit station deleted event
      eventBus.publish(
        createEvent<StationDeletedEvent>(
          "station.deleted",
          {
            stationId: id,
            operatorId: existingStation.operatorId?.toString() || "",
          },
          { userId: req.user.id },
        ),
      );

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

      const updatedStation = await StatusService.updateOccupancy(
        id,
        connectorType,
        occupied,
      );

      if (!updatedStation) {
        res.status(404).json({
          status: "error",
          message: "Station not found or update failed",
        });
        return;
      }

      // Find the port to get total count
      const port = updatedStation.ports.find(
        (p: Port) => p.connectorType === connectorType,
      );
      const total = port?.total || 0;

      // WebSocket broadcast: notify all connected clients AND room subscribers
      const io = req.app.get("io");
      if (io) {
        const occupancyPayload = {
          stationId: id,
          connectorType,
          occupied,
          total,
          updatedAt: new Date().toISOString(),
        };
        
        // Broadcast to all clients (global)
        io.emit("station_occupancy_changed", occupancyPayload);
        
        // Also emit to the specific station room (for subscribed users)
        io.to(`station:${id}`).emit("occupancy-changed", {
          ...occupancyPayload,
          // Include all ports for complete state
          ports: updatedStation.ports.map((p: Port) => ({
            connectorType: p.connectorType,
            vehicleType: p.vehicleType,
            powerKW: p.powerKW,
            total: p.total,
            occupied: p.connectorType === connectorType ? occupied : p.occupied,
            pricePerKWh: p.pricePerKWh,
          })),
        });
      }

      // Emit occupancy event
      eventBus.publish(
        createEvent(
          "occupancy.updated",
          {
            stationId: id,
            connectorType,
            occupied,
            total,
          },
          { userId: req.user.id },
        ),
      );

      // Check if station is full or became available
      if (occupied >= total) {
        eventBus.publish(
          createEvent<OccupancyFullEvent>("occupancy.full", {
            stationId: id,
            connectorType,
          }),
        );
      } else if (occupied < total) {
        eventBus.publish(
          createEvent<OccupancyAvailableEvent>("occupancy.available", {
            stationId: id,
            connectorType,
            freeSlots: total - occupied,
          }),
        );
      }

      res.status(200).json({
        status: "success",
        data: {
          station: updatedStation,
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

      const updatedStation = await StatusService.bulkUpdateOccupancy(id, updates);

      if (!updatedStation) {
        res.status(404).json({
          status: "error",
          message: "Station not found or update failed",
        });
        return;
      }

      // WebSocket broadcast: notify all connected clients for each port update
      const io = req.app.get("io");
      if (io) {
        for (const update of updates) {
          const port = updatedStation.ports.find(
            (p: Port) => p.connectorType === update.connectorType,
          );
          if (port) {
            io.emit("station_occupancy_changed", {
              stationId: id,
              connectorType: update.connectorType,
              occupied: port.occupied,
              total: port.total,
              updatedAt: new Date().toISOString(),
            });
          }
        }
        
        // Also emit complete state to station room
        io.to(`station:${id}`).emit("occupancy-changed", {
          stationId: id,
          ports: updatedStation.ports,
          updatedAt: new Date().toISOString(),
        });
      }

      res.status(200).json({
        status: "success",
        data: {
          station: updatedStation,
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

  /**
   * Get Cloudinary configuration
   * GET /api/v1/stations/cloudinary-config
   * Returns config for frontend to upload directly
   */
  static async getCloudinaryConfig(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const config = getCloudinaryConfig();
      res.status(200).json({
        status: "success",
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add image URLs to station (after frontend uploaded to Cloudinary)
   * POST /api/v1/stations/:id/images
   * Body: { imageUrls: string[] }
   * Requires authentication and ownership
   */
  static async addImages(
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
      const { imageUrls } = req.body as { imageUrls: string[] };

      if (!id) {
        res.status(400).json({
          status: "error",
          message: "Station ID is required",
        });
        return;
      }

      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        res.status(400).json({
          status: "error",
          message: "Image URLs array is required",
        });
        return;
      }

      // Validate URLs
      const invalidUrls = imageUrls.filter(
        (url) => !url.startsWith("https://res.cloudinary.com/"),
      );
      if (invalidUrls.length > 0) {
        res.status(400).json({
          status: "error",
          message: "All image URLs must be valid Cloudinary URLs",
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

      // Check total image count
      const currentImageCount = existingStation.images?.length || 0;
      if (currentImageCount + imageUrls.length > 5) {
        res.status(400).json({
          status: "error",
          message: `Station can have maximum 5 images. Current: ${currentImageCount}, Trying to add: ${imageUrls.length}`,
        });
        return;
      }

      // Add images to station
      const updatedStation = await Station.findByIdAndUpdate(
        id,
        { $push: { images: { $each: imageUrls } } },
        { new: true },
      );

      res.status(200).json({
        status: "success",
        data: {
          station: updatedStation,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a specific image from station
   * DELETE /api/v1/stations/:id/images
   * Body: { imageUrl: string }
   * Requires authentication and ownership
   */
  static async deleteImage(
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
      const { imageUrl } = req.body as { imageUrl: string };

      if (!id) {
        res.status(400).json({
          status: "error",
          message: "Station ID is required",
        });
        return;
      }

      if (!imageUrl) {
        res.status(400).json({
          status: "error",
          message: "Image URL is required",
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

      // Check if image exists in station
      if (!existingStation.images?.includes(imageUrl)) {
        res.status(404).json({
          status: "error",
          message: "Image not found in station",
        });
        return;
      }

      // Delete from Cloudinary
      try {
        await deleteCloudinaryImage(imageUrl);
      } catch (cloudinaryError) {
        console.error("Error deleting from Cloudinary:", cloudinaryError);
        // Continue even if Cloudinary deletion fails
      }

      // Remove from station
      const updatedStation = await Station.findByIdAndUpdate(
        id,
        { $pull: { images: imageUrl } },
        { new: true },
      );

      res.status(200).json({
        status: "success",
        data: {
          station: updatedStation,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete all images from station
   * DELETE /api/v1/stations/:id/images/all
   * Requires authentication and ownership
   */
  static async deleteAllImages(
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

      const imageUrls = existingStation.images || [];

      if (imageUrls.length === 0) {
        res.status(400).json({
          status: "error",
          message: "Station has no images",
        });
        return;
      }

      // Delete from Cloudinary
      try {
        await deleteCloudinaryImages(imageUrls);
      } catch (cloudinaryError) {
        console.error("Error deleting from Cloudinary:", cloudinaryError);
        // Continue even if Cloudinary deletion fails
      }

      // Clear images array
      const updatedStation = await Station.findByIdAndUpdate(
        id,
        { $set: { images: [] } },
        { new: true },
      );

      res.status(200).json({
        status: "success",
        data: {
          station: updatedStation,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get route to a station from user's current location
   * GET /api/v1/stations/:id/route
   * Query params: longitude, latitude (user's current location)
   * Returns polyline, distance, duration for navigation
   */
  static async getRouteToStation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const { longitude, latitude } = req.query as {
        longitude: string;
        latitude: string;
      };

      if (!id) {
        res.status(400).json({
          status: "error",
          message: "Station ID is required",
        });
        return;
      }

      if (!longitude || !latitude) {
        res.status(400).json({
          status: "error",
          message: "User location (longitude, latitude) is required",
        });
        return;
      }

      const userLongitude = parseFloat(longitude);
      const userLatitude = parseFloat(latitude);

      if (isNaN(userLongitude) || isNaN(userLatitude)) {
        res.status(400).json({
          status: "error",
          message: "Invalid coordinates",
        });
        return;
      }

      // Get station
      const station = await Station.findById(id);
      if (!station) {
        res.status(404).json({
          status: "error",
          message: "Station not found",
        });
        return;
      }

      const userLocation: GeoLocation = {
        longitude: userLongitude,
        latitude: userLatitude,
      };

      const stationLocation: GeoLocation = {
        longitude: station.location.coordinates[0],
        latitude: station.location.coordinates[1],
      };

      // Get route from OpenRouteService
      const routeInfo = await RouteService.getRoute(userLocation, stationLocation);

      res.status(200).json({
        status: "success",
        data: {
          stationId: station._id,
          stationName: station.name,
          stationAddress: station.address,
          stationLocation: {
            longitude: stationLocation.longitude,
            latitude: stationLocation.latitude,
          },
          route: {
            polyline: routeInfo.polyline,
            totalDistanceKm: routeInfo.totalDistanceKm,
            totalDurationMinutes: routeInfo.totalDurationMinutes,
          },
          // Include current port occupancy for real-time tracking
          ports: station.ports,
          operatingHours: station.operatingHours,
          images: station.images,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default StationController;
