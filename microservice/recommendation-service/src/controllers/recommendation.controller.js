/**
 * ============================================================================
 * RECOMMENDATION CONTROLLER
 * ============================================================================
 */

const {
  getRecommendations,
  fetchUserVehicle,
} = require("../services/recommendation.service");

/**
 * Get charging recommendations
 * POST /api/v1/recommendations
 *
 * Body: {
 *   vehicleProfile: {
 *     vehicleType: 'car' | 'bike',
 *     batteryCapacity_kWh: number,
 *     efficiency_kWh_per_km: number,
 *     batteryPercent: number,
 *     compatibleConnectors: string[]
 *   },
 *   currentLocation: {
 *     longitude: number,
 *     latitude: number
 *   },
 *   weights?: object,
 *   limit?: number
 * }
 */
const recommend = async (req, res, next) => {
  try {
    const { vehicleProfile, currentLocation, weights, limit = 10 } = req.body;

    // Validate required fields
    if (!vehicleProfile) {
      return res.status(400).json({
        status: "fail",
        message: "Vehicle profile is required",
      });
    }

    if (
      !currentLocation ||
      !currentLocation.longitude ||
      !currentLocation.latitude
    ) {
      return res.status(400).json({
        status: "fail",
        message: "Current location (longitude, latitude) is required",
      });
    }

    // Validate vehicle profile
    const requiredFields = [
      "vehicleType",
      "batteryCapacity_kWh",
      "efficiency_kWh_per_km",
      "batteryPercent",
      "compatibleConnectors",
    ];
    for (const field of requiredFields) {
      if (vehicleProfile[field] === undefined) {
        return res.status(400).json({
          status: "fail",
          message: `Vehicle profile missing required field: ${field}`,
        });
      }
    }

    // Get recommendations
    const result = await getRecommendations(
      vehicleProfile,
      currentLocation,
      weights,
      limit,
    );

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Quick recommendation using user's stored vehicle profile
 * POST /api/v1/recommendations/quick
 *
 * Requires authentication
 *
 * Body: {
 *   currentLocation: {
 *     longitude: number,
 *     latitude: number
 *   },
 *   vehicleId?: string (uses default if not provided)
 * }
 */
const quickRecommend = async (req, res, next) => {
  try {
    const userId = req.headers["x-user-id"];
    const authToken = req.headers["authorization"];

    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required for quick recommendations",
      });
    }

    const { currentLocation, vehicleId, weights, limit = 10 } = req.body;

    if (
      !currentLocation ||
      !currentLocation.longitude ||
      !currentLocation.latitude
    ) {
      return res.status(400).json({
        status: "fail",
        message: "Current location (longitude, latitude) is required",
      });
    }

    // Fetch vehicle profile from User Service
    let vehicleProfile;
    try {
      vehicleProfile = await fetchUserVehicle(userId, vehicleId, authToken);
    } catch (error) {
      return res.status(404).json({
        status: "fail",
        message: "No vehicle profile found. Please add a vehicle first.",
      });
    }

    if (!vehicleProfile) {
      return res.status(404).json({
        status: "fail",
        message: "No vehicle profile found. Please add a vehicle first.",
      });
    }

    // Get recommendations
    const result = await getRecommendations(
      vehicleProfile,
      currentLocation,
      weights,
      limit,
    );

    res.status(200).json({
      status: "success",
      data: {
        ...result,
        usedVehicle: {
          id: vehicleProfile._id,
          nickname: vehicleProfile.nickname,
          vehicleType: vehicleProfile.vehicleType,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recommend,
  quickRecommend,
};
