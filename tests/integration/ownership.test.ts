/**
 * Station Ownership and Role-Based Access Tests
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../src/app.js";
import User from "../../src/models/user.js";
import Station from "../../src/models/Station.js";

const TEST_MONGODB_URI =
  process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/ev_charging_test";

describe("Station Ownership and Role-Based Access Tests", () => {
  let operator1Token: string;
  let operator2Token: string;
  let adminToken: string;
  let userToken: string;
  let operator1Id: string;
  let stationId: string;

  const operator1 = {
    name: "Operator One",
    email: "operator1@test.com",
    password: "password123",
    role: "operator",
    company: "Company One",
  };

  const operator2 = {
    name: "Operator Two",
    email: "operator2@test.com",
    password: "password123",
    role: "operator",
    company: "Company Two",
  };

  const adminUser = {
    name: "Admin User",
    email: "admin@test.com",
    password: "admin123456",
    role: "admin",
    company: "Admin Company",
  };

  const regularUser = {
    name: "Regular User",
    email: "regularuser@test.com",
    password: "password123",
  };

  const testStation = {
    name: "Test Station",
    location: {
      type: "Point" as const,
      coordinates: [77.2195, 28.6315],
    },
    address: "Test Address, Delhi",
    ports: [
      {
        connectorType: "CCS",
        vehicleType: "car",
        powerKW: 50,
        total: 2,
        pricePerKWh: 15,
      },
    ],
    operatingHours: "24/7",
    status: "active",
  };

  beforeAll(async () => {
    try {
      await mongoose.connect(TEST_MONGODB_URI);
    } catch {
      console.log("Already connected to MongoDB");
    }
  });

  afterAll(async () => {
    await User.deleteMany({
      email: {
        $in: [
          operator1.email,
          operator2.email,
          adminUser.email,
          regularUser.email,
        ],
      },
    });
    await Station.deleteMany({ name: testStation.name });
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clean up
    await User.deleteMany({
      email: {
        $in: [
          operator1.email,
          operator2.email,
          adminUser.email,
          regularUser.email,
        ],
      },
    });
    await Station.deleteMany({ name: testStation.name });

    // Register operator 1
    const response1 = await request(app)
      .post("/api/v1/auth/register")
      .send(operator1);
    operator1Token = response1.body.data.token;
    operator1Id = response1.body.data.user.id;

    // Register operator 2
    const response2 = await request(app)
      .post("/api/v1/auth/register")
      .send(operator2);
    operator2Token = response2.body.data.token;

    // Register regular user
    const userResponse = await request(app)
      .post("/api/v1/auth/register")
      .send(regularUser);
    userToken = userResponse.body.data.token;

    // Create admin directly in DB (bypass API restriction)
    const admin = await User.create(adminUser);
    adminToken = admin.generateAuthToken();

    // Create a station owned by operator 1
    const stationResponse = await request(app)
      .post("/api/v1/stations")
      .set("Authorization", `Bearer ${operator1Token}`)
      .send(testStation);
    stationId = stationResponse.body.data.station._id;
  });

  describe("POST /api/v1/stations (Create Station)", () => {
    it("should require authentication to create a station", async () => {
      const response = await request(app)
        .post("/api/v1/stations")
        .send(testStation)
        .expect(401);

      expect(response.body.status).toBe("fail");
      expect(response.body.message).toBe("Access denied. No token provided.");
    });

    it("should reject regular user from creating station", async () => {
      const response = await request(app)
        .post("/api/v1/stations")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ ...testStation, name: "User Station" })
        .expect(403);

      expect(response.body.status).toBe("fail");
      expect(response.body.message).toContain("Access denied");
    });

    it("should create station with authenticated operator", async () => {
      const newStation = { ...testStation, name: "New Station" };
      const response = await request(app)
        .post("/api/v1/stations")
        .set("Authorization", `Bearer ${operator1Token}`)
        .send(newStation)
        .expect(201);

      expect(response.body.status).toBe("success");
      expect(response.body.data.station.operatorId).toBe(operator1Id);
    });

    it("should allow admin to create station", async () => {
      const newStation = { ...testStation, name: "Admin Station" };
      const response = await request(app)
        .post("/api/v1/stations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newStation)
        .expect(201);

      expect(response.body.status).toBe("success");
    });
  });

  describe("GET /api/v1/stations (Public Routes)", () => {
    it("should allow unauthenticated access to station list", async () => {
      const response = await request(app).get("/api/v1/stations").expect(200);

      expect(response.body.status).toBe("success");
    });

    it("should allow unauthenticated access to station details", async () => {
      const response = await request(app)
        .get(`/api/v1/stations/${stationId}`)
        .expect(200);

      expect(response.body.status).toBe("success");
    });
  });

  describe("GET /api/v1/stations/my-stations", () => {
    it("should return only operator's own stations", async () => {
      const response = await request(app)
        .get("/api/v1/stations/my-stations")
        .set("Authorization", `Bearer ${operator1Token}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.results).toBe(1);
      expect(response.body.data.stations[0].operatorId.toString()).toBe(
        operator1Id,
      );
    });

    it("should return empty for operator with no stations", async () => {
      const response = await request(app)
        .get("/api/v1/stations/my-stations")
        .set("Authorization", `Bearer ${operator2Token}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.results).toBe(0);
    });

    it("should reject regular user from accessing my-stations", async () => {
      const response = await request(app)
        .get("/api/v1/stations/my-stations")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.status).toBe("fail");
    });
  });

  describe("PATCH /api/v1/stations/:id (Update Station)", () => {
    it("should allow owner to update their station", async () => {
      const response = await request(app)
        .patch(`/api/v1/stations/${stationId}`)
        .set("Authorization", `Bearer ${operator1Token}`)
        .send({ name: "Updated Station Name" })
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.station.name).toBe("Updated Station Name");
    });

    it("should reject update from non-owner operator", async () => {
      const response = await request(app)
        .patch(`/api/v1/stations/${stationId}`)
        .set("Authorization", `Bearer ${operator2Token}`)
        .send({ name: "Hacked Name" })
        .expect(403);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe(
        "You do not have permission to update this station",
      );
    });

    it("should reject update from regular user", async () => {
      const response = await request(app)
        .patch(`/api/v1/stations/${stationId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ name: "User Hacked Name" })
        .expect(403);

      expect(response.body.status).toBe("fail");
    });

    it("should allow admin to update any station", async () => {
      const response = await request(app)
        .patch(`/api/v1/stations/${stationId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Admin Updated Name" })
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.station.name).toBe("Admin Updated Name");
    });

    it("should reject update without authentication", async () => {
      const response = await request(app)
        .patch(`/api/v1/stations/${stationId}`)
        .send({ name: "Updated Name" })
        .expect(401);

      expect(response.body.status).toBe("fail");
    });
  });

  describe("DELETE /api/v1/stations/:id (Delete Station)", () => {
    it("should reject delete from non-owner operator", async () => {
      const response = await request(app)
        .delete(`/api/v1/stations/${stationId}`)
        .set("Authorization", `Bearer ${operator2Token}`)
        .expect(403);

      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe(
        "You do not have permission to delete this station",
      );
    });

    it("should reject delete from regular user", async () => {
      const response = await request(app)
        .delete(`/api/v1/stations/${stationId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.status).toBe("fail");
    });

    it("should allow admin to delete any station", async () => {
      // Create a new station for this test
      const newStationResponse = await request(app)
        .post("/api/v1/stations")
        .set("Authorization", `Bearer ${operator1Token}`)
        .send({ ...testStation, name: "Station to Delete" });
      const newStationId = newStationResponse.body.data.station._id;

      await request(app)
        .delete(`/api/v1/stations/${newStationId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(204);

      // Verify station is deleted
      const station = await Station.findById(newStationId);
      expect(station).toBeNull();
    });

    it("should allow owner to delete their station", async () => {
      await request(app)
        .delete(`/api/v1/stations/${stationId}`)
        .set("Authorization", `Bearer ${operator1Token}`)
        .expect(204);

      // Verify station is deleted
      const station = await Station.findById(stationId);
      expect(station).toBeNull();
    });
  });

  describe("POST /api/v1/stations/:id/ports (Add Port)", () => {
    const newPort = {
      connectorType: "Type2",
      vehicleType: "car",
      powerKW: 22,
      total: 4,
      pricePerKWh: 12,
    };

    it("should allow owner to add port", async () => {
      const response = await request(app)
        .post(`/api/v1/stations/${stationId}/ports`)
        .set("Authorization", `Bearer ${operator1Token}`)
        .send(newPort)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.station.ports).toHaveLength(2);
    });

    it("should reject add port from non-owner operator", async () => {
      const response = await request(app)
        .post(`/api/v1/stations/${stationId}/ports`)
        .set("Authorization", `Bearer ${operator2Token}`)
        .send(newPort)
        .expect(403);

      expect(response.body.status).toBe("error");
    });

    it("should reject add port from regular user", async () => {
      const response = await request(app)
        .post(`/api/v1/stations/${stationId}/ports`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(newPort)
        .expect(403);

      expect(response.body.status).toBe("fail");
    });

    it("should allow admin to add port to any station", async () => {
      const response = await request(app)
        .post(`/api/v1/stations/${stationId}/ports`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newPort)
        .expect(200);

      expect(response.body.status).toBe("success");
    });
  });

  describe("PATCH /api/v1/stations/:id/occupancy (Update Occupancy)", () => {
    it("should allow owner to update occupancy", async () => {
      const response = await request(app)
        .patch(`/api/v1/stations/${stationId}/occupancy`)
        .set("Authorization", `Bearer ${operator1Token}`)
        .send({ connectorType: "CCS", occupied: 1 })
        .expect(200);

      expect(response.body.status).toBe("success");
    });

    it("should reject occupancy update from non-owner operator", async () => {
      const response = await request(app)
        .patch(`/api/v1/stations/${stationId}/occupancy`)
        .set("Authorization", `Bearer ${operator2Token}`)
        .send({ connectorType: "CCS", occupied: 1 })
        .expect(403);

      expect(response.body.status).toBe("error");
    });

    it("should reject occupancy update from regular user", async () => {
      const response = await request(app)
        .patch(`/api/v1/stations/${stationId}/occupancy`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ connectorType: "CCS", occupied: 1 })
        .expect(403);

      expect(response.body.status).toBe("fail");
    });

    it("should allow admin to update occupancy of any station", async () => {
      const response = await request(app)
        .patch(`/api/v1/stations/${stationId}/occupancy`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ connectorType: "CCS", occupied: 1 })
        .expect(200);

      expect(response.body.status).toBe("success");
    });
  });
});
