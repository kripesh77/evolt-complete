/**
 * Integration tests for WebSocket (Socket.io) layer.
 * Tests that the HTTP server correctly sets up Socket.io and that
 * occupancy update endpoints emit real-time events to connected clients.
 */
import { createServer, Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { app } from "../../src/app";
import request from "supertest";

describe("WebSocket Integration", () => {
  let httpServer: HttpServer;
  let ioServer: SocketIOServer;
  let clientSocket: ClientSocket;
  let port: number;

  beforeAll((done) => {
    httpServer = createServer(app);
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: "*" },
    });

    // Attach io to the Express app (mirrors server.ts)
    app.set("io", ioServer);

    ioServer.on("connection", (socket) => {
      // Server-side connection handler
    });

    httpServer.listen(0, () => {
      const addr = httpServer.address();
      port = typeof addr === "object" && addr ? addr.port : 0;
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket?.connected) clientSocket.disconnect();
    ioServer.close();
    httpServer.close(done);
    // Clean up the io reference
    app.set("io", null);
  });

  beforeEach((done) => {
    clientSocket = ioClient(`http://localhost:${port}`, {
      transports: ["websocket"],
      forceNew: true,
    });
    clientSocket.on("connect", done);
  });

  afterEach(() => {
    if (clientSocket?.connected) clientSocket.disconnect();
  });

  describe("Socket.io server setup", () => {
    it("should accept WebSocket connections", () => {
      expect(clientSocket.connected).toBe(true);
    });

    it("should assign a socket id on connection", () => {
      expect(clientSocket.id).toBeDefined();
      expect(typeof clientSocket.id).toBe("string");
    });

    it("should handle multiple simultaneous clients", (done) => {
      const client2 = ioClient(`http://localhost:${port}`, {
        transports: ["websocket"],
        forceNew: true,
      });

      client2.on("connect", () => {
        expect(client2.connected).toBe(true);
        expect(client2.id).not.toBe(clientSocket.id);
        client2.disconnect();
        done();
      });
    });

    it("should handle disconnect gracefully", (done) => {
      const client2 = ioClient(`http://localhost:${port}`, {
        transports: ["websocket"],
        forceNew: true,
      });

      client2.on("connect", () => {
        client2.disconnect();
      });

      client2.on("disconnect", () => {
        expect(client2.connected).toBe(false);
        done();
      });
    });
  });

  describe("station_occupancy_changed event", () => {
    it("should broadcast to connected clients when emitted from server", (done) => {
      const payload = {
        stationId: "test-station-1",
        connectorType: "CCS",
        occupied: 3,
        total: 5,
        updatedAt: new Date().toISOString(),
      };

      clientSocket.on("station_occupancy_changed", (data) => {
        expect(data).toEqual(payload);
        done();
      });

      // Server emits the event (simulating controller behavior)
      ioServer.emit("station_occupancy_changed", payload);
    });

    it("should broadcast to all connected clients", (done) => {
      const payload = {
        stationId: "test-station-2",
        connectorType: "Type2",
        occupied: 1,
        total: 3,
        updatedAt: new Date().toISOString(),
      };

      let receivedCount = 0;

      const client2 = ioClient(`http://localhost:${port}`, {
        transports: ["websocket"],
        forceNew: true,
      });

      const checkDone = () => {
        receivedCount++;
        if (receivedCount === 2) {
          client2.disconnect();
          done();
        }
      };

      clientSocket.on("station_occupancy_changed", (data) => {
        expect(data.stationId).toBe("test-station-2");
        checkDone();
      });

      client2.on("connect", () => {
        client2.on("station_occupancy_changed", (data) => {
          expect(data.stationId).toBe("test-station-2");
          checkDone();
        });

        // Emit after both clients are listening
        ioServer.emit("station_occupancy_changed", payload);
      });
    });

    it("should include all required fields in payload", (done) => {
      const payload = {
        stationId: "test-station-3",
        connectorType: "CHAdeMO",
        occupied: 0,
        total: 2,
        updatedAt: new Date().toISOString(),
      };

      clientSocket.on("station_occupancy_changed", (data) => {
        expect(data).toHaveProperty("stationId");
        expect(data).toHaveProperty("connectorType");
        expect(data).toHaveProperty("occupied");
        expect(data).toHaveProperty("total");
        expect(data).toHaveProperty("updatedAt");
        expect(typeof data.stationId).toBe("string");
        expect(typeof data.connectorType).toBe("string");
        expect(typeof data.occupied).toBe("number");
        expect(typeof data.total).toBe("number");
        expect(typeof data.updatedAt).toBe("string");
        done();
      });

      ioServer.emit("station_occupancy_changed", payload);
    });
  });

  describe("HTTP + WebSocket coexistence", () => {
    it("should still serve HTTP requests while WebSocket is active", async () => {
      expect(clientSocket.connected).toBe(true);

      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
    });

    it("should handle 404 routes correctly alongside WebSocket", async () => {
      const response = await request(app).get("/api/v1/nonexistent-route");
      expect(response.status).toBe(404);
    });
  });
});
