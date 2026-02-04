import type { VehicleProfile } from "../types/vehicle.js";
import { SAFETY_BUFFER } from "../types/vehicle.js";

/**
 * Calculate remaining energy in kWh based on battery capacity and percentage
 */
export function calculateRemainingEnergy(
  batteryCapacity_kWh: number,
  batteryPercent: number,
): number {
  return batteryCapacity_kWh * (batteryPercent / 100);
}

/**
 * Calculate remaining range in km based on remaining energy and efficiency
 */
export function calculateRemainingRange(
  remainingEnergy_kWh: number,
  efficiency_kWh_per_km: number,
): number {
  if (efficiency_kWh_per_km <= 0) {
    throw new Error("Efficiency must be greater than 0");
  }
  return remainingEnergy_kWh / efficiency_kWh_per_km;
}

/**
 * Calculate reachable distance with safety buffer
 */
export function calculateReachableDistance(
  vehicleProfile: VehicleProfile,
): number {
  const remainingEnergy = calculateRemainingEnergy(
    vehicleProfile.batteryCapacity_kWh,
    vehicleProfile.batteryPercent,
  );
  const remainingRange = calculateRemainingRange(
    remainingEnergy,
    vehicleProfile.efficiency_kWh_per_km,
  );
  return remainingRange * SAFETY_BUFFER;
}

/**
 * Calculate energy needed to fully charge (in kWh)
 */
export function calculateEnergyNeeded(
  batteryCapacity_kWh: number,
  batteryPercent: number,
  targetPercent: number = 80, // Default to 80% charge for fast charging
): number {
  const currentEnergy = calculateRemainingEnergy(
    batteryCapacity_kWh,
    batteryPercent,
  );
  const targetEnergy = batteryCapacity_kWh * (targetPercent / 100);
  return Math.max(0, targetEnergy - currentEnergy);
}

/**
 * Calculate estimated charging time in minutes
 */
export function calculateChargingTime(
  energyNeeded_kWh: number,
  powerKW: number,
  chargingEfficiency: number = 0.9, // Account for charging losses
): number {
  if (powerKW <= 0) {
    throw new Error("Power must be greater than 0");
  }
  // Time in hours = energy / (power * efficiency)
  const timeHours = energyNeeded_kWh / (powerKW * chargingEfficiency);
  return Math.ceil(timeHours * 60); // Convert to minutes
}

/**
 * Calculate estimated charging cost
 */
export function calculateChargingCost(
  energyNeeded_kWh: number,
  pricePerKWh: number,
): number {
  return Math.round(energyNeeded_kWh * pricePerKWh * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate estimated wait time based on occupancy
 */
export function calculateWaitTime(
  occupied: number,
  totalSlots: number,
  avgChargeTimeMinutes: number,
): number {
  if (occupied < totalSlots) {
    return 0; // No wait if slots available
  }
  // Estimate based on queue position
  const queuePosition = occupied - totalSlots + 1;
  return queuePosition * avgChargeTimeMinutes;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(
  longitude: number,
  latitude: number,
): boolean {
  return (
    longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90
  );
}

/**
 * Get average charge time for a vehicle type (rough estimate)
 */
export function getAverageChargeTime(
  vehicleType: "bike" | "car",
  powerKW: number,
): number {
  // Rough estimates based on typical battery sizes and charging scenarios
  if (vehicleType === "bike") {
    // Bikes typically have 1-5 kWh batteries, average ~3 kWh
    const avgBikeEnergy = 2; // kWh to add on average
    return calculateChargingTime(avgBikeEnergy, powerKW);
  } else {
    // Cars typically need 20-40 kWh for a decent charge
    const avgCarEnergy = 25; // kWh to add on average
    return calculateChargingTime(avgCarEnergy, powerKW);
  }
}
