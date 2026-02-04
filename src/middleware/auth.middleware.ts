import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import type { JWTPayload, UserRole } from "../types/vehicle.js";

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        status: "fail",
        message: "Access denied. No token provided.",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({
        status: "fail",
        message: "Access denied. Invalid token format.",
      });
      return;
    }

    // Verify token
    const secret =
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-in-production";
    const decoded = jwt.verify(token, secret) as JWTPayload;

    // Check if user still exists
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        status: "fail",
        message: "User no longer exists.",
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        status: "fail",
        message: "User account is deactivated.",
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        status: "fail",
        message: "Invalid token.",
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        status: "fail",
        message: "Token expired.",
      });
      return;
    }

    next(error);
  }
};

/**
 * Role-based authorization middleware
 * Restricts access to specific roles
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: "fail",
        message: "Authentication required.",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        status: "fail",
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
};

/**
 * Operator-only middleware (operators and admins)
 */
export const operatorOnly = authorize("operator", "admin");

/**
 * Admin-only middleware
 */
export const adminOnly = authorize("admin");

/**
 * Regular user only middleware (users and admins)
 */
export const userOnly = authorize("user", "admin");

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next();
    }

    const secret =
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-in-production";
    const decoded = jwt.verify(token, secret) as JWTPayload;

    const user = await User.findById(decoded.id);

    if (user && user.isActive) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
    }

    next();
  } catch {
    // Silently fail for optional auth
    next();
  }
};
