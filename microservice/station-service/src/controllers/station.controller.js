/**
 * ============================================================================
 * STATION CONTROLLER - Handles station operations
 * ============================================================================
 */

const Station = require("../models/Station");
const { eventBus, EVENT_TYPES } = require("../../../shared/event-bus");
const { STATION_STATUS, USER_ROLES } = require("../../../shared/constants");

/**
 * Get all stations
 * GET /api/v1/stations
 */
const getAllStations = async (req, res, next) => {
  try {
    const { status, vehicleType, connector, page = 1, limit = 20 } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (vehicleType) {
      query["ports.vehicleType"] = vehicleType;
    }

    if (connector) {
      query["ports.connectorType"] = connector;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [stations, total] = await Promise.all([
      Station.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Station.countDocuments(query),
    ]);

    res.status(200).json({
      status: "success",
      results: stations.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: { stations },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single station
 * GET /api/v1/stations/:id
 */
const getStation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const station = await Station.findById(id);

    if (!station) {
      return res.status(404).json({
        status: "fail",
        message: "Station not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: { station },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get station statistics
 * GET /api/v1/stations/stats
 */
const getStats = async (req, res, next) => {
  try {
    const stats = await Station.aggregate([
      {
        $facet: {
          // Total counts
          totals: [
            {
              $group: {
                _id: null,
                totalStations: { $sum: 1 },
                activeStations: {
                  $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
                },
              },
            },
          ],
          // By vehicle type
          byVehicleType: [
            { $unwind: "$ports" },
            {
              $group: {
                _id: "$ports.vehicleType",
                count: { $sum: 1 },
                totalPorts: { $sum: "$ports.total" },
              },
            },
          ],
          // By connector type
          byConnectorType: [
            { $unwind: "$ports" },
            {
              $group: {
                _id: "$ports.connectorType",
                count: { $sum: 1 },
                totalPorts: { $sum: "$ports.total" },
              },
            },
          ],
        },
      },
    ]);

    const result = stats[0];

    res.status(200).json({
      status: "success",
      data: {
        totals: result.totals[0] || { totalStations: 0, activeStations: 0 },
        byVehicleType: result.byVehicleType,
        byConnectorType: result.byConnectorType,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get operator's own stations
 * GET /api/v1/stations/my-stations
 */
const getMyStations = async (req, res, next) => {
  try {
    const operatorId = req.headers["x-user-id"];

    if (!operatorId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const stations = await Station.find({ operatorId }).sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      results: stations.length,
      data: { stations },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a station
 * POST /api/v1/stations
 */
const createStation = async (req, res, next) => {
  try {
    const operatorId = req.headers["x-user-id"];

    if (!operatorId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { name, location, address, ports, operatingHours, status } = req.body;

    // Validate required fields
    if (!name || !location || !ports) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields: name, location, ports",
      });
    }

    // Create station
    const station = await Station.create({
      name,
      operatorId,
      location,
      address,
      ports,
      operatingHours,
      status,
    });

    // Publish event
    eventBus.publish(EVENT_TYPES.STATION_CREATED, {
      stationId: station._id.toString(),
      operatorId,
      name: station.name,
      location: {
        longitude: station.location.coordinates[0],
        latitude: station.location.coordinates[1],
      },
      portCount: station.ports.length,
    });

    res.status(201).json({
      status: "success",
      data: { station },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a station
 * PATCH /api/v1/stations/:id
 */
const updateStation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const operatorId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];

    // Find station
    const station = await Station.findById(id);

    if (!station) {
      return res.status(404).json({
        status: "fail",
        message: "Station not found",
      });
    }

    // Check ownership (owner or admin can update)
    if (station.operatorId !== operatorId && userRole !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        status: "fail",
        message: "You can only update your own stations",
      });
    }

    // Allowed updates
    const allowedUpdates = ["name", "address", "operatingHours", "status"];
    const updates = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Apply updates
    Object.assign(station, updates);
    await station.save();

    // Publish event
    eventBus.publish(EVENT_TYPES.STATION_UPDATED, {
      stationId: station._id.toString(),
      operatorId,
      updates: Object.keys(updates),
    });

    res.status(200).json({
      status: "success",
      data: { station },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a station
 * DELETE /api/v1/stations/:id
 */
const deleteStation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const operatorId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];

    // Find station
    const station = await Station.findById(id);

    if (!station) {
      return res.status(404).json({
        status: "fail",
        message: "Station not found",
      });
    }

    // Check ownership
    if (station.operatorId !== operatorId && userRole !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        status: "fail",
        message: "You can only delete your own stations",
      });
    }

    await Station.findByIdAndDelete(id);

    // Publish event
    eventBus.publish(EVENT_TYPES.STATION_DELETED, {
      stationId: id,
      operatorId,
    });

    res.status(200).json({
      status: "success",
      message: "Station deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a port to a station
 * POST /api/v1/stations/:id/ports
 */
const addPort = async (req, res, next) => {
  try {
    const { id } = req.params;
    const operatorId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];

    // Find station
    const station = await Station.findById(id);

    if (!station) {
      return res.status(404).json({
        status: "fail",
        message: "Station not found",
      });
    }

    // Check ownership
    if (station.operatorId !== operatorId && userRole !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        status: "fail",
        message: "You can only modify your own stations",
      });
    }

    const { connectorType, vehicleType, powerKW, total, pricePerKWh } =
      req.body;

    // Validate
    if (!connectorType || !vehicleType || !powerKW || !total || !pricePerKWh) {
      return res.status(400).json({
        status: "fail",
        message:
          "Missing required fields: connectorType, vehicleType, powerKW, total, pricePerKWh",
      });
    }

    // Add port
    station.ports.push({
      connectorType,
      vehicleType,
      powerKW,
      total,
      occupied: 0,
      pricePerKWh,
    });

    await station.save();

    res.status(201).json({
      status: "success",
      data: { station },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update port occupancy
 * PATCH /api/v1/stations/:id/occupancy
 */
const updateOccupancy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const operatorId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];

    // Find station
    const station = await Station.findById(id);

    if (!station) {
      return res.status(404).json({
        status: "fail",
        message: "Station not found",
      });
    }

    // Check ownership
    if (station.operatorId !== operatorId && userRole !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        status: "fail",
        message: "You can only modify your own stations",
      });
    }

    const { connectorType, vehicleType, occupied } = req.body;

    try {
      station.updateOccupancy(connectorType, vehicleType, occupied);
      await station.save();
    } catch (err) {
      return res.status(400).json({
        status: "fail",
        message: err.message,
      });
    }

    // Publish event
    eventBus.publish(EVENT_TYPES.OCCUPANCY_CHANGED, {
      stationId: id,
      connectorType,
      vehicleType,
      occupied,
    });

    res.status(200).json({
      status: "success",
      data: { station },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update occupancy
 * PUT /api/v1/stations/:id/occupancy
 */
const bulkUpdateOccupancy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const operatorId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];

    // Find station
    const station = await Station.findById(id);

    if (!station) {
      return res.status(404).json({
        status: "fail",
        message: "Station not found",
      });
    }

    // Check ownership
    if (station.operatorId !== operatorId && userRole !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        status: "fail",
        message: "You can only modify your own stations",
      });
    }

    const { updates } = req.body; // Array of { connectorType, vehicleType, occupied }

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        status: "fail",
        message: "Updates must be an array",
      });
    }

    for (const update of updates) {
      try {
        station.updateOccupancy(
          update.connectorType,
          update.vehicleType,
          update.occupied,
        );
      } catch (err) {
        return res.status(400).json({
          status: "fail",
          message: `Error updating ${update.connectorType}: ${err.message}`,
        });
      }
    }

    await station.save();

    res.status(200).json({
      status: "success",
      data: { station },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find stations nearby
 * POST /api/v1/stations/nearby
 */
const findNearby = async (req, res, next) => {
  try {
    const {
      longitude,
      latitude,
      maxDistanceKm = 10,
      vehicleType,
      connectors,
    } = req.body;

    if (longitude === undefined || latitude === undefined) {
      return res.status(400).json({
        status: "fail",
        message: "Longitude and latitude are required",
      });
    }

    const stations = await Station.findWithDistance(
      parseFloat(longitude),
      parseFloat(latitude),
      parseFloat(maxDistanceKm),
      { vehicleType, connectors },
    );

    res.status(200).json({
      status: "success",
      results: stations.length,
      data: { stations },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllStations,
  getStation,
  getStats,
  getMyStations,
  createStation,
  updateStation,
  deleteStation,
  addPort,
  updateOccupancy,
  bulkUpdateOccupancy,
  findNearby,
};
