import { app } from "./app.js";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 SHUTTING DOWN...");
  console.log(err.name, err.message);
  process.exit(1);
});

// Load environment variables
dotenv.config({ path: "./config.env" });

const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port: ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`⚡ EV Charging Station Recommendation API Ready!`);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err: Error) => {
      console.log("UNHANDLED REJECTION! 💥 SHUTTING DOWN...");
      console.log(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("👋 SIGTERM RECEIVED. Shutting down gracefully...");
      server.close(() => {
        console.log("💤 Process terminated!");
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
