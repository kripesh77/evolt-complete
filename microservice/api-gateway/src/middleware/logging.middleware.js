/**
 * ============================================================================
 * LOGGING MIDDLEWARE
 * ============================================================================
 *
 * LEARNING POINT: Observability in Microservices
 *
 * In a distributed system, logging is CRITICAL for:
 * 1. Debugging issues across services
 * 2. Tracking request flow
 * 3. Performance monitoring
 * 4. Security auditing
 *
 * Best practices:
 * - Add request IDs to trace requests across services
 * - Log entry and exit of gateway
 * - Include relevant context (user, path, method)
 * - Structured logging (JSON format)
 *
 * ============================================================================
 */

const crypto = require("crypto");

/**
 * Generate a unique request ID
 * This ID is passed to all services to trace the request
 */
const generateRequestId = () => {
  return `req_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
};

/**
 * Request logger middleware
 * Logs incoming requests and adds request ID for tracing
 */
const requestLogger = (req, res, next) => {
  // Generate and attach request ID
  const requestId = req.headers["x-request-id"] || generateRequestId();
  req.requestId = requestId;

  // Add request ID to response headers (for client debugging)
  res.setHeader("X-Request-ID", requestId);

  // Record start time
  const startTime = Date.now();

  // Log request entry
  const logEntry = {
    type: "REQUEST",
    requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers["user-agent"],
    timestamp: new Date().toISOString(),
  };

  console.log(`📥 [Gateway] ${req.method} ${req.originalUrl}`, {
    requestId,
    ip: logEntry.ip,
  });

  // Hook into response finish to log completion
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const statusEmoji = res.statusCode < 400 ? "✅" : "❌";

    console.log(
      `${statusEmoji} [Gateway] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`,
      {
        requestId,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      },
    );
  });

  next();
};

/**
 * Create a logger for services
 */
const createLogger = (serviceName) => {
  return {
    info: (message, data = {}) => {
      console.log(`ℹ️ [${serviceName}] ${message}`, data);
    },
    warn: (message, data = {}) => {
      console.warn(`⚠️ [${serviceName}] ${message}`, data);
    },
    error: (message, data = {}) => {
      console.error(`❌ [${serviceName}] ${message}`, data);
    },
    debug: (message, data = {}) => {
      if (process.env.NODE_ENV === "development") {
        console.log(`🔍 [${serviceName}] ${message}`, data);
      }
    },
  };
};

module.exports = {
  requestLogger,
  generateRequestId,
  createLogger,
};
