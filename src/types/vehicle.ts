// Vehicle Types
export type VehicleType = "bike" | "car";

// Connector Types
export type ConnectorType = "AC_SLOW" | "Type2" | "CCS" | "CHAdeMO";

// Station Status
export type StationStatusType = "active" | "inactive";

// User Roles
export type UserRole = "user" | "operator" | "admin";

// Vehicle Profile for recommendation request
export interface VehicleProfile {
  _id?: string; // MongoDB ObjectId when stored in user document
  vehicleType: VehicleType;
  batteryCapacity_kWh: number;
  efficiency_kWh_per_km: number;
  batteryPercent: number;
  compatibleConnectors: ConnectorType[];
}

// User location
export interface GeoLocation {
  longitude: number;
  latitude: number;
}

// Recommendation Request
export interface RecommendationRequest {
  vehicleProfile: VehicleProfile;
  currentLocation: GeoLocation;
}

// Port Information
export interface Port {
  connectorType: ConnectorType;
  vehicleType: VehicleType;
  powerKW: number;
  total: number;
  pricePerKWh: number;
}

// Port Status
export interface PortStatus {
  connectorType: ConnectorType;
  occupied: number;
}

// Station interface (for type safety)
export interface IStation {
  _id?: string;
  name: string;
  operatorId?: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  address: string;
  ports: Port[];
  operatingHours: string;
  status: StationStatusType;
  createdAt?: Date;
  updatedAt?: Date;
}

// Station Status interface
export interface IStationStatus {
  _id?: string;
  stationId: string;
  portStatus: PortStatus[];
  lastUpdated: Date;
}

// Recommended Station Response
export interface RecommendedStation {
  stationId: string;
  stationName: string;
  address: string;
  recommendedPort: ConnectorType;
  powerKW: number;
  pricePerKWh: number;
  freeSlots: number;
  totalSlots: number;
  estimatedWaitMinutes: number;
  distanceKm: number;
  estimatedCost: number;
  estimatedChargeTimeMinutes: number;
  score: number;
  location: {
    longitude: number;
    latitude: number;
  };
}

// Scoring weights
export interface ScoringWeights {
  distance: number;
  availability: number;
  waitTime: number;
  power: number;
  cost: number;
}

// Default scoring weights
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  distance: 0.25,
  availability: 0.2,
  waitTime: 0.2,
  power: 0.2,
  cost: 0.15,
};

// Constants for vehicle types
export const BIKE_CONNECTORS: ConnectorType[] = ["AC_SLOW"];
export const CAR_CONNECTORS: ConnectorType[] = ["Type2", "CCS", "CHAdeMO"];

// Average charge time assumptions (minutes per kWh based on power)
export const SAFETY_BUFFER = 0.8; // 80% of theoretical range for safety

// User interface (generalized, with roles)
export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  // Operator-specific fields
  company?: string;
  phone?: string;
  // User-specific fields
  vehicleProfiles?: VehicleProfile[];
  favoriteStations?: string[];
  // Common fields
  isActive: boolean;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// JWT Payload (includes role)
export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Auth Response
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    company?: string;
  };
}

// Role Permissions
export interface RolePermissions {
  canManageStations: boolean;
  canUpdateOccupancy: boolean;
  canViewAllUsers: boolean;
  canManageUsers: boolean;
  canSaveFavorites: boolean;
  canSaveVehicleProfiles: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  user: {
    canManageStations: false,
    canUpdateOccupancy: false,
    canViewAllUsers: false,
    canManageUsers: false,
    canSaveFavorites: true,
    canSaveVehicleProfiles: true,
  },
  operator: {
    canManageStations: true,
    canUpdateOccupancy: true,
    canViewAllUsers: false,
    canManageUsers: false,
    canSaveFavorites: false,
    canSaveVehicleProfiles: false,
  },
  admin: {
    canManageStations: true,
    canUpdateOccupancy: true,
    canViewAllUsers: true,
    canManageUsers: true,
    canSaveFavorites: true,
    canSaveVehicleProfiles: true,
  },
};

// Express Request with user (replaces operator)
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}
