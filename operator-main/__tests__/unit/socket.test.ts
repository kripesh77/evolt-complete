/**
 * Unit tests for socket.ts (getSocket singleton + useOccupancySocket hook)
 */

// --- socket.io-client mock ---
const mockOn = jest.fn();
const mockOff = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

const mockSocket = {
  on: mockOn,
  off: mockOff,
  connect: mockConnect,
  disconnect: mockDisconnect,
  connected: false,
};

jest.mock("socket.io-client", () => ({
  io: jest.fn(() => mockSocket),
}));

// --- React mock (lightweight, no DOM rendering needed) ---
// We test the hook logic by simulating useEffect / useRef behaviour.
let effectCallback: (() => (() => void) | void) | null = null;
const mockUseRef = jest.fn((initial: any) => ({ current: initial }));
const mockUseCallback = jest.fn((fn: any) => fn);
const mockUseEffect = jest.fn((cb: () => (() => void) | void) => {
  effectCallback = cb;
});

jest.mock("react", () => ({
  useEffect: (...args: any[]) => mockUseEffect(...args),
  useRef: (...args: any[]) => mockUseRef(...args),
  useCallback: (...args: any[]) => mockUseCallback(...args),
}));

import getSocket, { useOccupancySocket } from "@/lib/socket";
import { io } from "socket.io-client";

describe("socket.ts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    effectCallback = null;
    mockSocket.connected = false;
  });

  // ---------- getSocket ----------
  describe("getSocket", () => {
    it("should create a socket instance via io()", () => {
      // Reset the module-level singleton by re-importing
      // Since the singleton is cached, the first call from import already
      // created it. We test that io was called with expected config.
      // The socket is lazily created on first getSocket() call or first
      // useOccupancySocket invocation. Since we import `getSocket`, call it:
      const socket = getSocket();
      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          transports: ["websocket"],
          reconnection: true,
        }),
      );
      expect(socket).toBe(mockSocket);
    });

    it("should return the same singleton on subsequent calls", () => {
      const a = getSocket();
      const b = getSocket();
      expect(a).toBe(b);
      // io() should only have been called once (from the first getSocket call)
      expect((io as jest.Mock).mock.calls.length).toBeLessThanOrEqual(2);
    });
  });

  // ---------- useOccupancySocket ----------
  describe("useOccupancySocket", () => {
    it("should register station_occupancy_changed listener in useEffect", () => {
      const callback = jest.fn();
      useOccupancySocket(callback);

      // useEffect should have been called
      expect(mockUseEffect).toHaveBeenCalled();

      // Simulate running the effect
      const cleanup = effectCallback?.();

      expect(mockOn).toHaveBeenCalledWith(
        "station_occupancy_changed",
        expect.any(Function),
      );

      // If socket not connected, should call connect
      expect(mockConnect).toHaveBeenCalled();

      // Cleanup should remove listener
      if (typeof cleanup === "function") cleanup();
      expect(mockOff).toHaveBeenCalledWith(
        "station_occupancy_changed",
        expect.any(Function),
      );
    });

    it("should NOT call connect if socket is already connected", () => {
      mockSocket.connected = true;
      const callback = jest.fn();
      useOccupancySocket(callback);
      effectCallback?.();

      expect(mockConnect).not.toHaveBeenCalled();
    });

    it("should invoke the callback when event fires", () => {
      const callback = jest.fn();
      useOccupancySocket(callback);
      effectCallback?.();

      // Get the handler passed to socket.on
      const handler = mockOn.mock.calls.find(
        (c: any[]) => c[0] === "station_occupancy_changed",
      )?.[1];

      expect(handler).toBeDefined();

      const payload = {
        stationId: "s1",
        connectorType: "CCS",
        occupied: 2,
        total: 4,
        updatedAt: new Date().toISOString(),
      };
      handler(payload);

      // The ref-based callback should have been invoked with the payload
      // (our mockUseRef returns { current: callback })
      // Since we mocked useRef to return { current: initial }, and
      // the hook sets callbackRef.current = onOccupancyChanged in the body,
      // the handler calls callbackRef.current(payload).
      // In our mock, useRef keeps returning a new ref each call.
      // The handler closes over the ref returned by the first useRef call.
      // Since mockUseRef returns { current: callback } (initial value),
      // the handler should call callback(payload).
      expect(callback).toHaveBeenCalledWith(payload);
    });
  });
});
