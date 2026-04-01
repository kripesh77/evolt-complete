/**
 * Unit tests for WebSocket broadcast logic in station.controller.ts
 * Tests that the correct Socket.io events are emitted when occupancy changes.
 */
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock dependencies BEFORE importing the controller (ESM-compatible)
const mockFindById = jest.fn();
const mockUpdateOccupancy = jest.fn();
const mockBulkUpdateOccupancy = jest.fn();
const mockPublish = jest.fn();
const mockCreateEvent = jest.fn((_type: string, data: unknown) => ({ data }));

jest.unstable_mockModule("../../src/models/Station", () => ({
  default: { findById: mockFindById },
}));

jest.unstable_mockModule("../../src/services/status.service", () => ({
  StatusService: {
    updateOccupancy: mockUpdateOccupancy,
    bulkUpdateOccupancy: mockBulkUpdateOccupancy,
  },
}));

jest.unstable_mockModule("../../src/events/index", () => ({
  eventBus: { publish: mockPublish, subscribe: jest.fn() },
  createEvent: mockCreateEvent,
}));

// Dynamic import AFTER mocking
const { StationController } =
  await import("../../src/controllers/station.controller");

function createMockReqResNext(overrides: {
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  user?: { id: string; role: string } | null;
  ioEmit?: jest.Mock;
}) {
  const ioEmit = overrides.ioEmit || jest.fn();

  const req: any = {
    params: overrides.params || {},
    body: overrides.body || {},
    user: overrides.user ?? null,
    app: {
      get: jest.fn((key: string) => {
        if (key === "io") return { emit: ioEmit };
        return undefined;
      }),
    },
  };

  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  const next = jest.fn();

  return { req, res, next, ioEmit };
}

describe("StationController WebSocket Broadcasts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("updateOccupancy", () => {
    it("should emit station_occupancy_changed event on PATCH occupancy", async () => {
      const stationId = "station123";
      const connectorType = "CCS";
      const occupied = 3;
      const total = 5;

      mockFindById.mockResolvedValue({
        _id: stationId,
        operatorId: { toString: () => "operator1" },
        ports: [{ connectorType: "CCS", total: 5, occupied: 2 }],
      });

      mockUpdateOccupancy.mockResolvedValue({
        _id: stationId,
        ports: [{ connectorType: "CCS", total: 5, occupied: 3 }],
      });

      const { req, res, next, ioEmit } = createMockReqResNext({
        params: { id: stationId },
        body: { connectorType, occupied },
        user: { id: "operator1", role: "operator" },
      });

      await StationController.updateOccupancy(req, res, next);

      expect(ioEmit).toHaveBeenCalledTimes(1);
      expect(ioEmit).toHaveBeenCalledWith(
        "station_occupancy_changed",
        expect.objectContaining({
          stationId,
          connectorType,
          occupied,
          total,
          updatedAt: expect.any(String),
        }),
      );

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should NOT emit WebSocket event when io is not available", async () => {
      const stationId = "station123";

      mockFindById.mockResolvedValue({
        _id: stationId,
        operatorId: { toString: () => "operator1" },
        ports: [{ connectorType: "CCS", total: 5, occupied: 2 }],
      });

      mockUpdateOccupancy.mockResolvedValue({
        _id: stationId,
        ports: [{ connectorType: "CCS", total: 5, occupied: 3 }],
      });

      const req: any = {
        params: { id: stationId },
        body: { connectorType: "CCS", occupied: 3 },
        user: { id: "operator1", role: "operator" },
        app: {
          get: jest.fn(() => null),
        },
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      await StationController.updateOccupancy(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 401 when user is not authenticated", async () => {
      const { req, res, next } = createMockReqResNext({
        params: { id: "station123" },
        body: { connectorType: "CCS", occupied: 3 },
        user: null,
      });

      await StationController.updateOccupancy(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return 404 when station is not found", async () => {
      mockFindById.mockResolvedValue(null);

      const { req, res, next } = createMockReqResNext({
        params: { id: "nonexistent" },
        body: { connectorType: "CCS", occupied: 3 },
        user: { id: "operator1", role: "operator" },
      });

      await StationController.updateOccupancy(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 403 when user is not the station owner", async () => {
      mockFindById.mockResolvedValue({
        _id: "station123",
        operatorId: { toString: () => "differentOperator" },
        ports: [{ connectorType: "CCS", total: 5, occupied: 2 }],
      });

      const { req, res, next } = createMockReqResNext({
        params: { id: "station123" },
        body: { connectorType: "CCS", occupied: 3 },
        user: { id: "operator1", role: "operator" },
      });

      await StationController.updateOccupancy(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("should return 400 when connectorType or occupied is missing", async () => {
      mockFindById.mockResolvedValue({
        _id: "station123",
        operatorId: { toString: () => "operator1" },
        ports: [{ connectorType: "CCS", total: 5, occupied: 2 }],
      });

      const { req, res, next } = createMockReqResNext({
        params: { id: "station123" },
        body: {},
        user: { id: "operator1", role: "operator" },
      });

      await StationController.updateOccupancy(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("bulkUpdateOccupancy", () => {
    it("should emit station_occupancy_changed for each port in bulk update", async () => {
      const stationId = "station456";

      mockFindById.mockResolvedValue({
        _id: stationId,
        operatorId: { toString: () => "operator1" },
        ports: [
          { connectorType: "CCS", total: 5, occupied: 2 },
          { connectorType: "Type2", total: 3, occupied: 1 },
        ],
      });

      mockBulkUpdateOccupancy.mockResolvedValue({
        _id: stationId,
        ports: [
          { connectorType: "CCS", total: 5, occupied: 4 },
          { connectorType: "Type2", total: 3, occupied: 3 },
        ],
      });

      const updates = [
        { connectorType: "CCS", occupied: 4 },
        { connectorType: "Type2", occupied: 3 },
      ];

      const { req, res, next, ioEmit } = createMockReqResNext({
        params: { id: stationId },
        body: updates as any,
        user: { id: "operator1", role: "operator" },
      });

      await StationController.bulkUpdateOccupancy(req, res, next);

      expect(ioEmit).toHaveBeenCalledTimes(2);

      expect(ioEmit).toHaveBeenCalledWith(
        "station_occupancy_changed",
        expect.objectContaining({
          stationId,
          connectorType: "CCS",
          occupied: 4,
          total: 5,
        }),
      );

      expect(ioEmit).toHaveBeenCalledWith(
        "station_occupancy_changed",
        expect.objectContaining({
          stationId,
          connectorType: "Type2",
          occupied: 3,
          total: 3,
        }),
      );

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 400 when updates array is empty", async () => {
      mockFindById.mockResolvedValue({
        _id: "station456",
        operatorId: { toString: () => "operator1" },
        ports: [],
      });

      const { req, res, next } = createMockReqResNext({
        params: { id: "station456" },
        body: [] as any,
        user: { id: "operator1", role: "operator" },
      });

      await StationController.bulkUpdateOccupancy(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 401 when not authenticated", async () => {
      const { req, res, next } = createMockReqResNext({
        params: { id: "station456" },
        body: [{ connectorType: "CCS", occupied: 4 }] as any,
        user: null,
      });

      await StationController.bulkUpdateOccupancy(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
