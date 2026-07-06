export type VehicleType = "bike" | "car";
export type ConnectorType = "AC_SLOW" | "Type2" | "CCS" | "CHAdeMO";
export type StationStatusType = "active" | "inactive";
export type UserRole = "user" | "operator" | "admin";
export type VehicleRequestStatus = "pending" | "approved" | "rejected";

export interface Port {
  connectorType: ConnectorType;
  vehicleType: VehicleType;
  powerKW: number;
  total: number;
  occupied: number;
  pricePerKWh: number;
}

export interface OperatingHours {
  type: "24/7" | "custom";
  openTime?: string;
  closeTime?: string;
}

export interface Station {
  _id: string;
  name: string;
  operatorId?: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  address: string;
  ports: Port[];
  operatingHours: OperatingHours;
  images?: string[];
  status: StationStatusType;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  phone?: string;
  isActive: boolean;
  createdAt?: string;
  lastLogin?: string;
}

export interface Vehicle {
  _id: string;
  make: string;
  modelName: string;
  variant?: string;
  vehicleType: VehicleType;
  image: string;
  batteryCapacity_kWh: number;
  efficiency_kWh_per_km?: number;
  compatibleConnectors: ConnectorType[];
  isActive: boolean;
  createdAt?: string;
}

export interface VehicleRequest {
  _id: string;
  requestedBy: { _id: string; name: string; email: string } | string;
  make: string;
  modelName: string;
  variant?: string;
  vehicleType: VehicleType;
  image: string;
  batteryCapacity_kWh?: number;
  compatibleConnectors?: ConnectorType[];
  notes?: string;
  status: VehicleRequestStatus;
  reviewNotes?: string;
  createdAt?: string;
}

export interface AuthResponse {
  status: string;
  data: {
    token: string;
    user: User;
  };
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  results?: number;
  message?: string;
}

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

export interface CreateVehicleDTO {
  make: string;
  modelName: string;
  variant?: string;
  vehicleType: VehicleType;
  image: string;
  batteryCapacity_kWh: number;
  compatibleConnectors: ConnectorType[];
}

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

export interface OccupancyUpdateDTO {
  connectorType: ConnectorType;
  occupied: number;
}

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

export function getUserId(user: User): string {
  return user._id || user.id || "";
}
