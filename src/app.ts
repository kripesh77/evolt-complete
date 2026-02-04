import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { stationRouter } from "./routes/station.routes.js";
import { recommendationRouter } from "./routes/recommendation.routes.js";
import authRouter from "./routes/authenticatedRoute.js";

export const app = express();

// Body parser middleware
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "EV Charging Station API is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/stations", stationRouter);
app.use("/api/v1/recommendations", recommendationRouter);

// Handle undefined routes (Express 5 uses different syntax)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: `Cannot find ${req.originalUrl} on this server`,
  });
});

// Global error handling middleware
interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";

  // Log error for debugging
  console.error("Error:", err);

  // MongoDB duplicate key error
  if ((err as unknown as { code?: number }).code === 11000) {
    res.status(400).json({
      status: "error",
      message: "Duplicate field value entered",
    });
    return;
  }

  // MongoDB validation error
  if (err.name === "ValidationError") {
    res.status(400).json({
      status: "error",
      message: err.message,
    });
    return;
  }

  // MongoDB CastError (invalid ObjectId)
  if (err.name === "CastError") {
    res.status(400).json({
      status: "error",
      message: "Invalid ID format",
    });
    return;
  }

  // Default error response
  res.status(statusCode).json({
    status,
    message: err.message || "Something went wrong",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});
