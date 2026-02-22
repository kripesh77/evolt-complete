/**
 * ============================================================================
 * USER MODEL - Auth Service
 * ============================================================================
 *
 * LEARNING POINT: Database per Service Pattern
 *
 * In microservices, each service owns its data. The Auth Service only stores:
 * - Credentials (email, password hash)
 * - Role information
 * - Basic identity info needed for tokens
 *
 * The User Service stores:
 * - Full profile information
 * - Vehicle profiles
 * - Favorites
 *
 * This separation:
 * - Allows independent scaling
 * - Improves security (auth data isolated)
 * - Reduces coupling between services
 *
 * ============================================================================
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_CONFIG, USER_ROLES } = require("../../../shared/constants");

/**
 * User Schema - Stores authentication-related data only
 */
const userSchema = new mongoose.Schema(
  {
    // Basic identity
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    // Email (unique identifier)
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email"],
    },

    // Password (hashed)
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never return password in queries by default
    },

    // User role
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },

    // Operator-specific fields
    company: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Last login tracking
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

// ============================================================================
// INDEXES
// ============================================================================

// Note: email already has an index from unique: true
userSchema.index({ role: 1 });

// ============================================================================
// PRE-SAVE MIDDLEWARE - Hash password before saving
// ============================================================================

/**
 * LEARNING POINT: Password Hashing
 *
 * NEVER store plain text passwords!
 * Use bcrypt to hash passwords before storing:
 * 1. Generate a salt (random data)
 * 2. Hash password with salt
 * 3. Store the hash (includes salt)
 *
 * When verifying:
 * 1. Get user's stored hash
 * 2. Hash the provided password with same salt
 * 3. Compare hashes
 */
userSchema.pre("save", async function (next) {
  // Only hash if password was modified
  if (!this.isModified("password")) {
    return next();
  }

  // Generate salt and hash password
  const salt = await bcrypt.genSalt(12); // 12 rounds is a good balance
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Compare provided password with stored hash
 *
 * @param {string} candidatePassword - Password to check
 * @returns {Promise<boolean>} - True if password matches
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Generate JWT token for this user
 *
 * LEARNING POINT: JWT (JSON Web Token)
 *
 * JWT is a compact, self-contained way to transmit user identity.
 * Structure: header.payload.signature
 *
 * Payload contains:
 * - User ID
 * - Email
 * - Role
 * - Expiration time
 *
 * The signature ensures the token hasn't been tampered with.
 *
 * @returns {string} - JWT token
 */
userSchema.methods.generateAuthToken = function () {
  const payload = {
    id: this._id.toString(),
    email: this.email,
    role: this.role,
    name: this.name,
  };

  return jwt.sign(payload, JWT_CONFIG.SECRET, {
    expiresIn: JWT_CONFIG.EXPIRES_IN,
  });
};

/**
 * Check if user is an operator
 */
userSchema.methods.isOperator = function () {
  return this.role === USER_ROLES.OPERATOR;
};

/**
 * Check if user is an admin
 */
userSchema.methods.isAdmin = function () {
  return this.role === USER_ROLES.ADMIN;
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find user by email
 */
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Find all operators
 */
userSchema.statics.findOperators = function () {
  return this.find({ role: USER_ROLES.OPERATOR, isActive: true });
};

// ============================================================================
// TRANSFORM OUTPUT
// ============================================================================

/**
 * Remove sensitive fields from JSON output
 */
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

// ============================================================================
// EXPORT MODEL
// ============================================================================

const User = mongoose.model("User", userSchema);

module.exports = User;
