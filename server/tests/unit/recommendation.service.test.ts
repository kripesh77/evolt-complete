import { RecommendationService } from "../../src/services/recommendation.service";
import type { VehicleProfile } from "../../src/types/vehicle";

describe("Recommendation Service", () => {
  describe("validateVehicleProfile", () => {
    it("should validate a correct bike profile", () => {
      const profile: VehicleProfile = {
        vehicleType: "bike",
        batteryCapacity_kWh: 3,
        efficiency_kWh_per_km: 0.05,
        batteryPercent: 80,
        compatibleConnectors: ["AC_SLOW"],
      };

      const errors = RecommendationService.validateVehicleProfile(profile);
      expect(errors).toHaveLength(0);
    });

    it("should validate a correct car profile", () => {
      const profile: VehicleProfile = {
        vehicleType: "car",
        batteryCapacity_kWh: 60,
        efficiency_kWh_per_km: 0.2,
        batteryPercent: 50,
        compatibleConnectors: ["CCS", "Type2"],
      };

      const errors = RecommendationService.validateVehicleProfile(profile);
      expect(errors).toHaveLength(0);
    });

    it("should reject invalid vehicle type", () => {
      const profile = {
        vehicleType: "truck" as any,
        batteryCapacity_kWh: 60,
        efficiency_kWh_per_km: 0.2,
        batteryPercent: 50,
        compatibleConnectors: ["CCS"],
      };

      const errors = RecommendationService.validateVehicleProfile(profile);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("vehicleType"))).toBe(true);
    });

    it("should reject negative battery capacity", () => {
      const profile: VehicleProfile = {
        vehicleType: "car",
        batteryCapacity_kWh: -10,
        efficiency_kWh_per_km: 0.2,
        batteryPercent: 50,
        compatibleConnectors: ["CCS"],
      };

      const errors = RecommendationService.validateVehicleProfile(profile);
      expect(errors.some((e) => e.includes("batteryCapacity"))).toBe(true);
    });

    it("should reject invalid battery percentage", () => {
      const profile: VehicleProfile = {
        vehicleType: "car",
        batteryCapacity_kWh: 60,
        efficiency_kWh_per_km: 0.2,
        batteryPercent: 150,
        compatibleConnectors: ["CCS"],
      };

      const errors = RecommendationService.validateVehicleProfile(profile);
      expect(errors.some((e) => e.includes("batteryPercent"))).toBe(true);
    });

    it("should reject empty connectors array", () => {
      const profile: VehicleProfile = {
        vehicleType: "car",
        batteryCapacity_kWh: 60,
        efficiency_kWh_per_km: 0.2,
        batteryPercent: 50,
        compatibleConnectors: [],
      };

      const errors = RecommendationService.validateVehicleProfile(profile);
      expect(errors.some((e) => e.includes("connector"))).toBe(true);
    });

    it("should reject invalid connector types", () => {
      const profile: VehicleProfile = {
        vehicleType: "car",
        batteryCapacity_kWh: 60,
        efficiency_kWh_per_km: 0.2,
        batteryPercent: 50,
        compatibleConnectors: ["INVALID" as any],
      };

      const errors = RecommendationService.validateVehicleProfile(profile);
      expect(errors.some((e) => e.includes("Invalid connectors"))).toBe(true);
    });

    it("should reject bike using car connectors", () => {
      const profile: VehicleProfile = {
        vehicleType: "bike",
        batteryCapacity_kWh: 3,
        efficiency_kWh_per_km: 0.05,
        batteryPercent: 80,
        compatibleConnectors: ["CCS"],
      };

      const errors = RecommendationService.validateVehicleProfile(profile);
      expect(
        errors.some((e) => e.includes("Bikes cannot use car connectors")),
      ).toBe(true);
    });
  });
});
