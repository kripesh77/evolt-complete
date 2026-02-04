import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import User from "../models/user.js";
import type { AuthResponse, UserRole } from "../types/vehicle.js";

/**
 * Register a new user (user, operator, or admin)
 * POST /api/v1/auth/register
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, email, password, role, company, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      res.status(400).json({
        status: "fail",
        message: "Name, email, and password are required",
      });
      return;
    }

    // Validate role (default to 'user' if not provided)
    const userRole: UserRole = role || "user";
    const validRoles: UserRole[] = ["user", "operator", "admin"];

    if (!validRoles.includes(userRole)) {
      res.status(400).json({
        status: "fail",
        message: "Invalid role. Must be user, operator, or admin",
      });
      return;
    }

    // Prevent admin registration through API (should be done by existing admin)
    if (userRole === "admin" && (!req.user || req.user.role !== "admin")) {
      res.status(403).json({
        status: "fail",
        message: "Admin accounts can only be created by existing admins",
      });
      return;
    }

    // Validate operator-specific fields
    if (userRole === "operator" && !company) {
      res.status(400).json({
        status: "fail",
        message: "Company name is required for operator registration",
      });
      return;
    }

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      res.status(409).json({
        status: "fail",
        message: "Email already registered",
      });
      return;
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      company: userRole === "operator" ? company : undefined,
      phone,
    });

    // Generate token
    const token = user.generateAuthToken();

    const response: AuthResponse = {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
      },
    };

    res.status(201).json({
      status: "success",
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login a user
 * POST /api/v1/auth/login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        status: "fail",
        message: "Email and password are required",
      });
      return;
    }

    // Find user by email (include password for comparison)
    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!user) {
      res.status(401).json({
        status: "fail",
        message: "Invalid email or password",
      });
      return;
    }

    // Check if account is active
    if (!user.isActive) {
      res.status(401).json({
        status: "fail",
        message: "Account is deactivated. Please contact support.",
      });
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      res.status(401).json({
        status: "fail",
        message: "Invalid email or password",
      });
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = user.generateAuthToken();

    const response: AuthResponse = {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
      },
    };

    res.status(200).json({
      status: "success",
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: "fail",
        message: "Not authenticated",
      });
      return;
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({
        status: "fail",
        message: "User not found",
      });
      return;
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
          phone: user.phone,
          vehicleProfiles: user.vehicleProfiles,
          favoriteStations: user.favoriteStations,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PATCH /api/v1/auth/me
 */
export const updateMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: "fail",
        message: "Not authenticated",
      });
      return;
    }

    const { name, company, phone } = req.body;

    // Don't allow email or password changes through this endpoint
    const updateData: Record<string, string> = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    // Only operators can update company
    if (req.user.role === "operator" && company !== undefined) {
      updateData.company = company;
    }

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      res.status(404).json({
        status: "fail",
        message: "User not found",
      });
      return;
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
          phone: user.phone,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * PATCH /api/v1/auth/password
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: "fail",
        message: "Not authenticated",
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        status: "fail",
        message: "Current password and new password are required",
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        status: "fail",
        message: "New password must be at least 8 characters",
      });
      return;
    }

    // Get user with password
    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      res.status(404).json({
        status: "fail",
        message: "User not found",
      });
      return;
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      res.status(401).json({
        status: "fail",
        message: "Current password is incorrect",
      });
      return;
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = user.generateAuthToken();

    res.status(200).json({
      status: "success",
      message: "Password changed successfully",
      data: { token },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add vehicle profile (for users)
 * POST /api/v1/auth/vehicle-profiles
 */
export const addVehicleProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: "fail",
        message: "Not authenticated",
      });
      return;
    }

    const {
      vehicleType,
      batteryCapacity_kWh,
      efficiency_kWh_per_km,
      batteryPercent,
      compatibleConnectors,
    } = req.body;

    // Validate required fields
    if (
      !vehicleType ||
      !batteryCapacity_kWh ||
      !efficiency_kWh_per_km ||
      !compatibleConnectors
    ) {
      res.status(400).json({
        status: "fail",
        message: "All vehicle profile fields are required",
      });
      return;
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({
        status: "fail",
        message: "User not found",
      });
      return;
    }

    // Check max profiles limit
    if (user.vehicleProfiles && user.vehicleProfiles.length >= 5) {
      res.status(400).json({
        status: "fail",
        message: "Maximum 5 vehicle profiles allowed",
      });
      return;
    }

    // Add profile
    if (!user.vehicleProfiles) {
      user.vehicleProfiles = [];
    }

    user.vehicleProfiles.push({
      vehicleType,
      batteryCapacity_kWh,
      efficiency_kWh_per_km,
      batteryPercent: batteryPercent || 100,
      compatibleConnectors,
    });

    await user.save();

    res.status(201).json({
      status: "success",
      message: "Vehicle profile added successfully",
      data: {
        vehicleProfiles: user.vehicleProfiles,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove vehicle profile (for users)
 * DELETE /api/v1/auth/vehicle-profiles/:profileId
 */
export const removeVehicleProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: "fail",
        message: "Not authenticated",
      });
      return;
    }

    const { profileId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({
        status: "fail",
        message: "User not found",
      });
      return;
    }

    // Find profile by _id
    const profileIndex = user.vehicleProfiles?.findIndex(
      (profile) => profile._id?.toString() === profileId,
    );

    if (profileIndex === undefined || profileIndex === -1) {
      res.status(404).json({
        status: "fail",
        message: "Vehicle profile not found",
      });
      return;
    }

    user.vehicleProfiles?.splice(profileIndex, 1);
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Vehicle profile removed successfully",
      data: {
        vehicleProfiles: user.vehicleProfiles,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add favorite station (for users)
 * POST /api/v1/auth/favorites/:stationId
 */
export const addFavoriteStation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: "fail",
        message: "Not authenticated",
      });
      return;
    }

    const { stationId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({
        status: "fail",
        message: "User not found",
      });
      return;
    }

    // Check max favorites limit
    if (user.favoriteStations && user.favoriteStations.length >= 20) {
      res.status(400).json({
        status: "fail",
        message: "Maximum 20 favorite stations allowed",
      });
      return;
    }

    // Check if already in favorites
    const stationObjectId = new mongoose.Types.ObjectId(stationId as string);
    if (user.favoriteStations?.some((id) => id.equals(stationObjectId))) {
      res.status(400).json({
        status: "fail",
        message: "Station already in favorites",
      });
      return;
    }

    if (!user.favoriteStations) {
      user.favoriteStations = [];
    }

    user.favoriteStations.push(stationObjectId);
    await user.save();

    res.status(201).json({
      status: "success",
      message: "Station added to favorites",
      data: {
        favoriteStations: user.favoriteStations,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove favorite station (for users)
 * DELETE /api/v1/auth/favorites/:stationId
 */
export const removeFavoriteStation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: "fail",
        message: "Not authenticated",
      });
      return;
    }

    const { stationId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({
        status: "fail",
        message: "User not found",
      });
      return;
    }

    const stationObjectId = new mongoose.Types.ObjectId(stationId as string);
    const index = user.favoriteStations?.findIndex((id) =>
      id.equals(stationObjectId),
    );

    if (index === undefined || index === -1) {
      res.status(400).json({
        status: "fail",
        message: "Station not in favorites",
      });
      return;
    }

    user.favoriteStations?.splice(index, 1);
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Station removed from favorites",
      data: {
        favoriteStations: user.favoriteStations,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users (admin only)
 * GET /api/v1/auth/users
 */
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { role, isActive } = req.query;

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const users = await User.find(filter).select("-password");

    res.status(200).json({
      status: "success",
      results: users.length,
      data: {
        users,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user status (admin only)
 * PATCH /api/v1/auth/users/:id/status
 */
export const updateUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      res.status(400).json({
        status: "fail",
        message: "isActive field is required",
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true },
    );

    if (!user) {
      res.status(404).json({
        status: "fail",
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
