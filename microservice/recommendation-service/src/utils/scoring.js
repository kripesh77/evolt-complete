/**
 * ============================================================================
 * SCORING UTILITIES - Recommendation Service
 * ============================================================================
 *
 * LEARNING POINT: Recommendation Algorithm
 *
 * The scoring algorithm determines which stations to recommend.
 * It uses WEIGHTED SCORING to combine multiple factors:
 *
 * Score = w1*distance + w2*availability + w3*waitTime + w4*price + w5*power
 *
 * Where each factor is normalized to 0-1 scale:
 * - distance: closer is better (inverted)
 * - availability: more free slots is better
 * - waitTime: less wait is better (inverted)
 * - price: cheaper is better (inverted)
 * - power: faster charging is better
 *
 * Users can customize weights based on their priorities!
 *
 * ============================================================================
 */

const {
  DEFAULT_SCORING_WEIGHTS,
  VEHICLE_TYPES,
} = require("../../../shared/constants");

/**
 * Normalize a value to 0-1 scale
 *
 * @param {number} value - The value to normalize
 * @param {number} min - Minimum value in dataset
 * @param {number} max - Maximum value in dataset
 * @param {boolean} invert - If true, higher original value = lower score
 * @returns {number} - Normalized value 0-1
 */
function normalize(value, min, max, invert = false) {
  if (max === min) return 0.5; // Avoid division by zero

  const normalized = (value - min) / (max - min);
  return invert ? 1 - normalized : normalized;
}

/**
 * Calculate score for a single station
 *
 * @param {object} station - Station data with calculated metrics
 * @param {object} ranges - Min/max ranges for normalization
 * @param {string} vehicleType - Vehicle type for power scaling
 * @param {object} weights - Scoring weights
 * @returns {number} - Score 0-100
 */
function calculateStationScore(station, ranges, vehicleType, weights) {
  // Normalize each factor
  const distanceScore = normalize(
    station.distanceKm,
    ranges.distance.min,
    ranges.distance.max,
    true, // closer is better
  );

  const availabilityScore = normalize(
    station.freeSlots,
    ranges.freeSlots.min,
    ranges.freeSlots.max,
    false, // more is better
  );

  const waitTimeScore = normalize(
    station.waitTimeMinutes,
    ranges.waitTime.min,
    ranges.waitTime.max,
    true, // less is better
  );

  const priceScore = normalize(
    station.pricePerKWh,
    ranges.price.min,
    ranges.price.max,
    true, // cheaper is better
  );

  // Power scoring depends on vehicle type
  // Bikes don't need super fast chargers
  let powerMax = ranges.power.max;
  if (vehicleType === VEHICLE_TYPES.BIKE) {
    powerMax = Math.min(powerMax, 22); // Cap at 22kW for bikes
  }

  const powerScore = normalize(
    station.powerKW,
    ranges.power.min,
    powerMax,
    false, // more power is better
  );

  // Calculate weighted score
  const score =
    (weights.distance * distanceScore +
      weights.availability * availabilityScore +
      weights.waitTime * waitTimeScore +
      weights.price * priceScore +
      weights.power * powerScore) *
    100; // Scale to 0-100

  return Math.round(score * 10) / 10; // One decimal place
}

/**
 * Score and rank a list of stations
 *
 * @param {Array} stations - Array of station data objects
 * @param {string} vehicleType - Vehicle type
 * @param {object} weights - Scoring weights (optional, uses defaults)
 * @returns {Array} - Stations sorted by score (highest first)
 *
 * Each station object should have:
 * - stationId
 * - distanceKm
 * - freeSlots
 * - totalSlots
 * - waitTimeMinutes
 * - powerKW
 * - pricePerKWh
 */
function scoreStations(
  stations,
  vehicleType,
  weights = DEFAULT_SCORING_WEIGHTS,
) {
  if (stations.length === 0) {
    return [];
  }

  // Calculate ranges for normalization
  const ranges = {
    distance: {
      min: Math.min(...stations.map((s) => s.distanceKm)),
      max: Math.max(...stations.map((s) => s.distanceKm)),
    },
    freeSlots: {
      min: Math.min(...stations.map((s) => s.freeSlots)),
      max: Math.max(...stations.map((s) => s.freeSlots)),
    },
    waitTime: {
      min: Math.min(...stations.map((s) => s.waitTimeMinutes)),
      max: Math.max(...stations.map((s) => s.waitTimeMinutes)),
    },
    price: {
      min: Math.min(...stations.map((s) => s.pricePerKWh)),
      max: Math.max(...stations.map((s) => s.pricePerKWh)),
    },
    power: {
      min: Math.min(...stations.map((s) => s.powerKW)),
      max: Math.max(...stations.map((s) => s.powerKW)),
    },
  };

  // Score each station
  const scoredStations = stations.map((station) => ({
    ...station,
    score: calculateStationScore(station, ranges, vehicleType, weights),
  }));

  // Sort by score (highest first)
  return scoredStations.sort((a, b) => b.score - a.score);
}

/**
 * Validate scoring weights
 * Weights should sum to 1.0
 */
function validateWeights(weights) {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) < 0.01; // Allow small floating point errors
}

/**
 * Merge user weights with defaults
 */
function mergeWeights(userWeights = {}) {
  return {
    ...DEFAULT_SCORING_WEIGHTS,
    ...userWeights,
  };
}

module.exports = {
  normalize,
  calculateStationScore,
  scoreStations,
  validateWeights,
  mergeWeights,
};
