/**
 * Unit tests for stationStore (Zustand store)
 * Tests fetching stations, WebSocket, recommendations
 */
import { useStationStore } from "../../../src/store/stationStore";
import apiService from "../../../src/services/api";
import { io } from "socket.io-client";
import {
  Station,
  GeoLocation,
  VehicleProfile,
  RecommendedStation,
} from "../../../src/types";

jest.mock("../../../src/services/api", () => ({
  __esModule: true,
  default: {
    getAllStations: jest.fn(),
    getNearbyStations: jest.fn(),
    getStation: jest.fn(),
    getRecommendations: jest.fn(),
  },
  WS_BASE_URL: "ws://localhost:3000",
}));

const mockStation: Station = {
  _id: "station-1",
  name: "Test Station",
  location: {
    type: "Point",
    coordinates: [77.209, 28.6139],
  },
  address: "123 Test Street, Delhi",
  ports: [
    {
      connectorType: "CCS",
      vehicleType: "car",
      powerKW: 50,
      total: 4,
      occupied: 1,
      pricePerKWh: 15,
    },
    {
      connectorType: "Type2",
      vehicleType: "car",
      powerKW: 22,
      total: 2,
      occupied: 0,
      pricePerKWh: 12,
    },
  ],
  operatingHours: "24/7",
  status: "active",
};

const mockStation2: Station = {
  _id: "station-2",
  name: "Station Two",
  location: {
    type: "Point",
    coordinates: [77.22, 28.62],
  },
  address: "456 Test Road, Delhi",
  ports: [
    {
      connectorType: "CHAdeMO",
      vehicleType: "car",
      powerKW: 50,
      total: 2,
      occupied: 2,
      pricePerKWh: 18,
    },
  ],
  operatingHours: "6AM-10PM",
  status: "active",
};

const mockRecommendation: RecommendedStation = {
  stationId: "station-1",
  stationName: "Test Station",
  address: "123 Test Street, Delhi",
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
  location: {
    type: "Point",
    coordinates: [77.209, 28.6139],
  },
};

describe("stationStore", () => {
  beforeEach(() => {
    useStationStore.setState({
      stations: [],
      nearbyStations: [],
      recommendations: [],
      selectedStation: null,
      isLoading: false,
      error: null,
      socket: null,
    });
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have correct initial values", () => {
      const state = useStationStore.getState();
      expect(state.stations).toEqual([]);
      expect(state.nearbyStations).toEqual([]);
      expect(state.recommendations).toEqual([]);
      expect(state.selectedStation).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.socket).toBeNull();
    });
  });

  describe("fetchAllStations", () => {
    it("should fetch and set all stations", async () => {
      (apiService.getAllStations as jest.Mock).mockResolvedValue({
        data: { stations: [mockStation, mockStation2] },
      });

      await useStationStore.getState().fetchAllStations();

      const state = useStationStore.getState();
      expect(state.stations).toHaveLength(2);
      expect(state.stations[0]).toEqual(mockStation);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set loading during fetch", async () => {
      let resolveStations: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolveStations = resolve;
      });
      (apiService.getAllStations as jest.Mock).mockReturnValue(promise);

      const fetchPromise = useStationStore.getState().fetchAllStations();
      expect(useStationStore.getState().isLoading).toBe(true);

      resolveStations!({ data: { stations: [] } });
      await fetchPromise;
      expect(useStationStore.getState().isLoading).toBe(false);
    });

    it("should handle fetch error", async () => {
      (apiService.getAllStations as jest.Mock).mockRejectedValue({
        response: { data: { message: "Server error" } },
      });

      await useStationStore.getState().fetchAllStations();

      const state = useStationStore.getState();
      expect(state.stations).toEqual([]);
      expect(state.error).toBe("Server error");
      expect(state.isLoading).toBe(false);
    });

    it("should use fallback error message", async () => {
      (apiService.getAllStations as jest.Mock).mockRejectedValue(
        new Error("Network"),
      );

      await useStationStore.getState().fetchAllStations();
      expect(useStationStore.getState().error).toBe("Failed to fetch stations");
    });
  });

  describe("fetchNearbyStations", () => {
    const location: GeoLocation = { latitude: 28.6139, longitude: 77.209 };

    it("should fetch nearby stations with default distance", async () => {
      (apiService.getNearbyStations as jest.Mock).mockResolvedValue({
        data: { stations: [mockStation] },
      });

      await useStationStore.getState().fetchNearbyStations(location);

      expect(apiService.getNearbyStations).toHaveBeenCalledWith(
        77.209,
        28.6139,
        50000,
      );
      expect(useStationStore.getState().nearbyStations).toHaveLength(1);
    });

    it("should fetch nearby stations with custom distance", async () => {
      (apiService.getNearbyStations as jest.Mock).mockResolvedValue({
        data: { stations: [mockStation, mockStation2] },
      });

      await useStationStore.getState().fetchNearbyStations(location, 30000);

      expect(apiService.getNearbyStations).toHaveBeenCalledWith(
        77.209,
        28.6139,
        30000,
      );
      expect(useStationStore.getState().nearbyStations).toHaveLength(2);
    });

    it("should handle nearby stations error", async () => {
      (apiService.getNearbyStations as jest.Mock).mockRejectedValue({
        response: { data: { message: "Location service unavailable" } },
      });

      await useStationStore.getState().fetchNearbyStations(location);
      expect(useStationStore.getState().error).toBe(
        "Location service unavailable",
      );
    });
  });

  describe("fetchStation", () => {
    it("should fetch a single station by id", async () => {
      (apiService.getStation as jest.Mock).mockResolvedValue({
        data: { station: mockStation },
      });

      const result = await useStationStore.getState().fetchStation("station-1");

      expect(result).toEqual(mockStation);
      expect(useStationStore.getState().selectedStation).toEqual(mockStation);
      expect(useStationStore.getState().isLoading).toBe(false);
    });

    it("should throw on fetch station error", async () => {
      (apiService.getStation as jest.Mock).mockRejectedValue({
        response: { data: { message: "Station not found" } },
      });

      await expect(
        useStationStore.getState().fetchStation("bad-id"),
      ).rejects.toThrow("Station not found");

      expect(useStationStore.getState().error).toBe("Station not found");
    });
  });

  describe("getRecommendations", () => {
    const location: GeoLocation = { latitude: 28.6139, longitude: 77.209 };
    const vehicle: VehicleProfile = {
      vehicleType: "car",
      batteryCapacity_kWh: 60,
      efficiency_kWh_per_km: 0.15,
      batteryPercent: 50,
      compatibleConnectors: ["CCS"],
    };

    it("should get recommendations successfully", async () => {
      (apiService.getRecommendations as jest.Mock).mockResolvedValue({
        data: { recommendations: [mockRecommendation] },
      });

      await useStationStore.getState().getRecommendations(location, vehicle);

      const state = useStationStore.getState();
      expect(state.recommendations).toHaveLength(1);
      expect(state.recommendations[0]!.stationName).toBe("Test Station");
      expect(state.isLoading).toBe(false);
    });

    it("should clear previous recommendations before fetching", async () => {
      useStationStore.setState({ recommendations: [mockRecommendation] });

      (apiService.getRecommendations as jest.Mock).mockResolvedValue({
        data: { recommendations: [] },
      });

      await useStationStore.getState().getRecommendations(location, vehicle);
      expect(useStationStore.getState().recommendations).toEqual([]);
    });

    it("should throw on recommendation error", async () => {
      (apiService.getRecommendations as jest.Mock).mockRejectedValue({
        response: { data: { message: "No stations found" } },
      });

      await expect(
        useStationStore.getState().getRecommendations(location, vehicle),
      ).rejects.toThrow("No stations found");
    });
  });

  describe("setSelectedStation", () => {
    it("should set selected station", () => {
      useStationStore.getState().setSelectedStation(mockStation);
      expect(useStationStore.getState().selectedStation).toEqual(mockStation);
    });

    it("should clear selected station with null", () => {
      useStationStore.setState({ selectedStation: mockStation });
      useStationStore.getState().setSelectedStation(null);
      expect(useStationStore.getState().selectedStation).toBeNull();
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      useStationStore.setState({ error: "Some error" });
      useStationStore.getState().clearError();
      expect(useStationStore.getState().error).toBeNull();
    });
  });

  describe("clearRecommendations", () => {
    it("should clear recommendations array", () => {
      useStationStore.setState({ recommendations: [mockRecommendation] });
      useStationStore.getState().clearRecommendations();
      expect(useStationStore.getState().recommendations).toEqual([]);
    });
  });

  describe("connectWebSocket", () => {
    it("should create a socket connection", () => {
      useStationStore.getState().connectWebSocket();

      expect(io).toHaveBeenCalledWith("ws://localhost:3000", {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      expect(useStationStore.getState().socket).not.toBeNull();
    });

    it("should not create duplicate connections", () => {
      const mockSocket = { connected: true, on: jest.fn() };
      useStationStore.setState({ socket: mockSocket as any });

      useStationStore.getState().connectWebSocket();

      // io should not be called again
      expect(io).not.toHaveBeenCalled();
    });
  });

  describe("disconnectWebSocket", () => {
    it("should disconnect and null the socket", () => {
      const mockDisconnect = jest.fn();
      useStationStore.setState({
        socket: { disconnect: mockDisconnect } as any,
      });

      useStationStore.getState().disconnectWebSocket();

      expect(mockDisconnect).toHaveBeenCalled();
      expect(useStationStore.getState().socket).toBeNull();
    });

    it("should handle disconnect when no socket exists", () => {
      useStationStore.setState({ socket: null });
      // Should not throw
      expect(() =>
        useStationStore.getState().disconnectWebSocket(),
      ).not.toThrow();
    });
  });
});
