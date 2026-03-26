import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import {
  Station,
  RecommendedStation,
  GeoLocation,
  VehicleProfile,
} from "../types";
import apiService, { WS_BASE_URL } from "../services/api";

interface OccupancyChangedPayload {
  stationId: string;
  connectorType: string;
  occupied: number;
  total: number;
  updatedAt: string;
}

interface StationState {
  stations: Station[];
  nearbyStations: Station[];
  recommendations: RecommendedStation[];
  selectedStation: Station | null;
  isLoading: boolean;
  error: string | null;
  socket: Socket | null;

  // Actions
  fetchAllStations: () => Promise<void>;
  fetchNearbyStations: (
    location: GeoLocation,
    maxDistance?: number,
  ) => Promise<void>;
  fetchStation: (id: string) => Promise<Station>;
  getRecommendations: (
    location: GeoLocation,
    vehicleProfile: VehicleProfile,
  ) => Promise<void>;
  setSelectedStation: (station: Station | null) => void;
  clearError: () => void;
  clearRecommendations: () => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}

export const useStationStore = create<StationState>((set, get) => ({
  stations: [],
  nearbyStations: [],
  recommendations: [],
  selectedStation: null,
  isLoading: false,
  error: null,
  socket: null,

  connectWebSocket: () => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(WS_BASE_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      console.log("[WS] Connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[WS] Disconnected:", reason);
    });

    socket.on(
      "station_occupancy_changed",
      (payload: OccupancyChangedPayload) => {
        const { stationId, connectorType, occupied, total } = payload;

        // Update nearbyStations
        set((state) => ({
          nearbyStations: state.nearbyStations.map((s) => {
            if (s._id !== stationId) return s;
            return {
              ...s,
              ports: s.ports.map((p) =>
                p.connectorType === connectorType
                  ? { ...p, occupied, total }
                  : p,
              ),
            };
          }),
          // Update stations list
          stations: state.stations.map((s) => {
            if (s._id !== stationId) return s;
            return {
              ...s,
              ports: s.ports.map((p) =>
                p.connectorType === connectorType
                  ? { ...p, occupied, total }
                  : p,
              ),
            };
          }),
          // Update selectedStation if it matches
          selectedStation:
            state.selectedStation?._id === stationId
              ? {
                  ...state.selectedStation,
                  ports: state.selectedStation.ports.map((p) =>
                    p.connectorType === connectorType
                      ? { ...p, occupied, total }
                      : p,
                  ),
                }
              : state.selectedStation,
        }));
      },
    );

    set({ socket });
  },

  disconnectWebSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  fetchAllStations: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.getAllStations();
      set({ stations: response.data.stations, isLoading: false });
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to fetch stations";
      set({ error: message, isLoading: false });
    }
  },

  fetchNearbyStations: async (
    location: GeoLocation,
    maxDistance: number = 50000,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.getNearbyStations(
        location.longitude,
        location.latitude,
        maxDistance,
      );
      set({ nearbyStations: response.data.stations, isLoading: false });
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to fetch nearby stations";
      set({ error: message, isLoading: false });
    }
  },

  fetchStation: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.getStation(id);
      const station = response.data.station;
      set({ selectedStation: station, isLoading: false });
      return station;
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to fetch station";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  getRecommendations: async (
    location: GeoLocation,
    vehicleProfile: VehicleProfile,
  ) => {
    set({ isLoading: true, error: null, recommendations: [] });
    try {
      const response = await apiService.getRecommendations({
        currentLocation: location,
        vehicleProfile,
      });
      set({ recommendations: response.data.recommendations, isLoading: false });
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to get recommendations";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  setSelectedStation: (station: Station | null) => {
    set({ selectedStation: station });
  },

  clearError: () => set({ error: null }),

  clearRecommendations: () => set({ recommendations: [] }),
}));
