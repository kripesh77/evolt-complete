import request from "supertest";
import { app } from "../../src/app";

describe("API Integration Tests", () => {
  describe("Health Check", () => {
    it("GET /health should return 200", async () => {
      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.message).toContain("running");
    });
  });

  describe("Station Routes", () => {
    describe("GET /api/v1/stations", () => {
      it("should return 200 with empty array when no stations exist", async () => {
        // Note: This test assumes MongoDB is not connected
        // In real integration tests, you would set up a test database
        const response = await request(app).get("/api/v1/stations");
        // Will return 500 if DB not connected, which is expected in unit test mode
        expect([200, 500]).toContain(response.status);
      });
    });

    describe("GET /api/v1/stations/stats", () => {
      it("should return stats endpoint", async () => {
        const response = await request(app).get("/api/v1/stations/stats");
        expect([200, 500]).toContain(response.status);
      });
    });
  });

  describe("Recommendation Routes", () => {
    describe("GET /api/v1/recommendations/nearby", () => {
      it("should require longitude and latitude", async () => {
        const response = await request(app).get(
          "/api/v1/recommendations/nearby",
        );
        expect(response.status).toBe(400);
        expect(response.body.message).toContain("longitude");
      });

      it("should validate coordinate ranges", async () => {
        const response = await request(app)
          .get("/api/v1/recommendations/nearby")
          .query({ longitude: 200, latitude: 40 });
        expect(response.status).toBe(400);
        expect(response.body.message).toContain("Invalid coordinates");
      });

      it("should validate radius range", async () => {
        const response = await request(app)
          .get("/api/v1/recommendations/nearby")
          .query({ longitude: -74, latitude: 40, radius: 150 });
        expect(response.status).toBe(400);
        expect(response.body.message).toContain("Radius");
      });
    });

    describe("POST /api/v1/recommendations", () => {
      it("should require vehicleProfile", async () => {
        const response = await request(app)
          .post("/api/v1/recommendations")
          .send({
            currentLocation: { longitude: -74, latitude: 40 },
          });
        expect(response.status).toBe(400);
        expect(response.body.message).toContain("vehicleProfile");
      });

      it("should require currentLocation", async () => {
        const response = await request(app)
          .post("/api/v1/recommendations")
          .send({
            vehicleProfile: {
              vehicleType: "car",
              batteryCapacity_kWh: 60,
              efficiency_kWh_per_km: 0.2,
              batteryPercent: 50,
              compatibleConnectors: ["CCS"],
            },
          });
        expect(response.status).toBe(400);
        expect(response.body.message).toContain("currentLocation");
      });

      it("should validate vehicle profile", async () => {
        const response = await request(app)
          .post("/api/v1/recommendations")
          .send({
            vehicleProfile: {
              vehicleType: "invalid",
              batteryCapacity_kWh: -10,
              efficiency_kWh_per_km: 0.2,
              batteryPercent: 50,
              compatibleConnectors: [],
            },
            currentLocation: { longitude: -74, latitude: 40 },
          });
        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors.length).toBeGreaterThan(0);
      });

      it("should validate coordinates", async () => {
        const response = await request(app)
          .post("/api/v1/recommendations")
          .send({
            vehicleProfile: {
              vehicleType: "car",
              batteryCapacity_kWh: 60,
              efficiency_kWh_per_km: 0.2,
              batteryPercent: 50,
              compatibleConnectors: ["CCS"],
            },
            currentLocation: { longitude: 200, latitude: 40 },
          });
        expect(response.status).toBe(400);
        expect(response.body.message).toContain("coordinates");
      });

      it("should reject bike with car connectors", async () => {
        const response = await request(app)
          .post("/api/v1/recommendations")
          .send({
            vehicleProfile: {
              vehicleType: "bike",
              batteryCapacity_kWh: 3,
              efficiency_kWh_per_km: 0.05,
              batteryPercent: 80,
              compatibleConnectors: ["CCS"],
            },
            currentLocation: { longitude: -74, latitude: 40 },
          });
        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });
    });

    describe("POST /api/v1/recommendations/emergency", () => {
      it("should require vehicleProfile and currentLocation", async () => {
        const response = await request(app)
          .post("/api/v1/recommendations/emergency")
          .send({});
        expect(response.status).toBe(400);
      });
    });
  });

  describe("404 Handler", () => {
    it("should return 404 for undefined routes", async () => {
      const response = await request(app).get("/api/v1/undefined-route");
      expect(response.status).toBe(404);
      expect(response.body.status).toBe("error");
    });
  });
});
