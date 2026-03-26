/**
 * Unit tests for TypeScript type definitions
 * Ensures type contracts are valid at compile-time
 */
import {
  VehicleType,
  ConnectorType,
  StationStatusType,
  UserRole,
  VehicleProfile,
  GeoLocation,
  Port,
  Station,
  User,
  AuthResponse,
  RecommendedStation,
  ApiResponse,
  RecommendationRequest,
} from "../../../src/types";

describe("Type definitions", () => {
  describe("VehicleType", () => {
    it("should accept valid vehicle types", () => {
      const bike: VehicleType = "bike";
      const car: VehicleType = "car";
      expect(bike).toBe("bike");
      expect(car).toBe("car");
    });
  });

  describe("ConnectorType", () => {
    it("should accept valid connector types", () => {
      const types: ConnectorType[] = ["AC_SLOW", "Type2", "CCS", "CHAdeMO"];
      expect(types).toHaveLength(4);
      expect(types).toContain("CCS");
    });
  });

  describe("StationStatusType", () => {
    it("should accept valid status types", () => {
      const active: StationStatusType = "active";
      const inactive: StationStatusType = "inactive";
      expect(active).toBe("active");
      expect(inactive).toBe("inactive");
    });
  });

  describe("UserRole", () => {
    it("should accept valid user roles", () => {
      const roles: UserRole[] = ["user", "operator", "admin"];
      expect(roles).toHaveLength(3);
    });
  });

  describe("VehicleProfile", () => {
    it("should create a valid vehicle profile", () => {
      const vehicle: VehicleProfile = {
        vehicleType: "car",
        batteryCapacity_kWh: 60,
        efficiency_kWh_per_km: 0.15,
        batteryPercent: 80,
        compatibleConnectors: ["CCS", "Type2"],
      };

      expect(vehicle.vehicleType).toBe("car");
      expect(vehicle.batteryCapacity_kWh).toBe(60);
      expect(vehicle.compatibleConnectors).toContain("CCS");
    });

    it("should allow optional fields", () => {
      const vehicle: VehicleProfile = {
        _id: "v-1",
        name: "My Tesla",
        vehicleType: "car",
        batteryCapacity_kWh: 75,
        efficiency_kWh_per_km: 0.16,
        batteryPercent: 90,
        compatibleConnectors: ["CCS"],
      };

      expect(vehicle._id).toBe("v-1");
      expect(vehicle.name).toBe("My Tesla");
    });
  });

  describe("GeoLocation", () => {
    it("should create a valid geo location", () => {
      const location: GeoLocation = {
        latitude: 28.6139,
        longitude: 77.209,
      };
      expect(location.latitude).toBeCloseTo(28.6139);
      expect(location.longitude).toBeCloseTo(77.209);
    });
  });

  describe("Port", () => {
    it("should create a valid port", () => {
      const port: Port = {
        connectorType: "CCS",
        vehicleType: "car",
        powerKW: 50,
        total: 4,
        occupied: 1,
        pricePerKWh: 15,
      };

      expect(port.connectorType).toBe("CCS");
      expect(port.total - port.occupied).toBe(3);
    });
  });

  describe("Station", () => {
    it("should create a valid station", () => {
      const station: Station = {
        _id: "s-1",
        name: "Test Station",
        location: {
          type: "Point",
          coordinates: [77.209, 28.6139],
        },
        address: "123 Test St",
        ports: [
          {
            connectorType: "CCS",
            vehicleType: "car",
            powerKW: 50,
            total: 4,
            occupied: 1,
            pricePerKWh: 15,
          },
        ],
        operatingHours: "24/7",
        status: "active",
      };

      expect(station._id).toBe("s-1");
      expect(station.location.type).toBe("Point");
      expect(station.location.coordinates).toHaveLength(2);
      expect(station.ports).toHaveLength(1);
    });

    it("should allow optional station fields", () => {
      const station: Station = {
        _id: "s-2",
        name: "Station 2",
        operatorId: "op-1",
        location: { type: "Point", coordinates: [77.1, 28.5] },
        address: "456 Test Ave",
        ports: [],
        operatingHours: "9AM-9PM",
        status: "inactive",
        lastStatusUpdate: "2026-01-01T00:00:00Z",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };

      expect(station.operatorId).toBe("op-1");
      expect(station.lastStatusUpdate).toBeDefined();
    });
  });

  describe("User", () => {
    it("should create a valid user", () => {
      const user: User = {
        _id: "u-1",
        name: "Test User",
        email: "test@example.com",
        role: "user",
        isActive: true,
        vehicleProfiles: [],
      };

      expect(user._id).toBe("u-1");
      expect(user.role).toBe("user");
      expect(user.vehicleProfiles).toEqual([]);
    });
  });

  describe("AuthResponse", () => {
    it("should have correct structure", () => {
      const response: AuthResponse = {
        status: "success",
        token: "jwt-token-123",
        data: {
          user: {
            _id: "u-1",
            name: "Test",
            email: "test@example.com",
            role: "user",
            isActive: true,
            vehicleProfiles: [],
          },
        },
      };

      expect(response.status).toBe("success");
      expect(response.token).toBeDefined();
      expect(response.data.user).toBeDefined();
    });
  });

  describe("RecommendedStation", () => {
    it("should have all recommendation fields", () => {
      const rec: RecommendedStation = {
        stationId: "s-1",
        stationName: "Station 1",
        address: "123 Test St",
        recommendedPort: "CCS",
        powerKW: 50,
        pricePerKWh: 15,
        freeSlots: 3,
        totalSlots: 4,
        distance_km: 2.5,
        estimatedChargingTime_min: 45,
        estimatedCost: 300,
        canReachWithCurrentCharge: true,
        score: 85,
        location: { type: "Point", coordinates: [77.209, 28.6139] },
      };

      expect(rec.score).toBe(85);
      expect(rec.canReachWithCurrentCharge).toBe(true);
      expect(rec.estimatedChargingTime_min).toBe(45);
    });
  });

  describe("ApiResponse", () => {
    it("should wrap data with generic type", () => {
      const response: ApiResponse<{ stations: Station[] }> = {
        status: "success",
        results: 2,
        data: { stations: [] },
      };

      expect(response.status).toBe("success");
      expect(response.data.stations).toEqual([]);
    });
  });

  describe("RecommendationRequest", () => {
    it("should have vehicle profile and location", () => {
      const request: RecommendationRequest = {
        vehicleProfile: {
          vehicleType: "car",
          batteryCapacity_kWh: 60,
          efficiency_kWh_per_km: 0.15,
          batteryPercent: 50,
          compatibleConnectors: ["CCS"],
        },
        currentLocation: {
          latitude: 28.6139,
          longitude: 77.209,
        },
      };

      expect(request.vehicleProfile.vehicleType).toBe("car");
      expect(request.currentLocation.latitude).toBeCloseTo(28.6139);
    });
  });
});
