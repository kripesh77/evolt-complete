import {
  calculateRemainingEnergy,
  calculateRemainingRange,
  calculateReachableDistance,
  calculateEnergyNeeded,
  calculateChargingTime,
  calculateChargingCost,
  calculateWaitTime,
  calculateDistance,
  isValidCoordinates,
  getAverageChargeTime,
} from "../../src/utils/calculations";
import type { VehicleProfile } from "../../src/types/vehicle";

describe("Calculation Utilities", () => {
  describe("calculateRemainingEnergy", () => {
    it("should calculate remaining energy correctly", () => {
      expect(calculateRemainingEnergy(50, 80)).toBe(40);
      expect(calculateRemainingEnergy(100, 50)).toBe(50);
      expect(calculateRemainingEnergy(3, 60)).toBeCloseTo(1.8, 10);
    });

    it("should handle edge cases", () => {
      expect(calculateRemainingEnergy(50, 0)).toBe(0);
      expect(calculateRemainingEnergy(50, 100)).toBe(50);
    });
  });

  describe("calculateRemainingRange", () => {
    it("should calculate remaining range correctly", () => {
      expect(calculateRemainingRange(40, 0.2)).toBe(200);
      expect(calculateRemainingRange(10, 0.1)).toBe(100);
    });

    it("should throw error for zero efficiency", () => {
      expect(() => calculateRemainingRange(40, 0)).toThrow();
      expect(() => calculateRemainingRange(40, -0.1)).toThrow();
    });
  });

  describe("calculateReachableDistance", () => {
    it("should calculate reachable distance with safety buffer", () => {
      const bikeProfile: VehicleProfile = {
        vehicleType: "bike",
        batteryCapacity_kWh: 3,
        efficiency_kWh_per_km: 0.05,
        batteryPercent: 80,
        compatibleConnectors: ["AC_SLOW"],
      };

      const reachable = calculateReachableDistance(bikeProfile);
      // 3 * 0.8 = 2.4 kWh remaining
      // 2.4 / 0.05 = 48 km range
      // 48 * 0.8 = 38.4 km reachable
      expect(reachable).toBeCloseTo(38.4, 10);
    });

    it("should calculate reachable distance for car", () => {
      const carProfile: VehicleProfile = {
        vehicleType: "car",
        batteryCapacity_kWh: 60,
        efficiency_kWh_per_km: 0.2,
        batteryPercent: 50,
        compatibleConnectors: ["CCS"],
      };

      const reachable = calculateReachableDistance(carProfile);
      // 60 * 0.5 = 30 kWh remaining
      // 30 / 0.2 = 150 km range
      // 150 * 0.8 = 120 km reachable
      expect(reachable).toBe(120);
    });
  });

  describe("calculateEnergyNeeded", () => {
    it("should calculate energy needed to reach target percentage", () => {
      expect(calculateEnergyNeeded(50, 20, 80)).toBe(30);
      expect(calculateEnergyNeeded(100, 50, 80)).toBe(30);
    });

    it("should return 0 if already at or above target", () => {
      expect(calculateEnergyNeeded(50, 80, 80)).toBe(0);
      expect(calculateEnergyNeeded(50, 90, 80)).toBe(0);
    });
  });

  describe("calculateChargingTime", () => {
    it("should calculate charging time in minutes", () => {
      // 30 kWh at 50 kW with 90% efficiency
      const time = calculateChargingTime(30, 50, 0.9);
      // 30 / (50 * 0.9) = 0.667 hours = 40 minutes
      expect(time).toBe(40);
    });

    it("should throw error for zero power", () => {
      expect(() => calculateChargingTime(30, 0)).toThrow();
    });
  });

  describe("calculateChargingCost", () => {
    it("should calculate charging cost correctly", () => {
      expect(calculateChargingCost(30, 0.45)).toBe(13.5);
      expect(calculateChargingCost(10, 0.3)).toBe(3);
    });

    it("should round to 2 decimal places", () => {
      expect(calculateChargingCost(10.333, 0.333)).toBe(3.44);
    });
  });

  describe("calculateWaitTime", () => {
    it("should return 0 when slots are available", () => {
      expect(calculateWaitTime(2, 5, 30)).toBe(0);
      expect(calculateWaitTime(0, 3, 30)).toBe(0);
    });

    it("should calculate wait time when full", () => {
      expect(calculateWaitTime(5, 5, 30)).toBe(30);
      expect(calculateWaitTime(7, 5, 30)).toBe(90);
    });
  });

  describe("calculateDistance", () => {
    it("should calculate distance between two points", () => {
      // New York to Los Angeles (approximate)
      const distance = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it("should return 0 for same location", () => {
      expect(calculateDistance(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
    });

    it("should calculate short distances correctly", () => {
      // ~1.1 km distance
      const distance = calculateDistance(40.7128, -74.006, 40.7228, -74.006);
      expect(distance).toBeGreaterThan(1);
      expect(distance).toBeLessThan(1.5);
    });
  });

  describe("isValidCoordinates", () => {
    it("should validate correct coordinates", () => {
      expect(isValidCoordinates(-74.006, 40.7128)).toBe(true);
      expect(isValidCoordinates(0, 0)).toBe(true);
      expect(isValidCoordinates(-180, -90)).toBe(true);
      expect(isValidCoordinates(180, 90)).toBe(true);
    });

    it("should reject invalid coordinates", () => {
      expect(isValidCoordinates(-181, 40)).toBe(false);
      expect(isValidCoordinates(181, 40)).toBe(false);
      expect(isValidCoordinates(-74, -91)).toBe(false);
      expect(isValidCoordinates(-74, 91)).toBe(false);
    });
  });

  describe("getAverageChargeTime", () => {
    it("should return reasonable charge time for bikes", () => {
      const time = getAverageChargeTime("bike", 2);
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(120); // Less than 2 hours
    });

    it("should return reasonable charge time for cars", () => {
      const time = getAverageChargeTime("car", 50);
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(120); // Less than 2 hours at 50kW
    });
  });
});
