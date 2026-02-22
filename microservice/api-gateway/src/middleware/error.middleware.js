/**
 * ============================================================================
 * ERROR HANDLING MIDDLEWARE
 * ============================================================================
 *
 * LEARNING POINT: Centralized Error Handling
 *
 * In microservices, errors can come from:
 * 1. This gateway (validation, rate limiting)
 * 2. Backend services (service errors)
 * 3. Network issues (service unavailable)
 *
 * The gateway should:
 * - Catch all errors
 * - Format them consistently
 * - Log them for debugging
 * - Hide internal details from clients
 *
 * ============================================================================
 */

/**
 * Global error handler middleware
 * This catches all errors thrown in the application
 */
const errorHandler = (err, req, res, next) => {
  // Log the error for debugging
  console.error("❌ [Gateway Error]", {
    message: err.message,
    status: err.status,
    code: err.code,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  // Determine status code
  const statusCode = err.status || err.statusCode || 500;

  // Determine error message
  let message = err.message || "Internal server error";

  // Hide internal errors in production
  if (statusCode === 500 && process.env.NODE_ENV === "production") {
    message = "Something went wrong";
  }

  // Build error response
  const errorResponse = {
    status: "error",
    message,
    code: err.code || "INTERNAL_ERROR",
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
  }

  // Add original error details if from a service
  if (err.serviceError) {
    errorResponse.service = err.serviceName;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Create a standardized error object
 */
const createError = (message, status = 500, code = "INTERNAL_ERROR") => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
};

/**
 * Async handler wrapper
 * Catches errors in async route handlers and passes them to error middleware
 *
 * USAGE:
 * router.get('/route', asyncHandler(async (req, res) => {
 *   // async code here
 * }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  createError,
  asyncHandler,
};
