/**
 * ============================================================================
 * RECOMMENDATION SERVICE - Business Logic
 * ============================================================================
 *
 * LEARNING POINT: Service Orchestration
 *
 * This service orchestrates calls to other services:
 * 1. Calls Station Service to get nearby stations
 * 2. Optionally calls User Service to get vehicle profile
 * 3. Applies scoring algorithm
 * 4. Returns ranked recommendations
 *
 * This is the "Service Composition" pattern - combining data
 * from multiple services to provide a higher-level feature.
 *
 * ============================================================================
 */

const axios = require("axios");
const {
  SERVICE_URLS,
  DEFAULT_SCORING_WEIGHTS,
} = require("../../../shared/constants");

const {
  calculateReachableDistance,
  calculateEnergyNeeded,
  calculateChargingTime,
  calculateChargingCost,
  calculateWaitTime,
  getAverageChargeTime,
} = require("../utils/calculations");

const { scoreStations, mergeWeights } = require("../utils/scoring");

/**
 * Get smart charging recommendations
 *
 * @param {object} vehicleProfile - Vehicle information
 * @param {object} currentLocation - { longitude, latitude }
 * @param {object} weights - Optional scoring weights
 * @param {number} limit - Max results to return
 * @returns {Array} - Ranked station recommendations
 */
async function getRecommendations(
  vehicleProfile,
  currentLocation,
  weights = {},
  limit = 10,
) {
  // Step 1: Calculate reachable distance
  const reachableKm = calculateReachableDistance(vehicleProfile);

  console.log(`📏 [Recommendation] Reachable distance: ${reachableKm} km`);

  if (reachableKm <= 0) {
    return {
      recommendations: [],
      message: "Battery too low to reach any station safely",
      reachableKm: 0,
    };
  }

  // Step 2: Get nearby stations from Station Service
  const nearbyStations = await fetchNearbyStations(
    currentLocation.longitude,
    currentLocation.latitude,
    reachableKm,
    vehicleProfile.vehicleType,
    vehicleProfile.compatibleConnectors,
  );

  console.log(
    `📍 [Recommendation] Found ${nearbyStations.length} stations in range`,
  );

  if (nearbyStations.length === 0) {
    return {
      recommendations: [],
      message: "No compatible stations found within reachable distance",
      reachableKm,
    };
  }

  // Step 3: Process each station
  const stationData = nearbyStations
    .map((station) => {
      // Find the best compatible port
      const bestPort = getBestPort(
        station.ports,
        vehicleProfile.vehicleType,
        vehicleProfile.compatibleConnectors,
      );

      if (!bestPort) return null;

      // Calculate availability
      const freeSlots = station.ports
        .filter(
          (p) =>
            p.vehicleType === vehicleProfile.vehicleType &&
            vehicleProfile.compatibleConnectors.includes(p.connectorType),
        )
        .reduce((sum, p) => sum + (p.total - p.occupied), 0);

      const totalSlots = station.ports
        .filter(
          (p) =>
            p.vehicleType === vehicleProfile.vehicleType &&
            vehicleProfile.compatibleConnectors.includes(p.connectorType),
        )
        .reduce((sum, p) => sum + p.total, 0);

      // Calculate wait time
      const avgChargeTime = getAverageChargeTime(
        vehicleProfile.vehicleType,
        bestPort.powerKW,
      );
      const waitTime = calculateWaitTime(
        totalSlots - freeSlots,
        totalSlots,
        avgChargeTime,
      );

      return {
        stationId: station._id,
        stationName: station.name,
        address: station.address,
        distanceKm: station.distanceKm,
        freeSlots,
        totalSlots,
        waitTimeMinutes: waitTime,
        powerKW: bestPort.powerKW,
        pricePerKWh: bestPort.pricePerKWh,
        recommendedPort: bestPort.connectorType,
        location: {
          longitude: station.location.coordinates[0],
          latitude: station.location.coordinates[1],
        },
      };
    })
    .filter((s) => s !== null);

  // Step 4: Score and rank stations
  const finalWeights = mergeWeights(weights);
  const rankedStations = scoreStations(
    stationData,
    vehicleProfile.vehicleType,
    finalWeights,
  );

  // Step 5: Add cost and time estimates to top results
  const recommendations = rankedStations.slice(0, limit).map((station) => {
    const energyNeeded = calculateEnergyNeeded(
      vehicleProfile.batteryCapacity_kWh,
      vehicleProfile.batteryPercent,
    );

    return {
      ...station,
      estimatedCost: calculateChargingCost(energyNeeded, station.pricePerKWh),
      estimatedChargeTimeMinutes: calculateChargingTime(
        energyNeeded,
        station.powerKW,
      ),
    };
  });

  return {
    recommendations,
    reachableKm,
    totalFound: nearbyStations.length,
    vehicleInfo: {
      type: vehicleProfile.vehicleType,
      batteryPercent: vehicleProfile.batteryPercent,
      compatibleConnectors: vehicleProfile.compatibleConnectors,
    },
  };
}

/**
 * Fetch nearby stations from Station Service
 *
 * LEARNING POINT: Inter-Service HTTP Call
 *
 * This is a synchronous call to another service.
 * We need to handle:
 * - Service being down
 * - Timeouts
 * - Error responses
 */
async function fetchNearbyStations(
  longitude,
  latitude,
  maxDistanceKm,
  vehicleType,
  connectors,
) {
  try {
    const response = await axios.post(
      `${SERVICE_URLS.STATION_SERVICE}/api/v1/stations/nearby`,
      {
        longitude,
        latitude,
        maxDistanceKm,
        vehicleType,
        connectors,
      },
      {
        timeout: 10000, // 10 second timeout
      },
    );

    return response.data.data.stations || [];
  } catch (error) {
    console.error(
      "❌ [Recommendation] Failed to fetch stations:",
      error.message,
    );

    if (error.code === "ECONNREFUSED") {
      throw new Error("Station service is unavailable");
    }

    throw error;
  }
}

/**
 * Fetch user's vehicle profile from User Service
 */
async function fetchUserVehicle(userId, vehicleId, authToken) {
  try {
    const response = await axios.get(
      `${SERVICE_URLS.USER_SERVICE}/api/v1/users/${userId}/vehicles`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-User-ID": userId,
        },
        timeout: 5000,
      },
    );

    const vehicles = response.data.data.vehicles || [];

    if (vehicleId) {
      return vehicles.find((v) => v._id === vehicleId);
    }

    // Return default vehicle
    return vehicles.find((v) => v.isDefault) || vehicles[0];
  } catch (error) {
    console.error(
      "❌ [Recommendation] Failed to fetch vehicle:",
      error.message,
    );
    throw new Error("Could not fetch vehicle profile");
  }
}

/**
 * Get the best (highest power) compatible port
 */
function getBestPort(ports, vehicleType, compatibleConnectors) {
  const compatible = ports.filter(
    (port) =>
      port.vehicleType === vehicleType &&
      compatibleConnectors.includes(port.connectorType),
  );

  if (compatible.length === 0) return null;

  // Return highest power port
  return compatible.reduce((best, current) =>
    current.powerKW > best.powerKW ? current : best,
  );
}

module.exports = {
  getRecommendations,
  fetchNearbyStations,
  fetchUserVehicle,
  getBestPort,
};
