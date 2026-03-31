import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "../constants";

// Extract base URL without /api/v1
const SOCKET_URL = API_BASE_URL.replace("/api/v1", "");

// Occupancy changed event payload
export interface OccupancyChangedPayload {
  stationId: string;
  connectorType: string;
  occupied: number;
  total: number;
  timestamp: string;
}

// Port info for station details
export interface PortInfo {
  connectorType: string;
  vehicleType: string;
  powerKW: number;
  total: number;
  occupied: number;
  pricePerKWh: number;
}

class SocketService {
  private socket: Socket | null = null;
  private subscribedStations: Set<string> = new Set();
  private occupancyListeners: Map<
    string,
    (payload: OccupancyChangedPayload) => void
  > = new Map();

  /**
   * Connect to the socket server
   */
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("[Socket] Connected to server");
      // Re-subscribe to stations after reconnection
      this.subscribedStations.forEach((stationId) => {
        this.socket?.emit("join-station", stationId);
      });
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message);
    });

    // Listen for occupancy changes
    this.socket.on("occupancy-changed", (payload: OccupancyChangedPayload) => {
      console.log("[Socket] Occupancy changed:", payload);
      // Notify all listeners for this station
      const listener = this.occupancyListeners.get(payload.stationId);
      if (listener) {
        listener(payload);
      }
      // Also notify global listeners (key: "global")
      const globalListener = this.occupancyListeners.get("global");
      if (globalListener) {
        globalListener(payload);
      }
    });

    // Acknowledgment events
    this.socket.on("station-joined", (data: { stationId: string }) => {
      console.log("[Socket] Joined station room:", data.stationId);
    });

    this.socket.on("station-left", (data: { stationId: string }) => {
      console.log("[Socket] Left station room:", data.stationId);
    });
  }

  /**
   * Disconnect from socket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.subscribedStations.clear();
      this.occupancyListeners.clear();
    }
  }

  /**
   * Subscribe to a station's occupancy updates
   */
  subscribeToStation(
    stationId: string,
    onOccupancyChange?: (payload: OccupancyChangedPayload) => void
  ): void {
    if (!this.socket?.connected) {
      this.connect();
    }

    if (!this.subscribedStations.has(stationId)) {
      this.socket?.emit("join-station", stationId);
      this.subscribedStations.add(stationId);
    }

    if (onOccupancyChange) {
      this.occupancyListeners.set(stationId, onOccupancyChange);
    }
  }

  /**
   * Unsubscribe from a station's occupancy updates
   */
  unsubscribeFromStation(stationId: string): void {
    if (this.subscribedStations.has(stationId)) {
      this.socket?.emit("leave-station", stationId);
      this.subscribedStations.delete(stationId);
      this.occupancyListeners.delete(stationId);
    }
  }

  /**
   * Unsubscribe from all stations
   */
  unsubscribeFromAllStations(): void {
    if (this.socket?.connected) {
      this.socket.emit("leave-all-stations");
    }
    this.subscribedStations.clear();
    this.occupancyListeners.clear();
  }

  /**
   * Add a global listener for all occupancy changes
   */
  addGlobalOccupancyListener(
    listener: (payload: OccupancyChangedPayload) => void
  ): void {
    this.occupancyListeners.set("global", listener);
  }

  /**
   * Remove global listener
   */
  removeGlobalOccupancyListener(): void {
    this.occupancyListeners.delete("global");
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get subscribed stations
   */
  getSubscribedStations(): string[] {
    return Array.from(this.subscribedStations);
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
