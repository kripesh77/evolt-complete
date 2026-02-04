import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { JWTPayload, UserRole, VehicleProfile } from "../types/vehicle.js";

// Document interface with methods
export interface IUserDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  // Operator-specific fields
  company?: string;
  phone?: string;
  // User-specific fields
  vehicleProfiles?: VehicleProfile[];
  favoriteStations?: mongoose.Types.ObjectId[];
  // Common fields
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  isOperator(): boolean;
  isAdmin(): boolean;
  isRegularUser(): boolean;
}

// Model interface
export interface IUserModel extends mongoose.Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument | null>;
  findOperators(): Promise<IUserDocument[]>;
  findAdmins(): Promise<IUserDocument[]>;
}

// Vehicle Profile sub-schema
const vehicleProfileSchema = new Schema(
  {
    vehicleType: {
      type: String,
      enum: ["bike", "car"],
      required: true,
    },
    batteryCapacity_kWh: {
      type: Number,
      required: true,
      min: 0.5,
      max: 200,
    },
    efficiency_kWh_per_km: {
      type: Number,
      required: true,
      min: 0.01,
      max: 1,
    },
    batteryPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    compatibleConnectors: {
      type: [String],
      enum: ["AC_SLOW", "Type2", "CCS", "CHAdeMO"],
      required: true,
    },
  },
  // _id enabled for reliable deletion by ID
);

const userSchema = new Schema<IUserDocument, IUserModel>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ["user", "operator", "admin"],
        message: "Role must be user, operator, or admin",
      },
      default: "user",
    },
    // Operator-specific fields
    company: {
      type: String,
      trim: true,
      maxlength: [200, "Company name cannot exceed 200 characters"],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[+]?[\d\s-()]{10,20}$/, "Please provide a valid phone number"],
    },
    // User-specific fields
    vehicleProfiles: {
      type: [vehicleProfileSchema],
      default: [],
      validate: {
        validator: function (profiles: VehicleProfile[]) {
          return profiles.length <= 5; // Max 5 vehicle profiles per user
        },
        message: "Maximum 5 vehicle profiles allowed",
      },
    },
    favoriteStations: {
      type: [{ type: Schema.Types.ObjectId, ref: "Station" }],
      default: [],
      validate: {
        validator: function (stations: mongoose.Types.ObjectId[]) {
          return stations.length <= 20; // Max 20 favorite stations
        },
        message: "Maximum 20 favorite stations allowed",
      },
    },
    // Common fields
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret: Record<string, unknown>) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ role: 1, isActive: 1 });

// Pre-save hook to hash password
userSchema.pre("save", async function () {
  const doc = this as unknown as mongoose.Document & IUserDocument;
  if (!doc.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  const user = await User.findById(this._id).select("+password");
  if (!user) {
    return false;
  }
  return bcrypt.compare(candidatePassword, user.password);
};

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function (): string {
  const payload: JWTPayload = {
    id: this._id.toString(),
    email: this.email,
    role: this.role,
  };

  const secret =
    process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  return jwt.sign(payload, secret, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
};

// Role check helper methods
userSchema.methods.isOperator = function (): boolean {
  return this.role === "operator";
};

userSchema.methods.isAdmin = function (): boolean {
  return this.role === "admin";
};

userSchema.methods.isRegularUser = function (): boolean {
  return this.role === "user";
};

// Static method to find by email
userSchema.statics.findByEmail = async function (
  email: string,
): Promise<IUserDocument | null> {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find all operators
userSchema.statics.findOperators = async function (): Promise<IUserDocument[]> {
  return this.find({ role: "operator", isActive: true });
};

// Static method to find all admins
userSchema.statics.findAdmins = async function (): Promise<IUserDocument[]> {
  return this.find({ role: "admin", isActive: true });
};

const User = mongoose.model<IUserDocument, IUserModel>("User", userSchema);

export default User;
