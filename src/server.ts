import dotenv from "dotenv";
// Load environment variables
dotenv.config({ path: "./config.env" });

import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { app } from "./app.js";
import { connectDB } from "./config/db.js";

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 SHUTTING DOWN...");
  console.log(err.name, err.message);
  process.exit(1);
});

const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Create HTTP server and attach Socket.io
    const httpServer = createServer(app);
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      },
    });

    // WebSocket connection handling
    io.on("connection", (socket) => {
      console.log(`🔌 Client connected via WebSocket: ${socket.id}`);

      // Join a station room (for real-time occupancy updates)
      socket.on("join-station", (stationId: string) => {
        if (stationId && typeof stationId === "string") {
          socket.join(`station:${stationId}`);
          console.log(`📡 Socket ${socket.id} joined station room: ${stationId}`);
          
          // Acknowledge the join
          socket.emit("station-joined", { stationId, success: true });
        }
      });

      // Leave a station room
      socket.on("leave-station", (stationId: string) => {
        if (stationId && typeof stationId === "string") {
          socket.leave(`station:${stationId}`);
          console.log(`📡 Socket ${socket.id} left station room: ${stationId}`);
          
          // Acknowledge the leave
          socket.emit("station-left", { stationId, success: true });
        }
      });

      // Leave all station rooms (useful when user cancels navigation)
      socket.on("leave-all-stations", () => {
        const rooms = Array.from(socket.rooms);
        rooms.forEach((room) => {
          if (room.startsWith("station:")) {
            socket.leave(room);
            console.log(`📡 Socket ${socket.id} left room: ${room}`);
          }
        });
        socket.emit("all-stations-left", { success: true });
      });

      socket.on("disconnect", () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });

    // Attach io instance to Express app for controller access
    app.set("io", io);

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port: ${PORT}`);
      console.log(`🔌 WebSocket server initialized`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`⚡ EV Charging Station Recommendation API Ready!`);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err: Error) => {
      console.log("UNHANDLED REJECTION! 💥 SHUTTING DOWN...");
      console.log(err.name, err.message);
      httpServer.close(() => {
        process.exit(1);
      });
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("👋 SIGTERM RECEIVED. Shutting down gracefully...");
      io.close();
      httpServer.close(() => {
        console.log("💤 Process terminated!");
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
