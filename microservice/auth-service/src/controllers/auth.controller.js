/**
 * ============================================================================
 * AUTH CONTROLLER - Handles authentication logic
 * ============================================================================
 *
 * LEARNING POINT: Controller Layer
 *
 * Controllers handle HTTP request/response logic:
 * 1. Receive request from route
 * 2. Validate input
 * 3. Call model/service methods
 * 4. Format and send response
 *
 * They should NOT contain business logic (that goes in services/models).
 *
 * ============================================================================
 */

const User = require("../models/User");
const jwt = require("jsonwebtoken");
const {
  JWT_CONFIG,
  USER_ROLES,
  EVENT_TYPES,
} = require("../../../shared/constants");
const { eventBus } = require("../../../shared/event-bus");

/**
 * Register a new user
 * POST /api/v1/auth/register
 *
 * Body: { name, email, password, role?, company?, phone? }
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, company, phone } = req.body;

    // ========================================
    // VALIDATION
    // ========================================

    if (!name || !email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Name, email, and password are required",
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        status: "fail",
        message: "Password must be at least 8 characters",
      });
    }

    // Validate role
    const userRole = role || USER_ROLES.USER;
    if (!Object.values(USER_ROLES).includes(userRole)) {
      return res.status(400).json({
        status: "fail",
        message: `Invalid role. Must be: ${Object.values(USER_ROLES).join(", ")}`,
      });
    }

    // Operators must provide company name
    if (userRole === USER_ROLES.OPERATOR && !company) {
      return res.status(400).json({
        status: "fail",
        message: "Company name is required for operator registration",
      });
    }

    // Prevent admin registration through API (security measure)
    if (userRole === USER_ROLES.ADMIN) {
      return res.status(403).json({
        status: "fail",
        message: "Admin accounts cannot be created through API",
      });
    }

    // ========================================
    // CHECK FOR EXISTING USER
    // ========================================

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        status: "fail",
        message: "Email already registered",
      });
    }

    // ========================================
    // CREATE USER
    // ========================================

    const user = await User.create({
      name,
      email,
      password, // Will be hashed by pre-save middleware
      role: userRole,
      company: userRole === USER_ROLES.OPERATOR ? company : undefined,
      phone,
    });

    // Generate JWT token
    const token = user.generateAuthToken();

    // ========================================
    // PUBLISH EVENT
    // ========================================

    /**
     * LEARNING POINT: Event Publishing
     *
     * After registration, we publish a 'user.registered' event.
     * Other services (like User Service) can subscribe to this event
     * to perform additional actions (like creating a user profile).
     *
     * This is loose coupling - Auth Service doesn't need to know
     * what other services do with this information.
     */
    eventBus.publish(EVENT_TYPES.USER_REGISTERED, {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      company: user.company,
    });

    // ========================================
    // SEND RESPONSE
    // ========================================

    res.status(201).json({
      status: "success",
      data: {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login a user
 * POST /api/v1/auth/login
 *
 * Body: { email, password }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ========================================
    // VALIDATION
    // ========================================

    if (!email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Email and password are required",
      });
    }

    // ========================================
    // FIND USER (include password for comparison)
    // ========================================

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );

    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid email or password",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        status: "fail",
        message: "Account is deactivated. Please contact support.",
      });
    }

    // ========================================
    // VERIFY PASSWORD
    // ========================================

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid email or password",
      });
    }

    // ========================================
    // UPDATE LAST LOGIN
    // ========================================

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = user.generateAuthToken();

    // ========================================
    // PUBLISH EVENT
    // ========================================

    eventBus.publish(EVENT_TYPES.USER_LOGGED_IN, {
      userId: user._id.toString(),
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    // ========================================
    // SEND RESPONSE
    // ========================================

    res.status(200).json({
      status: "success",
      data: {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify JWT token
 * GET /api/v1/auth/verify
 *
 * Headers: Authorization: Bearer <token>
 *
 * LEARNING POINT: Token Verification
 *
 * This endpoint is used by:
 * 1. API Gateway to verify tokens on protected routes
 * 2. Other services to verify user identity
 * 3. Frontend to check if token is still valid
 *
 * It decodes the JWT and returns the user info embedded in it.
 */
const verify = async (req, res, next) => {
  try {
    // ========================================
    // EXTRACT TOKEN
    // ========================================

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "fail",
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    // ========================================
    // VERIFY TOKEN
    // ========================================

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_CONFIG.SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          status: "fail",
          message: "Token has expired. Please log in again.",
          code: "TOKEN_EXPIRED",
        });
      }
      if (err.name === "JsonWebTokenError") {
        return res.status(401).json({
          status: "fail",
          message: "Invalid token",
          code: "INVALID_TOKEN",
        });
      }
      throw err;
    }

    // ========================================
    // CHECK USER STILL EXISTS AND IS ACTIVE
    // ========================================

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "User no longer exists",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: "fail",
        message: "Account is deactivated",
      });
    }

    // ========================================
    // SEND RESPONSE
    // ========================================

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID (internal service call)
 * GET /api/v1/auth/users/:id
 *
 * This is for other services to fetch user info
 * Protected by service token (not user token)
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  verify,
  getUserById,
};
