/**
 * ============================================================================
 * AUTHENTICATION MIDDLEWARE
 * ============================================================================
 *
 * LEARNING POINT: Authentication in Microservices
 *
 * There are different patterns for handling auth in microservices:
 *
 * 1. GATEWAY AUTHENTICATION (what we use):
 *    - Gateway verifies token and forwards user info to services
 *    - Services trust the gateway
 *    - Simpler for services, centralized auth logic
 *
 * 2. TOKEN PASS-THROUGH:
 *    - Gateway just forwards the token
 *    - Each service verifies the token itself
 *    - More secure but duplicated logic
 *
 * 3. HYBRID:
 *    - Gateway does basic verification
 *    - Services can do additional checks
 *
 * We use approach #1 for simplicity in learning.
 *
 * ============================================================================
 */

const axios = require("axios");
const { SERVICE_URLS, HTTP_STATUS } = require("../../../shared/constants");

/**
 * Verify JWT token by calling the Auth Service
 *
 * This middleware:
 * 1. Extracts the token from Authorization header
 * 2. Calls Auth Service to verify it
 * 3. Attaches user info to the request
 * 4. Passes the request to the next handler
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: "error",
        message: "No token provided. Please log in.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token with Auth Service
    const response = await axios.get(
      `${SERVICE_URLS.AUTH_SERVICE}/api/v1/auth/verify`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Request-ID": req.requestId, // Pass request ID for tracing
        },
        timeout: 5000,
      },
    );

    // Attach user info to request
    req.user = response.data.data.user;
    req.token = token;

    // Pass user info to downstream services via headers
    req.headers["x-user-id"] = req.user.id;
    req.headers["x-user-role"] = req.user.role;
    req.headers["x-user-email"] = req.user.email;

    next();
  } catch (error) {
    // Handle auth service errors
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    // Auth service is down
    console.error("❌ [Gateway] Auth service unavailable:", error.message);
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      status: "error",
      message: "Authentication service unavailable. Please try again later.",
    });
  }
};

/**
 * Optional authentication
 * Same as authenticate but doesn't fail if no token
 * Useful for routes that work with or without auth
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // No token, continue without user
    req.user = null;
    return next();
  }

  // Token provided, try to verify
  await authenticate(req, res, next);
};

/**
 * Check if user has required role
 *
 * USAGE:
 * router.post('/admin-only', authenticate, requireRole('admin'), handler);
 * router.post('/operator-or-admin', authenticate, requireRole(['operator', 'admin']), handler);
 */
const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: "error",
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        status: "error",
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      });
    }

    next();
  };
};

/**
 * Operator-only middleware shorthand
 */
const operatorOnly = requireRole(["operator", "admin"]);

/**
 * Admin-only middleware shorthand
 */
const adminOnly = requireRole("admin");

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  operatorOnly,
  adminOnly,
};
