/**
 * Authentication Integration Tests (Role-Based)
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

const TEST_MONGODB_URI =
  process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/ev_charging_test";

describe("Authentication API Tests (Role-Based)", () => {
  let userToken: string;
  let operatorToken: string;
  let adminToken: string;

  const testUser = {
    name: "Test User",
    email: "testuser@example.com",
    password: "password123",
    role: "user",
  };

  const testOperator = {
    name: "Test Operator",
    email: "testoperator@example.com",
    password: "password123",
    role: "operator",
    company: "Test Company",
  };

  const testAdmin = {
    name: "Test Admin",
    email: "testadmin@example.com",
    password: "admin123456",
    role: "admin",
    company: "Admin Company",
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
        $in: [testUser.email, testOperator.email, testAdmin.email],
      },
    });
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await User.deleteMany({
      email: {
        $in: [testUser.email, testOperator.email, testAdmin.email],
      },
    });
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user with default role", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: testUser.name,
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201);

      expect(response.body.status).toBe("success");
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.role).toBe("user");
      expect(response.body.data.user.password).toBeUndefined();
    });

    it("should register an operator with company", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(testOperator)
        .expect(201);

      expect(response.body.status).toBe("success");
      expect(response.body.data.user.role).toBe("operator");
      expect(response.body.data.user.company).toBe(testOperator.company);
    });

    it("should reject operator registration without company", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Operator",
          email: "op@test.com",
          password: "password123",
          role: "operator",
        })
        .expect(400);

      expect(response.body.status).toBe("fail");
      expect(response.body.message).toBe(
        "Company name is required for operator registration",
      );
    });

    it("should reject admin registration without existing admin auth", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(testAdmin)
        .expect(403);

      expect(response.body.status).toBe("fail");
      expect(response.body.message).toBe(
        "Admin accounts can only be created by existing admins",
      );
    });

    it("should reject registration with missing fields", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({ email: "test@example.com" })
        .expect(400);

      expect(response.body.status).toBe("fail");
    });

    it("should reject duplicate email", async () => {
      // First registration
      await request(app).post("/api/v1/auth/register").send(testOperator);

      // Duplicate registration
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(testOperator)
        .expect(409);

      expect(response.body.status).toBe("fail");
      expect(response.body.message).toBe("Email already registered");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/v1/auth/register").send(testOperator);
    });

    it("should login with valid credentials", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testOperator.email,
          password: testOperator.password,
        })
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.role).toBe("operator");
      operatorToken = response.body.data.token;
    });

    it("should reject invalid password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testOperator.email,
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body.status).toBe("fail");
      expect(response.body.message).toBe("Invalid email or password");
    });

    it("should reject non-existent email", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        })
        .expect(401);

      expect(response.body.status).toBe("fail");
    });

    it("should reject missing credentials", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({})
        .expect(400);

      expect(response.body.status).toBe("fail");
    });
  });

  describe("GET /api/v1/auth/me", () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post("/api/v1/auth/register")
        .send(testOperator);
      operatorToken = registerResponse.body.data.token;
    });

    it("should get current user with valid token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${operatorToken}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.user.email).toBe(testOperator.email);
      expect(response.body.data.user.role).toBe("operator");
    });

    it("should reject request without token", async () => {
      const response = await request(app).get("/api/v1/auth/me").expect(401);

      expect(response.body.status).toBe("fail");
      expect(response.body.message).toBe("Access denied. No token provided.");
    });

    it("should reject invalid token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalidtoken")
        .expect(401);

      expect(response.body.status).toBe("fail");
      expect(response.body.message).toBe("Invalid token.");
    });
  });

  describe("PATCH /api/v1/auth/me", () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post("/api/v1/auth/register")
        .send(testOperator);
      operatorToken = registerResponse.body.data.token;
    });

    it("should update user profile", async () => {
      const response = await request(app)
        .patch("/api/v1/auth/me")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ name: "Updated Name", company: "New Company" })
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.user.name).toBe("Updated Name");
      expect(response.body.data.user.company).toBe("New Company");
    });
  });

  describe("Role-Based Access Control", () => {
    beforeEach(async () => {
      // Create user
      const userResponse = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: testUser.name,
          email: testUser.email,
          password: testUser.password,
        });
      userToken = userResponse.body.data.token;

      // Create operator
      const operatorResponse = await request(app)
        .post("/api/v1/auth/register")
        .send(testOperator);
      operatorToken = operatorResponse.body.data.token;
    });

    it("should reject regular user from creating station", async () => {
      const response = await request(app)
        .post("/api/v1/stations")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "Test Station",
          location: {
            type: "Point",
            coordinates: [77.2195, 28.6315],
          },
          address: "Test Address",
          ports: [
            {
              connectorType: "CCS",
              vehicleType: "car",
              powerKW: 50,
              total: 2,
              pricePerKWh: 15,
            },
          ],
        })
        .expect(403);

      expect(response.body.status).toBe("fail");
      expect(response.body.message).toContain("Access denied");
    });

    it("should allow operator to create station", async () => {
      const response = await request(app)
        .post("/api/v1/stations")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          name: "Operator Station",
          location: {
            type: "Point",
            coordinates: [77.2195, 28.6315],
          },
          address: "Operator Address",
          ports: [
            {
              connectorType: "CCS",
              vehicleType: "car",
              powerKW: 50,
              total: 2,
              pricePerKWh: 15,
            },
          ],
        })
        .expect(201);

      expect(response.body.status).toBe("success");
    });
  });

  describe("User Vehicle Profiles", () => {
    beforeEach(async () => {
      const userResponse = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: testUser.name,
          email: testUser.email,
          password: testUser.password,
        });
      userToken = userResponse.body.data.token;
    });

    it("should add vehicle profile", async () => {
      const response = await request(app)
        .post("/api/v1/auth/vehicle-profiles")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          vehicleType: "car",
          batteryCapacity_kWh: 60,
          efficiency_kWh_per_km: 0.15,
          batteryPercent: 80,
          compatibleConnectors: ["CCS", "Type2"],
        })
        .expect(201);

      expect(response.body.status).toBe("success");
      expect(response.body.data.vehicleProfiles).toHaveLength(1);
    });

    it("should remove vehicle profile", async () => {
      // Add profile first
      const addResponse = await request(app)
        .post("/api/v1/auth/vehicle-profiles")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          vehicleType: "car",
          batteryCapacity_kWh: 60,
          efficiency_kWh_per_km: 0.15,
          batteryPercent: 80,
          compatibleConnectors: ["CCS"],
        });

      const profileId = addResponse.body.data.vehicleProfiles[0]._id;

      // Remove profile by ID
      const response = await request(app)
        .delete(`/api/v1/auth/vehicle-profiles/${profileId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.vehicleProfiles).toHaveLength(0);
    });
  });
});
