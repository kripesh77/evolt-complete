import type { ScoringWeights } from "../types/vehicle.js";
import { DEFAULT_SCORING_WEIGHTS } from "../types/vehicle.js";

/**
 * Normalize a value to 0-1 range
 * Lower is better: e.g., distance, wait time, cost
 */
export function normalizeInverse(value: number, maxValue: number): number {
  if (maxValue <= 0) return 1;
  const normalized = 1 - Math.min(value, maxValue) / maxValue;
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Normalize a value to 0-1 range
 * Higher is better: e.g., availability, power
 */
export function normalizeDirect(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0;
  const normalized = Math.min(value, maxValue) / maxValue;
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Calculate distance score (lower distance = higher score)
 * @param distanceKm - Distance in kilometers
 * @param maxDistanceKm - Maximum reachable distance
 */
export function calculateDistanceScore(
  distanceKm: number,
  maxDistanceKm: number,
): number {
  return normalizeInverse(distanceKm, maxDistanceKm);
}

/**
 * Calculate availability score based on free slots
 * @param freeSlots - Number of free slots
 * @param totalSlots - Total number of slots
 */
export function calculateAvailabilityScore(
  freeSlots: number,
  totalSlots: number,
): number {
  if (totalSlots <= 0) return 0;
  // Give extra weight if there are any free slots
  const baseScore = normalizeDirect(freeSlots, totalSlots);
  const hasFreeSlotsBonus = freeSlots > 0 ? 0.2 : 0;
  return Math.min(1, baseScore + hasFreeSlotsBonus);
}

/**
 * Calculate wait time score (lower wait = higher score)
 * @param waitTimeMinutes - Estimated wait time in minutes
 * @param maxWaitMinutes - Maximum acceptable wait time (default 60 mins)
 */
export function calculateWaitScore(
  waitTimeMinutes: number,
  maxWaitMinutes: number = 60,
): number {
  return normalizeInverse(waitTimeMinutes, maxWaitMinutes);
}

/**
 * Calculate power score (higher power = higher score for fast charging)
 * @param powerKW - Charging power in kW
 * @param vehicleType - Type of vehicle (bike/car)
 */
export function calculatePowerScore(
  powerKW: number,
  vehicleType: "bike" | "car",
): number {
  // Different max power expectations for bikes vs cars
  const maxPower = vehicleType === "bike" ? 5 : 350;
  return normalizeDirect(powerKW, maxPower);
}

/**
 * Calculate cost score (lower cost = higher score)
 * @param pricePerKWh - Price per kWh
 * @param vehicleType - Type of vehicle (bike/car)
 */
export function calculateCostScore(
  pricePerKWh: number,
  vehicleType: "bike" | "car",
): number {
  // Different price expectations for bikes vs cars
  // Bikes are more cost-sensitive
  const maxPrice = vehicleType === "bike" ? 10 : 20;
  return normalizeInverse(pricePerKWh, maxPrice);
}

/**
 * Calculate battery safety score based on distance and remaining range
 * @param distanceKm - Distance to station
 * @param reachableKm - Reachable distance with safety buffer
 */
export function calculateBatterySafetyScore(
  distanceKm: number,
  reachableKm: number,
): number {
  if (reachableKm <= 0) return 0;
  // Higher score when distance is well within range
  const ratio = distanceKm / reachableKm;
  if (ratio >= 1) return 0; // Cannot reach
  // Score drops faster as we approach the limit
  return Math.pow(1 - ratio, 1.5);
}

/**
 * Calculate final recommendation score using weighted average
 */
export function calculateFinalScore(
  scores: {
    distance: number;
    availability: number;
    waitTime: number;
    power: number;
    cost: number;
  },
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): number {
  const totalWeight =
    weights.distance +
    weights.availability +
    weights.waitTime +
    weights.power +
    weights.cost;

  if (totalWeight === 0) return 0;

  const weightedSum =
    scores.distance * weights.distance +
    scores.availability * weights.availability +
    scores.waitTime * weights.waitTime +
    scores.power * weights.power +
    scores.cost * weights.cost;

  const finalScore = weightedSum / totalWeight;
  return Math.round(finalScore * 100) / 100; // Round to 2 decimal places
}

/**
 * Score multiple stations and sort by final score (descending)
 */
export interface StationScoreInput {
  stationId: string;
  distanceKm: number;
  freeSlots: number;
  totalSlots: number;
  waitTimeMinutes: number;
  powerKW: number;
  pricePerKWh: number;
  reachableKm: number;
}

export interface StationScoreOutput extends StationScoreInput {
  score: number;
  scores: {
    distance: number;
    availability: number;
    waitTime: number;
    power: number;
    cost: number;
    batterySafety: number;
  };
}

export function scoreStations(
  stations: StationScoreInput[],
  vehicleType: "bike" | "car",
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): StationScoreOutput[] {
  // Find max values for normalization
  const maxDistance = Math.max(...stations.map((s) => s.distanceKm), 1);
  const maxWait = Math.max(...stations.map((s) => s.waitTimeMinutes), 60);

  return stations
    .map((station) => {
      const scores = {
        distance: calculateDistanceScore(station.distanceKm, maxDistance),
        availability: calculateAvailabilityScore(
          station.freeSlots,
          station.totalSlots,
        ),
        waitTime: calculateWaitScore(station.waitTimeMinutes, maxWait),
        power: calculatePowerScore(station.powerKW, vehicleType),
        cost: calculateCostScore(station.pricePerKWh, vehicleType),
        batterySafety: calculateBatterySafetyScore(
          station.distanceKm,
          station.reachableKm,
        ),
      };

      // Include battery safety in the final calculation
      const adjustedScores = {
        ...scores,
        distance: scores.distance * scores.batterySafety,
      };

      const score = calculateFinalScore(adjustedScores, weights);

      return {
        ...station,
        score,
        scores,
      };
    })
    .sort((a, b) => b.score - a.score); // Sort descending by score
}
