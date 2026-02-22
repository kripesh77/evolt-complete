/**
 * ============================================================================
 * CALCULATION UTILITIES - Recommendation Service
 * ============================================================================
 *
 * LEARNING POINT: Shared Business Logic
 *
 * These calculations are the core business logic for recommendations.
 * In a microservices architecture, you have choices for shared logic:
 *
 * 1. DUPLICATE: Copy code to each service that needs it
 *    - Simple but hard to maintain
 *
 * 2. SHARED LIBRARY: Package as npm module
 *    - Good for stable, well-defined logic
 *    - Versioning can be tricky
 *
 * 3. DEDICATED SERVICE: Make a "calculation service"
 *    - Overkill for simple math
 *    - Adds network latency
 *
 * For this learning project, we keep calculations in the service
 * that uses them most (Recommendation Service).
 *
 * ============================================================================
 */

const { VEHICLE_TYPES } = require("../../../shared/constants");

/**
 * Safety buffer for battery calculations
 * We don't want EVs to run completely empty!
 */
const SAFETY_BUFFER = 0.15; // 15% reserve

/**
 * Calculate how far a vehicle can travel with current battery
 *
 * @param {object} vehicleProfile - Vehicle profile with battery info
 * @returns {number} - Reachable distance in kilometers
 *
 * FORMULA:
 * reachableKm = (batteryCapacity * batteryPercent/100 * (1 - safetyBuffer)) / efficiency
 *
 * Example:
 * - 50 kWh battery at 60% = 30 kWh available
 * - With 15% safety buffer = 25.5 kWh usable
 * - At 0.15 kWh/km efficiency = 170 km range
 */
function calculateReachableDistance(vehicleProfile) {
  const { batteryCapacity_kWh, batteryPercent, efficiency_kWh_per_km } =
    vehicleProfile;

  // Available energy (accounting for safety buffer)
  const availableEnergy =
    batteryCapacity_kWh * (batteryPercent / 100) * (1 - SAFETY_BUFFER);

  // Distance = energy / efficiency
  const reachableKm = availableEnergy / efficiency_kWh_per_km;

  return Math.round(reachableKm * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate energy needed to fully charge
 *
 * @param {number} batteryCapacity_kWh - Battery size
 * @param {number} currentPercent - Current charge percentage
 * @returns {number} - kWh needed
 */
function calculateEnergyNeeded(batteryCapacity_kWh, currentPercent) {
  const missingPercent = 100 - currentPercent;
  return batteryCapacity_kWh * (missingPercent / 100);
}

/**
 * Calculate estimated charging time
 *
 * @param {number} energyNeeded_kWh - How much to charge
 * @param {number} chargerPower_kW - Charger power output
 * @returns {number} - Time in minutes
 *
 * Note: Real charging isn't linear (slows down at high %).
 * This is a simplified calculation.
 */
function calculateChargingTime(energyNeeded_kWh, chargerPower_kW) {
  // Time (hours) = Energy / Power
  const hours = energyNeeded_kWh / chargerPower_kW;
  return Math.round(hours * 60); // Convert to minutes
}

/**
 * Calculate charging cost
 *
 * @param {number} energyNeeded_kWh - How much to charge
 * @param {number} pricePerKWh - Price per unit
 * @returns {number} - Total cost
 */
function calculateChargingCost(energyNeeded_kWh, pricePerKWh) {
  return Math.round(energyNeeded_kWh * pricePerKWh * 100) / 100;
}

/**
 * Calculate estimated wait time based on occupancy
 *
 * @param {number} occupiedSlots - Currently occupied
 * @param {number} totalSlots - Total available
 * @param {number} avgChargeTimeMinutes - Average time per vehicle
 * @returns {number} - Estimated wait in minutes
 */
function calculateWaitTime(occupiedSlots, totalSlots, avgChargeTimeMinutes) {
  const freeSlots = totalSlots - occupiedSlots;

  if (freeSlots > 0) {
    return 0; // No wait if slots available
  }

  // If all occupied, estimate based on queue position
  // Simplified: assume one vehicle will finish soon
  return avgChargeTimeMinutes * 0.5; // Half of average charge time
}

/**
 * Get average charging time by vehicle and power
 */
function getAverageChargeTime(vehicleType, powerKW) {
  // Typical charge times (minutes)
  if (vehicleType === VEHICLE_TYPES.BIKE) {
    return powerKW >= 3 ? 60 : 120; // 1-2 hours for bikes
  }

  // Cars
  if (powerKW >= 100) return 30; // Fast chargers
  if (powerKW >= 50) return 60; // DC chargers
  if (powerKW >= 22) return 120; // AC Type 2
  return 240; // Slow AC
}

module.exports = {
  SAFETY_BUFFER,
  calculateReachableDistance,
  calculateEnergyNeeded,
  calculateChargingTime,
  calculateChargingCost,
  calculateWaitTime,
  getAverageChargeTime,
};
