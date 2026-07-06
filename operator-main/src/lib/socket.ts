"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

// WebSocket URL - base URL without /api/v1
const WS_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
  "http://localhost:3000";

export interface OccupancyChangedPayload {
  stationId: string;
  connectorType: string;
  occupied: number;
  total: number;
  updatedAt: string;
}

let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(WS_BASE_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  }
  return socketInstance;
}

/**
 * Join a specific station room (for operators editing a station)
 */
export function joinStationRoom(stationId: string): void {
  const socket = getSocket();
  if (socket.connected) {
    socket.emit("join-station", stationId);
    console.log(`[Socket] Operator joined station room: ${stationId}`);
  }
}

/**
 * Leave a specific station room
 */
export function leaveStationRoom(stationId: string): void {
  const socket = getSocket();
  if (socket.connected) {
    socket.emit("leave-station", stationId);
    console.log(`[Socket] Operator left station room: ${stationId}`);
  }
}

/**
 * React hook for subscribing to real-time occupancy changes.
 * Calls `onOccupancyChanged` whenever the backend broadcasts
 * a `station_occupancy_changed` event.
 */
export function useOccupancySocket(
  onOccupancyChanged: (payload: OccupancyChangedPayload) => void,
) {
  const callbackRef = useRef(onOccupancyChanged);
  callbackRef.current = onOccupancyChanged;

  useEffect(() => {
    const socket = getSocket();

    const handler = (payload: OccupancyChangedPayload) => {
      callbackRef.current(payload);
    };

    socket.on("station_occupancy_changed", handler);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("station_occupancy_changed", handler);
    };
  }, []);
}

/**
 * React hook for joining/leaving a station room when editing
 * Use this hook in the station edit/details page
 */
export function useStationRoom(stationId: string | null) {
  useEffect(() => {
    if (!stationId) return;

    // Join station room on mount
    joinStationRoom(stationId);

    // Leave station room on unmount
    return () => {
      leaveStationRoom(stationId);
    };
  }, [stationId]);
}

export default getSocket;
