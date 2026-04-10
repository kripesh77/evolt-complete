// Vehicle Types
export type VehicleType = "bike" | "car";

// Connector Types
export type ConnectorType = "AC_SLOW" | "Type2" | "CCS" | "CHAdeMO";

// Station Status
export type StationStatusType = "active" | "inactive";

// User Roles
export type UserRole = "user" | "operator" | "admin";

// Port Information
export interface Port {
  connectorType: ConnectorType;
  vehicleType: VehicleType;
  powerKW: number;
  total: number;
  occupied: number;
  pricePerKWh: number;
}

// Operating Hours
export interface OperatingHours {
  type: "24/7" | "custom";
  openTime?: string; // HH:mm format
  closeTime?: string; // HH:mm format
  weekdayHours?: OperatingHours;
  weekendHours?: OperatingHours;
}

// Station
export interface Station {
  _id: string;
  name: string;
  operatorId?: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  address: string;
  ports: Port[];
  operatingHours: OperatingHours;
  images?: string[]; // Cloudinary URLs
  status: StationStatusType;
  lastStatusUpdate?: string;
  createdAt?: string;
  updatedAt?: string;
}

// User
export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  phone?: string;
  isActive: boolean;
}

// Auth Response (backend returns token inside data)
export interface AuthResponse {
  status: string;
  data: {
    token: string;
    user: User;
  };
}

// API Response wrapper
export interface ApiResponse<T> {
  status: string;
  data: T;
  results?: number;
}

// Station Creation DTO
export interface CreateStationDTO {
  name: string;
  address: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  ports: Omit<Port, "occupied">[];
  operatingHours: OperatingHours;
  images?: string[];
  status?: StationStatusType;
}

// Station Update DTO
export interface UpdateStationDTO {
  name?: string;
  address?: string;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
  ports?: Port[];
  operatingHours?: OperatingHours;
  images?: string[];
  status?: StationStatusType;
}

// Occupancy Update DTO
export interface OccupancyUpdateDTO {
  connectorType: ConnectorType;
  occupied: number;
}

// Dashboard Stats
export interface DashboardStats {
  totalStations: number;
  activeStations: number;
  totalPorts: number;
  occupiedPorts: number;
  totalRevenue?: number;
}

// GeoLocation for map
export interface GeoLocation {
  latitude: number;
  longitude: number;
}

// Connector type options for forms
export const CONNECTOR_OPTIONS: {
  value: ConnectorType;
  label: string;
  vehicleType: VehicleType;
}[] = [
  { value: "AC_SLOW", label: "AC Slow (Bike)", vehicleType: "bike" },
  { value: "Type2", label: "Type 2 (Car)", vehicleType: "car" },
  { value: "CCS", label: "CCS (Car)", vehicleType: "car" },
  { value: "CHAdeMO", label: "CHAdeMO (Car)", vehicleType: "car" },
];
