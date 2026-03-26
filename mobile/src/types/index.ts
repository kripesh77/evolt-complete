// Vehicle Types
export type VehicleType = "bike" | "car";

// Connector Types
export type ConnectorType = "AC_SLOW" | "Type2" | "CCS" | "CHAdeMO";

// Station Status
export type StationStatusType = "active" | "inactive";

// User Roles
export type UserRole = "user" | "operator" | "admin";

// Vehicle Profile
export interface VehicleProfile {
  _id?: string;
  name?: string;
  vehicleType: VehicleType;
  batteryCapacity_kWh: number;
  efficiency_kWh_per_km: number;
  batteryPercent: number;
  compatibleConnectors: ConnectorType[];
}

// Location
export interface GeoLocation {
  longitude: number;
  latitude: number;
}

// Port Information
export interface Port {
  connectorType: ConnectorType;
  vehicleType: VehicleType;
  powerKW: number;
  total: number;
  occupied: number;
  pricePerKWh: number;
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
  operatingHours: string;
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
  vehicleProfiles: VehicleProfile[];
  favoriteStations?: string[];
}

// Auth Response
export interface AuthResponse {
  status: string;
  token: string;
  data: {
    user: User;
  };
}

// Recommended Station
export interface RecommendedStation {
  stationId: string;
  stationName: string;
  address: string;
  recommendedPort: ConnectorType;
  powerKW: number;
  pricePerKWh: number;
  freeSlots: number;
  totalSlots: number;
  distance_km: number;
  estimatedChargingTime_min: number;
  estimatedCost: number;
  canReachWithCurrentCharge: boolean;
  score: number;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
}

// API Response
export interface ApiResponse<T> {
  status: string;
  results?: number;
  data: T;
}

// Recommendation Request
export interface RecommendationRequest {
  vehicleProfile: VehicleProfile;
  currentLocation: GeoLocation;
}

// Navigation Types
export type RootStackParamList = {
  Main: undefined;
  Login: { returnTo?: string } | undefined;
  Register: { returnTo?: string } | undefined;
  Home: undefined;
  Map: undefined;
  Recommend: undefined;
  StationDetails: { stationId: string };
  Profile: undefined;
  VehicleProfiles: undefined;
  AddVehicle: { returnTo?: string } | undefined;
  EditVehicle: { vehicleId: string };
  GuestVehicleInput: undefined;
  LocationPicker: {
    initialLocation?: GeoLocation;
    onLocationSelect: (location: GeoLocation) => void;
  };
};

export type MainTabParamList = {
  HomeTab: undefined;
  MapTab: undefined;
  RecommendTab: undefined;
  ProfileTab: undefined;
};
